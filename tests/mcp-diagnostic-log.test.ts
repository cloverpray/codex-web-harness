import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createMcpDiagnosticLog } from "../src/adapters/chatgpt-web/mcp-diagnostic-log";

test("MCP diagnostics persist with restricted fields and bounded rotation", () => {
 const dir = mkdtempSync(join(tmpdir(), "mcp-log-test-"));
 try {
  const log = createMcpDiagnosticLog(dir, {pid: 123, maxBytes: 300});
  for(let i=0;i<10;i++) log("failed", {callId: `test-${i}`,reason:"turn_already_finished",event:"failed",cmd:"private command",token:"secret",scope:"private metadata"});
  const current = readFileSync(join(dir,"mcp-123.jsonl"),"utf8");
  const previous = readFileSync(join(dir,"mcp-123.jsonl.1"),"utf8");
  expect(current).toContain("test-9");
  expect(JSON.parse(current.trim().split("\n").at(-1)!)).toMatchObject({event:"failed",phase:"failed"});
  expect(current+previous).not.toMatch(/private|secret/);
  expect(Buffer.byteLength(current)).toBeLessThanOrEqual(300);
  expect(Buffer.byteLength(previous)).toBeLessThanOrEqual(300);
  if(process.platform!=="win32") expect(statSync(join(dir,"mcp-123.jsonl")).mode & 0o777).toBe(0o600);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test("unwritable diagnostic destination cannot reject execution", () => {
 const dir=mkdtempSync(join(tmpdir(),"mcp-log-test-"));
 try {const file=join(dir,"file");writeFileSync(file,"occupied");const log=createMcpDiagnosticLog(file);expect(()=>log("failed",{reason:"unknown"})).not.toThrow();}
 finally {rmSync(dir,{recursive:true,force:true});}
});
