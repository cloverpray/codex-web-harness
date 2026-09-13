/** Fixed diagnostic categories, never raw exceptions or inferred upstream policy. */
export function mcpFailureReason(error: unknown): string {
  if (!(error instanceof Error)) return "unknown_local_exception";
  const message = error.message;
  if (error.name === "TurnBrokerTimeoutError") return "broker_timeout";
  if (error.name === "AbortError") return "invocation_cancelled";
  const code = (error as Error & { code?: unknown }).code;
  if (["ECONNREFUSED", "ECONNRESET", "EPIPE", "ENOENT"].includes(String(code))) return "local_io_unavailable";
  if (message === "ChatGPT web turn broker closed the connection") return "broker_connection_closed";
  if (/^(?:turn token|request id|Zero Risk request_id) is invalid(?: or expired|, expired, or revoked)$/.test(message)
      || message === "internal Codex turn binding is invalid or expired") return "turn_capability_invalid_or_expired";
  if (/^(?:This turn_token|This request_id) was issued for .+, which has already finished\. This Codex Native action can no longer run\.$/.test(message)) return "turn_already_finished";
  if (message === "Recursive Codex Native bridge routing is unavailable. Use codex_exec or a non-bridge native tool instead.") return "local_bridge_recursion_guard";
  if (message.startsWith("Full-history forks inherit their role and model.")
      || message.startsWith("Web Pro subagents require an explicit configured role.")
      || message.startsWith("pro_teacher requires ") || message.startsWith("pro_teacher owns its model and effort;")) return "local_agent_argument_policy";
  if (message === "Web command output budget must be finite.") return "local_output_budget_invalid";
  if (message === "Codex turn environment changed during an active ChatGPT tool loop") return "turn_environment_changed";
  if (message === "turn token binding state is inconsistent") return "turn_binding_inconsistent";
  if (message === "Codex Native claim failed and its broker activity could not be retired") return "claim_and_cleanup_failed";
  if (message === "Codex Native broker activity cleanup failed after an idempotent retry") return "activity_cleanup_failed";
  return "unknown_local_exception";
}

function failureEvidence(error: unknown) {
  return { reason: mcpFailureReason(error), evidence: "local_exception_signature",
    ...(error instanceof AggregateError ? { causes: error.errors.slice(0, 3).map(mcpFailureReason) } : {}) };
}

// Observe only local callback boundaries. Never infer a platform policy verdict.
export async function observeMcpCall<C, T>(options: {
  tool: string;
  callId: string;
  claim: () => Promise<C>;
  action: (claimed: C) => Promise<T> | T;
  settle: (claimed: C) => Promise<void>;
  emit: (event: Record<string, unknown>) => void;
}): Promise<T> {
  const started = performance.now();
  let stage = "claim";
  let failureStage: string | undefined;
  const emit = (event: string, error?: unknown) => {
    // Logging must never change execution or mask the original failure.
    try { options.emit({ event, callId: options.callId, tool: options.tool,
      stage, elapsedMs: Math.round(performance.now() - started), policyVerdict: "unknown",
      ...(error === undefined ? {} : failureEvidence(error)) }); } catch {}
  };
  emit("received");
  try {
    const claimed = await options.claim();
    emit("claimed");
    stage = "action";
    try {
      const value = await options.action(claimed);
      emit("action_returned");
      return value;
    } catch (error) {
      failureStage = "action";
      emit("action_failed", error);
      throw error;
    } finally {
      stage = "settle";
      try { await options.settle(claimed); } catch (error) {
        failureStage = "settle";
        throw error;
      }
      emit("settled");
    }
  } catch (error) {
    stage = failureStage ?? stage;
    emit("failed", error);
    throw error;
  } finally {
    emit("finished");
  }
}
