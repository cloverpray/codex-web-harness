import type { CodexMessage, CodexParsedRequest } from "../../types";

function text(message: CodexMessage): string {
  return typeof message.content === "string" ? message.content
    : message.content.map(part => "text" in part ? part.text : "").join("\n");
}
function continuation(message: CodexMessage): boolean {
  return message.role === "user"
    && text(message).startsWith('<codex_internal_context source="goal">')
    && text(message).trimEnd().endsWith("</codex_internal_context>");
}
function unavailable(value: string): boolean {
  return /(?:Codex[ _-]*Native|执行接口|本地工具|原生工具|local tools?|execution interface)/i.test(value)
    && /(?:不可用|没有可用|未提供可用|无法调用|无法访问|无法读取|无法执行|无法继续|(?:安全检查|安全审查)(?:拦截|拒绝)|couldn['’]t determine the safety status of the request|unavailable|no .*?(?:interface|tools?)|cannot (?:access|call|execute))/i.test(value);
}

/** Count only completed turns witnessed by this runtime, not stale replayed history. */
export class GoalToolStallGuard {
  private states = new Map<string, { count: number; turn: string }>();
  shouldStop(key: string | undefined, parsed: CodexParsedRequest): boolean {
    if (!key || parsed._compactionRequest || parsed._textCompactionRequest) return false;
    const user = parsed.context.messages.findLast(message => message.role === "user");
    if (!user || !continuation(user)) { this.states.delete(key); return false; }
    return (this.states.get(key)?.count ?? 0) >= 3;
  }
  observe(key: string | undefined, turn: string | undefined, parsed: CodexParsedRequest, answer: string, hadTools: boolean): void {
    if (!key || !turn || parsed._compactionRequest || parsed._textCompactionRequest) return;
    const user = parsed.context.messages.findLast(message => message.role === "user");
    if (!user || !continuation(user)) { this.states.delete(key); return; }
    const previous = this.states.get(key);
    if (previous?.turn === turn) return; // response replay is not a new failed turn
    this.states.set(key, {turn, count: !hadTools && unavailable(answer) ? (previous?.count ?? 0) + 1 : 0});
    if (this.states.size > 256) this.states.delete(this.states.keys().next().value!);
  }
}
