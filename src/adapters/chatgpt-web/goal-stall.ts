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
  return /(?:Codex[ _-]*Native|执行接口|本地工具|local tools?|execution interface)/i.test(value)
    && /(?:不可用|没有可用|未提供可用|无法调用|无法访问|无法读取|无法执行|无法继续|unavailable|no .*?(?:interface|tools?)|cannot (?:access|call|execute))/i.test(value);
}

/** A narrow transport stop, never a scientific verdict or an update to the native Goal. */
export function repeatedUnverifiedToolUnavailability(parsed: CodexParsedRequest): boolean {
  if (parsed._compactionRequest || parsed._textCompactionRequest) return false;
  const messages = parsed.context.messages;
  if (!messages.length || !continuation(messages.at(-1)!)) return false;
  let completed = 0;
  let answer = "";
  for (let i = messages.length - 2; i >= Math.max(0, messages.length - 100); i--) {
    const message = messages[i]!;
    // Actual attempts/results, including failures, are a different situation with their own policy.
    if (message.role === "toolResult") return false;
    if (message.role === "assistant") {
      if (message.content.some(part => part.type === "toolCall")) return false;
      if (!message.phase || ["final", "final_answer"].includes(message.phase)) answer += text(message);
    }
    if (message.role === "user") {
      if (!continuation(message) || !unavailable(answer)) return false;
      if (++completed >= 3) return true;
      answer = "";
    }
  }
  return false;
}
