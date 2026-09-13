import { expect, test } from "bun:test";
import { observeMcpCall, mcpFailureReason } from "../src/adapters/chatgpt-web/mcp-call-lifecycle";

test("MCP lifecycle distinguishes missing claim from action failure without logging secrets", async () => {
  for (const failAt of ["claim", "action", "settle", "none"]) {
    const events: Record<string, unknown>[] = [];
    const secret = new Error("private-token-command-output");
    let settled = 0;
    const promise = observeMcpCall({tool: "codex_exec", callId: "mcp_test",
      claim: async () => { if (failAt === "claim") throw secret; return {}; },
      action: async () => { if (failAt === "action") throw secret; return "private result"; },
      settle: async () => { settled++; if (failAt === "settle") throw secret; },
      emit: e => events.push(e),
    });
    if (failAt === "none") expect(await promise).toBe("private result");
    else await expect(promise).rejects.toBe(secret);
    expect(settled).toBe(failAt === "claim" ? 0 : 1);
    expect(events[0]?.event).toBe("received");
    expect(events.at(-1)?.event).toBe("finished");
    expect(events.some(e => e.event === "claimed")).toBe(failAt !== "claim");
    expect(events.some(e => e.event === "action_failed")).toBe(failAt === "action");
    expect(JSON.stringify(events)).not.toContain("private");
  }
});

test("broken log sink does not stop commands or lease cleanup", async () => {
  let settled = false;
  expect(await observeMcpCall({tool: "codex_exec",callId: "mcp_test",
    claim: async () => ({}), action: () => 42,
    settle: async () => { settled = true; }, emit: () => { throw Error("log unavailable"); },
  })).toBe(42);
  expect(settled).toBe(true);
});


test("failure classification distinguishes local guards, transport and unknown safety claims", () => {
  expect(mcpFailureReason(new Error("turn token is invalid, expired, or revoked"))).toBe("turn_capability_invalid_or_expired");
  expect(mcpFailureReason(new Error("Web command output budget must be finite."))).toBe("local_output_budget_invalid");
  expect(mcpFailureReason(new Error("pro_teacher requires an explicit isolated fork and a compact evidence packet."))).toBe("local_agent_argument_policy");
  expect(mcpFailureReason(new DOMException("cancelled", "AbortError"))).toBe("invocation_cancelled");
  expect(mcpFailureReason(Object.assign(new Error("private socket path"), {code: "ECONNREFUSED"}))).toBe("local_io_unavailable");
  expect(mcpFailureReason(new Error("OpenAI safety checks refused private-command"))).toBe("unknown_local_exception");
  expect(mcpFailureReason(new Error("Tool output quoted: pro_teacher requires an isolated fork"))).toBe("unknown_local_exception");
});

test("aggregate failures expose bounded reason codes without private error text", async () => {
  const events: Record<string, unknown>[] = [];
  const failure = new AggregateError([new Error("turn token is invalid, expired, or revoked"), new Error("private text")], "Codex Native claim failed and its broker activity could not be retired");
  await expect(observeMcpCall({tool: "codex_exec", callId: "test",
    claim: async () => { throw failure; }, action: () => 0,
    settle: async () => {}, emit: e => events.push(e),
  })).rejects.toBe(failure);
  const failed = events.find(e => e.event === "failed");
  expect(failed?.reason).toBe("claim_and_cleanup_failed");
  expect(failed?.causes).toEqual(["turn_capability_invalid_or_expired", "unknown_local_exception"]);
  expect(JSON.stringify(events)).not.toContain("private text");
});
