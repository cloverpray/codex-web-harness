import { createHash } from "node:crypto";
import { SUMMARY_PREFIX } from "../../responses/compaction";
import type { CodexParsedRequest, CodexMessage } from "../../types";
import { extractChatGptTurnIdentity } from "./environment";

function messageText(item: Record<string, unknown>): string | undefined {
  const content = item.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return undefined;
  return content.flatMap(block => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return [];
    const text = (block as { text?: unknown }).text;
    return typeof text === "string" ? [text] : [];
  }).join("\n");
}

/** Native compaction remains part of the exact identity of a replayed Codex turn. */
function compactionEpoch(input: unknown[] | undefined): unknown {
  return input?.findLast(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return record.type === "compaction"
      || record.type === "compaction_summary"
      || record.type === "context_compaction"
      || (record.role === "user" && messageText(record)?.startsWith(`${SUMMARY_PREFIX}\n`));
  }) ?? null;
}

export function chatGptConversationKey(
  parsed: CodexParsedRequest,
  namespace: string,
): string | undefined {
  const identity = extractChatGptTurnIdentity(parsed);
  if (!identity.threadId) return undefined;
  const raw = parsed._rawBody as { input?: unknown[] } | undefined;
  return createHash("sha256").update(JSON.stringify({
    namespace,
    // Bump when a retained transport contract changes incompatibly.
    transportRevision: "20260915-per-message-connector-v4",
    threadId: identity.threadId,
    modelId: parsed.modelId,
    reasoning: parsed.options.reasoning,
    compaction: compactionEpoch(raw?.input),
    system: parsed.context.systemPrompt ?? [],
  })).digest("hex");
}

function goalText(message: CodexMessage | undefined): string | undefined {
  if (message?.role !== "user") return undefined;
  const content = message.content;
  const text = typeof content === "string" ? content
    : content.length === 1 && content[0]?.type === "text" ? content[0].text : undefined;
  return text?.startsWith('<codex_internal_context source="goal">')
    && text.trimEnd().endsWith("</codex_internal_context>")
    && Buffer.byteLength(text, "utf8") >= 4096 ? text : undefined;
}

// This is a reference within a confirmed retained conversation, never a new source of
// authority. Only the most recent user message can match; edited budgets/objectives,
// multimodal input and ordinary user requests are always transmitted in full.
function retainedGoalSuffix(messages: CodexMessage[], lastAssistant: number): CodexMessage[] {
  let previous = messages.slice(0, lastAssistant).findLast(message => message.role === "user");
  return messages.slice(lastAssistant + 1).map(message => {
    if (message.role !== "user") return message;
    const text = goalText(message);
    const matches = text !== undefined && text === goalText(previous);
    previous = message;
    if (!matches) return message;
    return {
      ...message,
      content: "The user submitted the exact same Goal continuation block as the most recent original user Goal block already in this conversation. "
        + "Apply that entire block again as the current user request, including its objective, continuation rules, budget and stop conditions, at its original user priority. "
        + "This is a new continuation, not a replay of a completed response. Use the current task state. "
        + `Unchanged block SHA-256: ${createHash("sha256").update(text).digest("hex")}.`,
    };
  });
}

/** Full history remains canonical; a retained epoch receives only the suffix after its last assistant reply. */
export function retainedConversationResumeRequest(
  parsed: CodexParsedRequest,
): CodexParsedRequest | undefined {
  if (parsed._compactionRequest) return undefined;
  const lastAssistant = parsed.context.messages.findLastIndex(message => message.role === "assistant");
  if (lastAssistant < 0 || lastAssistant === parsed.context.messages.length - 1) return undefined;
  return {
    ...parsed,
    context: {
      ...parsed.context,
      // Selected only after the Launcher confirms a retained lease with the same key.
      // That key includes these exact instructions; fresh surfaces use the full request.
      systemPrompt: [],
      messages: retainedGoalSuffix(parsed.context.messages, lastAssistant),
    },
  };
}
