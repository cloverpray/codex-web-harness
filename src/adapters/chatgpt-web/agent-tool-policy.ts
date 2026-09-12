/** Applied only to Web tool dispatch. Keep this function self-contained for raw exec. */
export function assertWebAgentToolArguments(name: string, args: Record<string, unknown>): void {
  // Native names contain underscores; use a suffix boundary, not substring matching.
  const matches = (suffix: string) => name === suffix || name.endsWith("__" + suffix) || name.endsWith("." + suffix);
  if (matches("spawn_agent")) {
    const full = args.fork_context === true || args.fork_turns === "all";
    if (full && (args.agent_type !== undefined || args.model !== undefined || args.reasoning_effort !== undefined)) {
      throw new Error("Full-history forks inherit their role and model. Do not drop the teacher role to bypass this error; use an isolated role with fork_context=false or fork_turns=none.");
    }
    if (args.model === "chatgpt-web/pro" && !args.agent_type) {
      throw new Error("Web Pro subagents require an explicit configured role. For evidence-only consultation use pro_teacher; do not replace it with a generic model override.");
    }
    if (args.agent_type === "pro_teacher") {
      if (args.fork_context !== false && args.fork_turns !== "none") {
        throw new Error("pro_teacher requires an explicit isolated fork and a compact evidence packet.");
      }
      if (args.model !== undefined || args.reasoning_effort !== undefined) {
        throw new Error("pro_teacher owns its model and effort; omit overrides. Role errors and thread limits must not fall back to a generic Pro agent.");
      }
      if (typeof args.message !== "string" || new TextEncoder().encode(args.message).length > 16000) {
        throw new Error("pro_teacher requires a message of at most 16000 UTF-8 bytes. Select evidence; do not truncate or fork full history.");
      }
    }
  }
  if (matches("exec_command") || matches("write_stdin")) {
    if (args.max_output_tokens === undefined) args.max_output_tokens = 8000;
    if (typeof args.max_output_tokens === "number" && args.max_output_tokens > 8000) {
      throw new Error("Web command output is limited to 8000 tokens per call. Save full output to an artifact and return selected keys or bounded excerpts; narrow a truncated search instead of expanding it.");
    }
  }
}

export function webAgentToolGuardProgram(): string {
  return `const assertWebAgentToolArguments = ${assertWebAgentToolArguments.toString()};`;
}
