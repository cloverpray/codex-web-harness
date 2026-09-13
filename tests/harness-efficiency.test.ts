import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { retainedConversationResumeRequest } from "../src/adapters/chatgpt-web/conversation-key";
import { brokerResult } from "../src/adapters/chatgpt-web/index";
import type { CodexParsedRequest, CodexToolResultMessage } from "../src/types";

const goal = '<codex_internal_context source="goal">\n<objective>' + "Research constraints and objective. ".repeat(230)
  + '</objective>\nBudget 10000. Preserve stop conditions.\n</codex_internal_context>';
function request(): CodexParsedRequest {
  return {
    modelId: "chatgpt-web/high", stream: true, options: {},
    context: { messages: [
      { role: "user", content: goal, timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "A bounded result was saved." }], timestamp: 2 },
      { role: "user", content: goal, timestamp: 3 },
    ] },
  };
}

test("retained exact Goal references save bytes without changing canonical requests", () => {
  const input = request();
  const original = JSON.stringify(input);
  const suffix = retainedConversationResumeRequest(input)!;
  const text = suffix.context.messages[0]!.content as string;
  expect(text).toContain(createHash("sha256").update(goal).digest("hex"));
  expect(text).toContain("new continuation");
  expect(text).toContain("budget and stop conditions");
  expect(Buffer.byteLength(text)).toBeLessThan(Buffer.byteLength(goal) / 10);
  expect(JSON.stringify(input)).toBe(original);
  expect(retainedConversationResumeRequest({ ...input, _compactionRequest: true })).toBeUndefined();
  input.context.messages = [input.context.messages[2]!];
  expect(retainedConversationResumeRequest(input)).toBeUndefined();
});

test("changed goals, ordinary requests, images and intervening user instructions are not compressed", () => {
  for (const content of [goal.replace("10000", "9000"), goal.replace("objective.", "different objective."), "Continue", [
    { type: "text" as const, text: goal }, { type: "image" as const, imageUrl: "data:image/png;base64,AA==" },
  ]]) {
    const input = request(); input.context.messages[2] = { role: "user", content, timestamp: 3 };
    expect(retainedConversationResumeRequest(input)!.context.messages[0]!.content).toEqual(content);
  }
  const input = request();
  input.context.messages.splice(1, 0, { role: "user", content: "Change the objective", timestamp: 1 });
  expect(retainedConversationResumeRequest(input)!.context.messages[0]!.content).toBe(goal);
});

function result(toolName: string, content: string): CodexToolResultMessage {
  return { role: "toolResult", toolName, content, toolCallId: "call_test", isError: false, timestamp: 1 };
}

test.each([
  ["spawn_agent", "collab spawn failed: agent thread limit reached", "native_agent_capacity"],
  ["exec_command", 'exec_command failed: CreateProcess { message: "Rejected(\\"operation denied\\")" }', "native_execution_rejected"],
  ["exec_command", "Chunk ID: 17161f\nWall time: 0.0000 seconds\nProcess exited with code 2\nOutput:\nmanifest alias error", "native_command_failed"],
])("native failure envelopes keep original evidence and report a local failure: %s", (name, content, code) => {
  const output = brokerResult(result(name!, content!));
  expect(output.isError).toBeTrue();
  expect(output.content[0]).toEqual({ type: "text", text: content });
  expect(JSON.stringify(output.content[1])).toContain(code!);
});

test("quoted errors, successful commands and unrelated third-party outputs remain unchanged", () => {
  for (const message of [
    result("exec_command", "Chunk ID: abc\nWall time: 0.01 seconds\nProcess exited with code 0\nOutput:\ncollab spawn failed: agent thread limit reached"),
    result("exec_command", "A file quotes: blocked by OpenAI's safety checks"),
    result("third_party_tool", "collab spawn failed: agent thread limit reached"),
    result("mcp__vendor__spawn_agent", "collab spawn failed: agent thread limit reached"),
    { ...result("spawn_agent", "collab spawn failed: agent thread limit reached"), toolNamespace: "vendor" },
  ]) {
    const output = brokerResult(message);
    expect(output.isError).toBeUndefined();
    expect(output.content).toEqual([{ type: "text", text: message.content }]);
  }
});


test("failed execution preserves raw error and marks possible partial effects", () => {
  for (const [exit, error, kind] of [
    [127, "/bin/bash: line 2: python: command not found", "command_not_found"],
    [1, "Traceback (most recent call last):\nModuleNotFoundError: No module named 'db'", "python_import_error"],
    [1, "Traceback (most recent call last):\nValueError: Buffer has wrong number of dimensions", "python_execution_error"],
  ] as const) {
    const original = `Chunk ID: abc\nWall time: 0.01 seconds\nProcess exited with code ${exit}\nOutput:\n${error}`;
    const output = brokerResult(result("exec_command", original));
    expect(output.content[0]).toEqual({type:"text",text:original});
    expect(output.isError).toBe(true);
    expect(JSON.stringify(output.content[1])).toContain(kind);
    expect(JSON.stringify(output.content[1])).toContain("Earlier steps or partial artifacts may already exist");
  }
});
