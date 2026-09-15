import { expect, test } from "bun:test";
import { ChatGptBrowserWorker } from "../src/adapters/chatgpt-web/browser-worker";

const selectFromMenu = (ChatGptBrowserWorker.prototype as unknown as {
  selectConnectorFromComposerMenu(
    page: unknown,
    capture?: (checkpoint: string) => Promise<void>,
    signal?: AbortSignal,
  ): Promise<unknown>;
}).selectConnectorFromComposerMenu;

type ActionOptions = { signal?: AbortSignal; timeout?: number; state?: string };
type FixtureOptions = {
  plusCount?: number;
  rowError?: Error;
  selected?: boolean;
  cleanupError?: Error;
  onCheckpoint?: (checkpoint: string) => void;
  opensOnClick?: boolean[];
};

function fixture(options: FixtureOptions = {}) {
  const calls: string[] = [];
  const checkpoints: string[] = [];
  const checkpointStates: Array<{ checkpoint: string; menuOpen: boolean }> = [];
  const signals: Array<AbortSignal | undefined> = [];
  const composer = { identity: "newly-resolved-composer" };
  const exactNameLocator = { identity: "exact-configured-app-name" };
  let menuOpen = false;
  let pillSelected = false;
  let clickCount = 0;
  const checkAction = (action: ActionOptions) => {
    signals.push(action.signal);
    if (action.signal?.aborted) throw new DOMException("action cancelled", "AbortError");
  };
  const plus = {
    filter(filter: unknown) { expect(filter).toEqual({ visible: true }); return this; },
    async count() { calls.push("plus-count"); return options.plusCount ?? 1; },
    async getAttribute(name: string) {
      expect(name).toBe("aria-expanded");
      return String(menuOpen);
    },
    async click(action: ActionOptions) {
      checkAction(action);
      calls.push("open-plus");
      menuOpen = options.opensOnClick?.[clickCount++] ?? true;
    },
  };
  const expandedPlus = {
    async waitFor(action: ActionOptions) {
      checkAction(action);
      calls.push(`confirm-open-${action.timeout}`);
      expect(action.state).toBe("visible");
      if (!menuOpen) {
        const error = new Error("plus did not expand");
        error.name = "TimeoutError";
        throw error;
      }
    },
  };
  const allAppRows = {
    filter(filter: unknown) { expect(filter).toEqual({ visible: true }); return this; },
    async count() { return 0; },
  };
  const rows = {
    async count() { return options.rowError ? 0 : 1; },
    filter(filter: { visible?: boolean; has?: unknown }) {
      if (filter.has !== undefined) expect(filter.has).toBe(exactNameLocator);
      else expect(filter).toEqual({ visible: true });
      return this;
    },
    async waitFor(action: ActionOptions) {
      checkAction(action);
      calls.push("wait-exact-app-row");
      expect(action.state).toBe("visible");
      expect(action.timeout).toBe(5_000);
      expect(menuOpen).toBe(true);
      if (options.rowError) throw options.rowError;
    },
    async click(action: ActionOptions) {
      checkAction(action);
      calls.push("select-exact-app");
      pillSelected = true;
      menuOpen = false;
    },
  };
  const page = {
    getByTestId(id: string) { expect(id).toBe("composer-plus-btn"); return plus; },
    locator(selector: string) {
      if (selector === '[data-testid="composer-plus-btn"][aria-expanded="true"]') return expandedPlus;
      if (selector === "[data-composer-plugin-impression-id]") return allAppRows;
      expect(selector).toBe('[data-composer-plugin-impression-id] .__menu-item[tabindex="0"]');
      return rows;
    },
    getByText(name: string, match: unknown) {
      expect(name).toBe("Codex Native2");
      expect(match).toEqual({ exact: true });
      return exactNameLocator;
    },
    keyboard: {
      async press(key: string, action: ActionOptions = {}) {
        checkAction(action);
        expect(key).toBe("Escape");
        calls.push("escape");
        menuOpen = false;
      },
    },
  };
  const worker = {
    config: { appName: "Codex Native2" },
    async activeComposer(receivedPage: unknown, _timeout: number, signal?: AbortSignal) {
      expect(receivedPage).toBe(page);
      checkAction({ signal });
      calls.push("resolve-new-composer");
      return composer;
    },
    async connectorIsSelected(receivedComposer: unknown, signal?: AbortSignal) {
      expect(receivedComposer).toBe(composer);
      checkAction({ signal });
      calls.push("verify-current-pill");
      return options.selected ?? pillSelected;
    },
    async clearChatGptComposerState(receivedPage: unknown) {
      expect(receivedPage).toBe(page);
      calls.push("cleanup");
      if (options.cleanupError) throw options.cleanupError;
      menuOpen = false;
      pillSelected = false;
    },
  };
  return {
    calls, checkpoints, checkpointStates, signals, composer,
    state: () => ({ menuOpen, pillSelected }),
    run: (signal?: AbortSignal) => selectFromMenu.call(worker, page, async checkpoint => {
      checkpoints.push(checkpoint);
      checkpointStates.push({ checkpoint, menuOpen });
      options.onCheckpoint?.(checkpoint);
    }, signal),
  };
}

test("composer menu selects the exact scoped app and verifies its current-message pill", async () => {
  const f = fixture();
  const controller = new AbortController();
  expect(await f.run(controller.signal)).toBe(f.composer);
  expect(f.calls).toEqual([
    "plus-count", "open-plus", "confirm-open-1500", "wait-exact-app-row", "select-exact-app",
    "resolve-new-composer", "verify-current-pill",
  ]);
  expect(f.checkpoints).toEqual(["composer-connector-open-confirmed", "composer-connector-menu-visible", "composer-connector-selected"]);
  expect(f.signals.every(signal => signal === controller.signal)).toBe(true);
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: true });
});

for (const plusCount of [0, 2]) {
  test(`composer menu requires exactly one visible plus button (count=${plusCount})`, async () => {
    const f = fixture({ plusCount });
    expect(await f.run()).toBeUndefined();
    expect(f.calls).toEqual(["plus-count"]);
    expect(f.checkpoints).toEqual([]);
    expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
  });
}

test("missing app row closes its menu before permitting mention fallback", async () => {
  const timeout = new Error("no matching app");
  timeout.name = "TimeoutError";
  const f = fixture({ rowError: timeout });
  expect(await f.run()).toBeUndefined();
  expect(f.calls).toEqual(["plus-count", "open-plus", "confirm-open-1500", "wait-exact-app-row", "escape"]);
  expect(f.checkpoints).toEqual(["composer-connector-open-confirmed", "composer-connector-menu-unavailable"]);
  expect(f.checkpointStates.at(-1)).toEqual({ checkpoint: "composer-connector-menu-unavailable", menuOpen: true });
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
});

test("duplicate exact rows fail strictly and clean the menu instead of falling back", async () => {
  const duplicate = new Error("strict mode violation: locator resolved to 2 elements");
  const f = fixture({ rowError: duplicate });
  await expect(f.run()).rejects.toBe(duplicate);
  expect(f.calls).toEqual(["plus-count", "open-plus", "confirm-open-1500", "wait-exact-app-row", "cleanup"]);
  expect(f.checkpoints).toEqual(["composer-connector-open-confirmed"]);
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
});

test("an app click without a verified current pill rolls back the selected state", async () => {
  const f = fixture({ selected: false });
  await expect(f.run()).rejects.toThrow('did not select "Codex Native2" connector');
  expect(f.calls.slice(-3)).toEqual(["resolve-new-composer", "verify-current-pill", "cleanup"]);
  expect(f.checkpoints).toEqual(["composer-connector-open-confirmed", "composer-connector-menu-visible"]);
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
});

test("abort after opening the menu runs cleanup without selecting an app", async () => {
  const controller = new AbortController();
  const f = fixture({
    onCheckpoint(checkpoint) {
      if (checkpoint === "composer-connector-menu-visible") controller.abort();
    },
  });
  await expect(f.run(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(f.calls).toEqual(["plus-count", "open-plus", "confirm-open-1500", "wait-exact-app-row", "cleanup"]);
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
});

test("an already aborted menu selection leaves the page untouched", async () => {
  const f = fixture();
  const controller = new AbortController();
  controller.abort();
  await expect(f.run(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(f.calls).toEqual([]);
});

test("failed cleanup remains a persistent-state error rather than a fallback", async () => {
  const f = fixture({ selected: false, cleanupError: new Error("editor cleanup failed") });
  await expect(f.run()).rejects.toThrow("ChatGPT composer connector menu could not be cleared");
  expect(f.calls.at(-1)).toBe("cleanup");
  expect(f.checkpoints).not.toContain("composer-connector-selected");
});

test("an unacknowledged first click retries once before looking for app rows", async () => {
  const f = fixture({ opensOnClick: [false, true] });
  expect(await f.run()).toBe(f.composer);
  expect(f.calls).toEqual([
    "plus-count", "open-plus", "confirm-open-1500", "open-plus", "confirm-open-2500",
    "wait-exact-app-row", "select-exact-app", "resolve-new-composer", "verify-current-pill",
  ]);
  expect(f.checkpoints).toEqual([
    "composer-connector-open-unconfirmed", "composer-connector-open-confirmed",
    "composer-connector-menu-visible", "composer-connector-selected",
  ]);
  expect(f.checkpointStates[0]).toEqual({ checkpoint: "composer-connector-open-unconfirmed", menuOpen: false });
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: true });
});

test("two unacknowledged clicks fail with cleanup and never report missing app rows", async () => {
  const f = fixture({ opensOnClick: [false, false] });
  await expect(f.run()).rejects.toMatchObject({ name: "TimeoutError", message: "plus did not expand" });
  expect(f.calls).toEqual([
    "plus-count", "open-plus", "confirm-open-1500", "open-plus", "confirm-open-2500", "cleanup",
  ]);
  expect(f.checkpoints).toEqual(["composer-connector-open-unconfirmed"]);
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
});

test("cancellation between unconfirmed opening and retry cleans up without a second click", async () => {
  const controller = new AbortController();
  const f = fixture({
    opensOnClick: [false, true],
    onCheckpoint(checkpoint) {
      if (checkpoint === "composer-connector-open-unconfirmed") controller.abort();
    },
  });
  await expect(f.run(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(f.calls).toEqual(["plus-count", "open-plus", "confirm-open-1500", "cleanup"]);
  expect(f.checkpoints).toEqual(["composer-connector-open-unconfirmed"]);
  expect(f.state()).toEqual({ menuOpen: false, pillSelected: false });
});
