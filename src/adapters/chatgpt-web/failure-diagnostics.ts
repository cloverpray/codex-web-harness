import { ChatGptWebAdapterError } from "./adapter-error";
import type { AdapterEvent } from "../../types";

// These observations describe the boundary we actually saw. Text in a model answer or
// tool result cannot authenticate a server policy decision. Never log arguments or output.
export function chatGptToolOutcome(result: { isError?: boolean; structuredContent?: unknown }) {
  return {
    origin: "native_tool_result" as const,
    outcome: result.isError === true ? "tool_reported_error" : "returned",
    policyVerdict: "unknown" as const,
  };
}

export function chatGptCompactionFailure(error: unknown): Extract<AdapterEvent, { type: "error" }> {
  const known = error instanceof ChatGptWebAdapterError ? error : undefined;
  return {
    type: "error",
    message: "ChatGPT context handoff did not complete. Check the existing ChatGPT turn and task artifacts before resuming.",
    status: known?.status ?? 409,
    errorType: known?.errorType ?? "invalid_request_error",
    code: known?.code ?? "compaction_handoff_failed",
    // A failed observation does not prove that submitted work stopped.
    retryable: false,
  };
}
