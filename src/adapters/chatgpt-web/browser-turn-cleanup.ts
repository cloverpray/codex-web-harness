import type { Page } from "playwright-core";
import { CHATGPT_STOP_BUTTON_SELECTOR } from "../../chatgpt-session";

export interface ChatGptTurnCleanup {
  status: "stop_observed" | "not_observed_running" | "page_closed" | "unconfirmed";
  attempts: number;
}

export async function stopSubmittedChatGptTurn(page: Page, timeoutMs = 5_000): Promise<ChatGptTurnCleanup> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Cleanup timeout must be positive");
  const deadline = Date.now() + timeoutMs;
  let expired = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const remaining = () => Math.max(1, deadline - Date.now());
  const cleanup = async (): Promise<ChatGptTurnCleanup> => {
    if (page.isClosed()) return { status: "page_closed", attempts };
    const stop = page.locator(CHATGPT_STOP_BUTTON_SELECTOR).last();
    const visible = await stop.isVisible();
    if (expired) return { status: "unconfirmed", attempts };
    if (!visible) return { status: "not_observed_running", attempts };
    for (const action of ["click", "press"] as const) {
      if (expired || Date.now() >= deadline) break;
      if (page.isClosed()) return { status: "page_closed", attempts };
      attempts += 1;
      try {
        const timeout = Math.min(1_000, remaining());
        if (action === "click") await stop.click({ timeout });
        else await stop.press("Enter", { timeout });
      } catch {
        if (page.isClosed()) return { status: "page_closed", attempts };
      }
      if (expired || Date.now() >= deadline) break;
      try {
        await stop.waitFor({ state: "hidden", timeout: Math.min(1_000, remaining()) });
        return { status: "stop_observed", attempts };
      } catch {
        if (page.isClosed()) return { status: "page_closed", attempts };
      }
    }
    return { status: "unconfirmed", attempts };
  };
  try {
    return await Promise.race([
      cleanup().catch((): ChatGptTurnCleanup => ({ status: "unconfirmed", attempts })),
      new Promise<ChatGptTurnCleanup>(resolve => {
        timer = setTimeout(() => {
          expired = true;
          resolve({ status: "unconfirmed", attempts });
        }, timeoutMs);
      }),
    ]);
  } finally {
    expired = true;
    if (timer) clearTimeout(timer);
  }
}
