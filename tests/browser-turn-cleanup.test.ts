import { expect, test } from "bun:test";
import type { Page } from "playwright-core";
import { stopSubmittedChatGptTurn } from "../src/adapters/chatgpt-web/browser-turn-cleanup";
import { isChatGptBridgeToolName } from "../src/adapters/chatgpt-web/bridge-tool-policy";

function fakePage(options: { visible?: boolean; closed?: boolean; clickFails?: boolean; refusesStop?: boolean; observationFails?: boolean; observationHangs?: boolean } = {}) {
  let visible = options.visible ?? true;
  const actions: string[] = [];
  const locator = {
    last: () => locator,
    isVisible: async () => {
      if (options.observationHangs) return await new Promise<boolean>(() => {});
      if (options.observationFails) throw new Error("DOM unavailable");
      return visible;
    },
    click: async () => {
      actions.push("click");
      if (options.clickFails) throw new Error("click failed");
      if (!options.refusesStop) visible = false;
    },
    press: async (key: string) => {
      actions.push(key);
      if (!options.refusesStop) visible = false;
    },
    waitFor: async () => {
      if (visible) throw new Error("still running");
    },
  };
  const page = { isClosed: () => options.closed ?? false, locator: () => locator } as unknown as Page;
  return { page, actions };
}

test("submitted-turn cleanup observes a stopped button before reporting success", async () => {
  const { page, actions } = fakePage();
  expect(await stopSubmittedChatGptTurn(page)).toEqual({ status: "stop_observed", attempts: 1 });
  expect(actions).toEqual(["click"]);
});

test("submitted-turn cleanup uses a bounded keyboard fallback", async () => {
  const { page, actions } = fakePage({ clickFails: true });
  expect(await stopSubmittedChatGptTurn(page)).toEqual({ status: "stop_observed", attempts: 2 });
  expect(actions).toEqual(["click", "Enter"]);
});

test("submitted-turn cleanup does not report success when the page keeps generating", async () => {
  const { page, actions } = fakePage({ refusesStop: true });
  expect(await stopSubmittedChatGptTurn(page)).toEqual({ status: "unconfirmed", attempts: 2 });
  expect(actions).toHaveLength(2);
});

test("submitted-turn cleanup preserves absent or closed pages without clicking", async () => {
  for (const options of [{ visible: false }, { closed: true }]) {
    const { page, actions } = fakePage(options);
    expect((await stopSubmittedChatGptTurn(page)).status).toBe(options.closed ? "page_closed" : "not_observed_running");
    expect(actions).toEqual([]);
  }
});

test("submitted-turn cleanup bounds an unresponsive observer without issuing delayed clicks", async () => {
  const { page, actions } = fakePage({ observationHangs: true });
  const started = Date.now();
  expect(await stopSubmittedChatGptTurn(page, 30)).toEqual({ status: "unconfirmed", attempts: 0 });
  expect(Date.now() - started).toBeLessThan(1_000);
  expect(actions).toEqual([]);
});

test("submitted-turn cleanup retains uncertainty when DOM inspection fails", async () => {
  const { page, actions } = fakePage({ observationFails: true });
  expect(await stopSubmittedChatGptTurn(page)).toEqual({ status: "unconfirmed", attempts: 0 });
  expect(actions).toEqual([]);
});

test("bridge identity handles qualified aliases without blocking unrelated native or vendor tools", () => {
  for (const name of ["codex_apply_patch", "Codex_Native2.codex_exec", "codex_apps.codex_native2.codex_apply_patch", "mcp__codex_apps__codex_native2___codex_tool_call", "mcp__codex_apps__codex_native_codex_write_stdin"]) {
    expect(isChatGptBridgeToolName(name)).toBe(true);
  }
  for (const name of ["apply_patch", "exec_command", "write_stdin", "vendor__exec", "vendor__codex_tool_call", "web__run", "codex_native2__unrelated_tool"]) {
    expect(isChatGptBridgeToolName(name)).toBe(false);
  }
});
