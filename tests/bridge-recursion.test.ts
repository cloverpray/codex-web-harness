import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultBrokerEndpoint } from "../src/config";
import { callTurnBroker, TurnBroker, type BrokerToolResult } from "../src/adapters/chatgpt-web/turn-broker";

const recursiveName = "mcp__codex_apps__codex_native2___codex_apply_patch";
const environment = (cwd: string) => ({
  cwd,
  roots: [cwd],
  writableRoots: [cwd],
  sandboxPolicy: { type: "dangerFullAccess" as const },
  tools: [
    { name: "exec_command", description: "Run a local command", parameters: { type: "object" } },
    { name: recursiveName, description: "Invoke the outer Codex apply_patch tool", parameters: { type: "object" } },
    { name: "codex_tool_call", namespace: "vendor", description: "Unrelated vendor tool", parameters: { type: "object" } },
  ],
});

test("broker rejects recursive bridge dispatch without retiring the live turn", async () => {
  const root = mkdtempSync(join(tmpdir(), "cgw-recursion-"));
  const socketPath = defaultBrokerEndpoint(root);
  const broker = TurnBroker.forSocket(socketPath);
  const token = await broker.register(environment(root), 30_000, "recursion-test");
  const waiterAbort = new AbortController();
  let pending: Promise<BrokerToolResult> | undefined;
  try {
    const claim = await callTurnBroker<{ bindingId: string }>(socketPath, { method: "claim", token });
    pending = callTurnBroker<BrokerToolResult>(socketPath, {
      method: "invoke", bindingId: claim.bindingId, wireName: recursiveName, arguments: {},
    });
    const outcome = await Promise.race([
      pending.then(value => ({ kind: "result", value })),
      broker.nextToolBatch(token, waiterAbort.signal).then(requests => ({ kind: "dispatched", requests })),
    ]);
    expect(outcome.kind).toBe("result");
    if (outcome.kind !== "result" || !("value" in outcome)) throw new Error("Recursive call reached the outer harness");
    expect(outcome.value).toMatchObject({ isError: true, structuredContent: { code: "codex_bridge_recursion" } });
    waiterAbort.abort();
    await expect(callTurnBroker(socketPath, { method: "claim", token }))
      .resolves.toMatchObject({ bindingId: expect.any(String) });
  } finally {
    waiterAbort.abort();
    broker.revoke(token);
    await pending?.catch(() => {});
    await broker.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("native MCP inventory hides its own bridge and rejects stale-name dispatch without retiring the turn", async () => {
  const root = mkdtempSync(join(tmpdir(), "cgw-mcp-recursion-"));
  const socketPath = defaultBrokerEndpoint(root);
  const broker = TurnBroker.forSocket(socketPath);
  const token = await broker.register(environment(root), 30_000, "mcp-recursion-test");
  const client = new Client({ name: "bridge-recursion-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["src/cli.ts", "mcp", "--broker-socket", socketPath],
    cwd: process.cwd(), stderr: "pipe",
  });
  try {
    await client.connect(transport);
    const inventory = await client.callTool({ name: "codex_tool_inventory", arguments: { turn_token: token } });
    const catalog = inventory.structuredContent as { tools: Array<{ wire_name: string }> };
    expect(catalog.tools.map(tool => tool.wire_name)).toEqual(["exec_command", "vendor__codex_tool_call"]);
    const rejected = await client.callTool({ name: "codex_tool_call", arguments: { turn_token: token, wire_name: recursiveName } });
    expect(rejected.isError).toBe(true);
    const continued = client.callTool({ name: "codex_exec", arguments: { turn_token: token, cmd: "printf continued" } });
    const [request] = await broker.nextToolBatch(token);
    expect(request).toMatchObject({ wireName: "exec_command", arguments: { cmd: "printf continued" } });
    broker.completeTool(token, request!.callId, { content: [{ type: "text", text: "continued" }] });
    expect((await continued).isError).not.toBe(true);
    await expect(callTurnBroker(socketPath, { method: "claim", token }))
      .resolves.toMatchObject({ bindingId: expect.any(String) });
  } finally {
    await client.close().catch(() => {});
    broker.revoke(token);
    await broker.close();
    rmSync(root, { recursive: true, force: true });
  }
}, 15_000);
