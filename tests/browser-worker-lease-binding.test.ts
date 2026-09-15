import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChatGptBrowserWorker, type BrowserTurn } from "../src/adapters/chatgpt-web/browser-worker";
import { ChatGptCompactionHandoffAccepted } from "../src/adapters/chatgpt-web/adapter-error";
import { LAUNCHER_BROWSER_HOST_KIND, LAUNCHER_BROWSER_IDLE_URL } from "../src/launcher-browser-host";

const surfaceId = "s".repeat(32);
const token = "launcher-control-token-0123456789abcdefghijklmnop";
type Activity = Record<string, unknown>;
type BrowserExecution = (
  turn: BrowserTurn,
  surface: string | undefined,
  maintenancePage: unknown,
  reused: boolean,
  trustedBinding: boolean,
  onBound: () => void,
) => Promise<string>;

const runExclusive = (ChatGptBrowserWorker.prototype as unknown as {
  runExclusive: (turn: BrowserTurn) => Promise<string>;
}).runExclusive;

function turn(overrides: Partial<BrowserTurn> = {}): BrowserTurn {
  const prepare = async () => ({ text: "test", images: [], release: () => {} });
  return {
    traceId: "leasebinding123",
    modelId: "chatgpt-web/high",
    capabilities: { localToolsEnabled: true, solAvailable: true, proAvailable: true },
    conversationKey: "a".repeat(64),
    retainConversation: true,
    prepare,
    prepareResume: prepare,
    onTextDelta: () => {},
    ...overrides,
  };
}

// Exercise the real runExclusive -> descriptor reader -> authenticated HTTP lifecycle.
// Only the browser execution is replaced: these tests do not open a browser or submit a task.
async function withHost(
  lease: { reused: boolean; connectorBound: boolean },
  execute: BrowserExecution,
  check: (run: (input: BrowserTurn) => Promise<string>, events: Activity[]) => Promise<void>,
): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "codex-lease-binding-"));
  const events: Activity[] = [];
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      if (request.headers.get("authorization") !== `Bearer ${token}`) {
        return new Response("unauthorized", { status: 401 });
      }
      const activity = await request.json() as Activity;
      events.push(activity);
      const path = new URL(request.url).pathname;
      if (path === "/v1/turn/start") return Response.json({ surfaceId, ...lease });
      if (path === "/v1/turn/end") return Response.json({ cancelledByUser: false });
      if (path === "/v1/turn/heartbeat") return Response.json({});
      return new Response("unknown route", { status: 404 });
    },
  });
  try {
    const descriptorPath = join(root, "launcher-browser.json");
    writeFileSync(descriptorPath, JSON.stringify({
      version: 3,
      kind: LAUNCHER_BROWSER_HOST_KIND,
      profile: "production",
      pid: process.pid,
      endpoint: "http://127.0.0.1:39110",
      control: { endpoint: `http://127.0.0.1:${server.port}`, token },
      helper: { executable: process.execPath, script: import.meta.path },
      partition: "persist:codex-web-gpt-chatgpt",
      idleUrl: LAUNCHER_BROWSER_IDLE_URL,
      surfaceId,
      surfaceTargets: { [surfaceId]: "test-native-target" },
      createdAt: new Date().toISOString(),
    }), { mode: 0o600 });
    const worker = {
      config: { browserHost: "launcher", browserHostDescriptorPath: descriptorPath, appName: "Codex Native2" },
      runBrowserTurn: execute,
    };
    await check(input => runExclusive.call(worker, input), events);
  } finally {
    await server.stop(true);
    rmSync(root, { recursive: true, force: true });
  }
}

for (const lease of [
  { reused: true, connectorBound: true },
  { reused: true, connectorBound: false },
  { reused: false, connectorBound: true },
  { reused: false, connectorBound: false },
]) {
  test(`lease trust requires reused AND bound (${JSON.stringify(lease)})`, async () => {
    const input = turn();
    let selectedReuse: boolean | undefined;
    input.onPreparedSelected = reused => { selectedReuse = reused; };
    await withHost(lease, async (received, surface, maintenance, reused, trusted) => {
      expect(received).toBe(input);
      expect(surface).toBe(surfaceId);
      expect(maintenance).toBeUndefined();
      expect(reused).toBe(lease.reused);
      expect(trusted).toBe(lease.reused && lease.connectorBound);
      return "ok"; // No attachment receipt: configuration and prior lease alone cannot publish bound.
    }, async (run, events) => {
      expect(await run(input)).toBe("ok");
      expect(selectedReuse).toBe(lease.reused);
      expect(events[0]).toMatchObject({
        phase: "start", helperPid: process.pid, conversationKey: input.conversationKey,
        connectorIdentity: "Codex Native2",
      });
      expect(events.at(-1)).toMatchObject({ phase: "end", status: "completed", retain: true });
      expect(events.at(-1)).not.toHaveProperty("connectorBound");
    });
  });
}

test("completed browser execution publishes only its successful attachment receipt", async () => {
  await withHost({ reused: false, connectorBound: false }, async (_turn, _surface, _maintenance, _reused, _trusted, onBound) => {
    onBound();
    return "submitted and completed";
  }, async (run, events) => {
    expect(await run(turn())).toBe("submitted and completed");
    expect(events.at(-1)).toMatchObject({ phase: "end", status: "completed", retain: true, connectorBound: true });
  });
});

for (const afterAttach of [false, true]) {
  test(`${afterAttach ? "send failure after attachment" : "attachment failure"} does not publish or retain binding`, async () => {
    const failure = new Error(afterAttach ? "send failed" : "attach failed");
    await withHost({ reused: true, connectorBound: true }, async (_turn, _surface, _maintenance, _reused, _trusted, onBound) => {
      if (afterAttach) onBound();
      throw failure;
    }, async (run, events) => {
      await expect(run(turn())).rejects.toBe(failure);
      expect(events.at(-1)).toMatchObject({ phase: "end", status: "failed", message: failure.message });
      expect(events.at(-1)).not.toHaveProperty("connectorBound");
      expect(events.at(-1)).not.toHaveProperty("retain");
    });
  });
}

test("ordinary cancellation after attachment never publishes a completed binding", async () => {
  const cancelled = new DOMException("cancelled", "AbortError");
  await withHost({ reused: true, connectorBound: true }, async (_turn, _surface, _maintenance, _reused, _trusted, onBound) => {
    onBound();
    throw cancelled;
  }, async (run, events) => {
    await expect(run(turn())).rejects.toBe(cancelled);
    expect(events.at(-1)).toMatchObject({ phase: "end", status: "aborted" });
    expect(events.at(-1)).not.toHaveProperty("connectorBound");
    expect(events.at(-1)).not.toHaveProperty("retain");
  });
});

for (const attached of [false, true]) {
  test(`accepted native compaction releases completed with attachment proof=${attached}`, async () => {
    const accepted = new ChatGptCompactionHandoffAccepted();
    const input = turn({
      capabilities: { localToolsEnabled: false, solAvailable: true, proAvailable: true },
      nativeConnector: true,
      requireRetainedConversation: true,
      retainConversation: false,
    });
    await withHost({ reused: true, connectorBound: true }, async (_turn, _surface, _maintenance, _reused, trusted, onBound) => {
      expect(trusted).toBe(true);
      if (attached) onBound();
      throw accepted;
    }, async (run, events) => {
      await expect(run(input)).rejects.toBe(accepted);
      expect(events[0]).toMatchObject({ connectorIdentity: "Codex Native2", requireRetainedConversation: true });
      expect(events.at(-1)).toMatchObject({ phase: "end", status: "completed" });
      expect(events.at(-1)).not.toHaveProperty("retain");
      if (attached) expect(events.at(-1)).toHaveProperty("connectorBound", true);
      else expect(events.at(-1)).not.toHaveProperty("connectorBound");
    });
  });
}
