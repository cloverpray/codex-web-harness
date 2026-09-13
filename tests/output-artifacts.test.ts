import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compactCommandOutput } from "../src/adapters/chatgpt-web/output-artifacts";
import type { CodexToolResultMessage } from "../src/types";
const raw = "Chunk ID: abc\nWall time: 0.1 seconds\nProcess exited with code 0\nOriginal token count: 9000\nOutput:\n" + "evidence row\n".repeat(2000);
const message = (content = raw): CodexToolResultMessage => ({ role: "toolResult", timestamp: 1, toolName: "exec_command", toolCallId: "a", content, isError: false });
test("large output is recoverable, versioned, and immutable without rerunning execution", () => {
 const dir = mkdtempSync(join(tmpdir(), "output-artifact-"));
 try {
  const shortened = compactCommandOutput(message(), dir);
  expect(String(shortened.content).length).toBeLessThan(4000);
  expect(readFileSync(join(dir,readdirSync(dir)[0]!),"utf8")).toBe(raw);
  expect(compactCommandOutput(message(), dir)).toEqual(shortened);
  expect(readdirSync(dir).length).toBe(1);
  compactCommandOutput(message(raw + "changed"),dir);
  expect(readdirSync(dir).length).toBe(2);
  writeFileSync(join(dir,readdirSync(dir).find(n=>readFileSync(join(dir,n),'utf8')===raw)!), 'corrupted');
  expect(compactCommandOutput(message(),dir)).toEqual(message());
 } finally { rmSync(dir,{recursive:true,force:true}); }
});
test("errors, running handles, foreign tools, and storage failure preserve original output", () => {
 for (const m of [message(raw.replace('code 0','code 1')), message(raw.replace('Process exited with code 0','Process running with session ID 123')), {...message(),isError:true}, {...message(),toolNamespace:'third_party'}]) expect(compactCommandOutput(m)).toEqual(m);
 const dir = mkdtempSync(join(tmpdir(), "output-artifact-storage-failure-"));
 try {
  const file = join(dir, "not-a-directory");
  writeFileSync(file, "fixture");
  expect(compactCommandOutput(message(), join(file, "unwritable"))).toEqual(message());
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Test the two model-facing paths against one artifact while keeping the source message intact.
import { brokerResult } from "../src/adapters/chatgpt-web/index";
import { compileChatGptWebPrompt } from "../src/adapters/chatgpt-web/prompt";
test("live broker and rebuilt tool-capable history agree; read-only and compaction keep full evidence", () => {
 const dir = mkdtempSync(join(tmpdir(), "output-artifact-integration-"));
 const previous = process.env.CODEX_CHATGPT_WEB_HOME;
 process.env.CODEX_CHATGPT_WEB_HOME = dir;
 try {
  const original = message();
  const live = brokerResult(original);
  const parsed = { modelId: "gpt-5.6-sol", stream: false, context: { messages: [original] }, options: { reasoning: "high" as const } };
  const caps = { localToolsEnabled: true, solAvailable: true, proAvailable: true };
  const compiled = compileChatGptWebPrompt(parsed, caps, "turn_00000000000000000000000000000000");
  expect(compiled.text).toContain("Captured-output artifact:");
  expect(JSON.stringify(live.content)).toContain("Captured-output artifact:");
  expect(original.content).toBe(raw);
  const readonly = compileChatGptWebPrompt(parsed, {...caps, localToolsEnabled: false});
  expect(readonly.text).not.toContain("[Harness output preview;");
  const checkpoint = compileChatGptWebPrompt({...parsed, _compactionRequest: true},caps,"turn_00000000000000000000000000000000");
  expect(checkpoint.text).not.toContain("[Harness output preview;");
 } finally {
  if (previous === undefined) delete process.env.CODEX_CHATGPT_WEB_HOME; else process.env.CODEX_CHATGPT_WEB_HOME=previous;
  rmSync(dir,{recursive:true,force:true});
 }
});
