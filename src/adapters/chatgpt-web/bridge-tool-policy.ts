export const CHATGPT_BRIDGE_TOOL_NAME = /^(?:codex_turn_start|codex_exec|codex_write_stdin|codex_apply_patch|codex_view_image|codex_tool_inventory|codex_tool_call|codex_tool_batch|codex_turn_complete)$|(?:^|[._])codex_native[0-9]*[._]+(?:codex_turn_start|codex_exec|codex_write_stdin|codex_apply_patch|codex_view_image|codex_tool_inventory|codex_tool_call|codex_tool_batch|codex_turn_complete)$/i;

export function isChatGptBridgeToolName(name: string): boolean {
  return CHATGPT_BRIDGE_TOOL_NAME.test(name);
}

export function assertNotChatGptBridgeTool(name: string): void {
  if (isChatGptBridgeToolName(name)) {
    throw new Error("Recursive Codex Native bridge routing is unavailable. Use codex_exec or a non-bridge native tool instead.");
  }
}

export function chatGptBridgeToolGuardProgram(): string {
  return `const isBridgeTool = name => typeof name === "string" && ${CHATGPT_BRIDGE_TOOL_NAME}.test(name);`;
}
