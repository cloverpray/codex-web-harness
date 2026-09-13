import type { CodexToolResultMessage } from "../../types";

/** Recognize native envelopes, not refusal words inside command output or quoted files. */
export function nativeToolFailure(message: CodexToolResultMessage): { code: string; guidance: string; exitCode?: number; failureKind?: string } | undefined {
  if (message.toolNamespace && !["functions", "multi_agent_v1", "multi_agent_v2", "collaboration"].includes(message.toolNamespace)) return undefined;
  if (message.toolName.includes("__") && !/^(?:multi_agent_v[12]|collaboration)__spawn_agent$/.test(message.toolName)) return undefined;
  const text = typeof message.content === "string" ? message.content
    : message.content.length === 1 && message.content[0]?.type === "text" ? message.content[0].text : undefined;
  if (text === undefined) return undefined;
  const name = message.toolName.split("__").at(-1);
  if (name === "spawn_agent" && text.trim() === "collab spawn failed: agent thread limit reached") {
    return {
      code: "native_agent_capacity",
      guidance: "No agent was created. Keep the requested role. Use an existing suitable teacher if available; otherwise save completed results and release only unused terminal handles through the owning agent's native lifecycle. Do independent authorized work while capacity is unavailable; do not cancel pending agents or repeat spawn unchanged.",
    };
  }
  if (name !== "exec_command" && name !== "write_stdin") return undefined;
  if (name === "exec_command" && /^exec_command failed: CreateProcess \{ message: "Rejected\(/.test(text)) {
    return {
      code: "native_execution_rejected",
      guidance: "The native executor rejected this operation. Preserve the original reason; do not repackage or route it through another tool. This result does not establish that unrelated tools are unavailable. Optional cleanup can remain pending while independent authorized work continues.",
    };
  }
  const exit = /^Chunk ID: [^\n]+\nWall time: [^\n]+\nProcess exited with code ([1-9]\d*)\n/.exec(text);
  if (exit) {
    const failureKind = Number(exit[1]) === 127 && /command not found|not recognized as an internal/.test(text)
      ? "command_not_found"
      : /(?:ModuleNotFoundError|ImportError):/.test(text) ? "python_import_error"
      : /Traceback \(most recent call last\):/.test(text) ? "python_execution_error" : "command_failed";
    return {
      code: "native_command_failed", exitCode: Number(exit[1]), failureKind,
      guidance: `The command started and exited with code ${exit[1]} (${failureKind}). Earlier steps or partial artifacts may already exist; this result does not prove that nothing changed. Preserve the original output and any returned session handle. Verify the failed prerequisite before launching dependent work; a repair and its verification must succeed first. Use the task's verified interpreter, not an assumed python alias. Inspect partial artifacts rather than restarting the whole task or rerunning completed experiments. This is an execution failure, not by itself a data-quality verdict or policy refusal.`,
    };
  }
  return undefined;
}
