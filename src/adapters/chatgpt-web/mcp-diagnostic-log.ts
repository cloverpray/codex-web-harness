import { appendFileSync, chmodSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/** Per-process files avoid rotation races between concurrent MCP servers. */
export function createMcpDiagnosticLog(directory: string, options: { pid?: number; maxBytes?: number } = {}) {
  const pid = options.pid ?? process.pid;
  const path = join(directory, `mcp-${pid}.jsonl`);
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  let ready = false;
  let warned = false;
  return (event: string, fields: Record<string, unknown>) => {
    try {
      if (!ready) {
        mkdirSync(directory, { recursive: true, mode: 0o700 });
        // Remove only this logger's old files; never inspect their contents.
        for (const name of readdirSync(directory)) {
          if (!/^mcp-\d+\.jsonl(?:\.1)?$/.test(name)) continue;
          const file = join(directory, name);
          try { if (Date.now() - statSync(file).mtimeMs > 7 * 86400_000) rmSync(file); } catch {}
        }
        ready = true;
      }
      // Deliberately exclude arbitrary fields, commands, scopes, tokens and raw errors.
      const allowed = ["requestHash", "protocolErrorCode", "outcome", "callId", "tool", "stage", "elapsedMs", "policyVerdict", "bindingHash", "tokenHash", "reason", "evidence", "causes", "origin", "code", "dispatched", "turnActive", "retirementRequested"];
      const safe = Object.fromEntries(allowed.filter(k => fields[k] !== undefined).map(k => [k, fields[k]]));
      const line = JSON.stringify({ at: new Date().toISOString(), pid, event, phase: typeof fields.event === "string" ? fields.event : undefined, ...safe }) + "\n";
      if (Buffer.byteLength(line) > 8192) return;
      let size = 0;
      try { size = statSync(path).size; } catch {}
      if (size + Buffer.byteLength(line) > maxBytes) {
        rmSync(path + ".1", { force: true });
        if (size) renameSync(path, path + ".1");
      }
      appendFileSync(path, line, { mode: 0o600 });
      chmodSync(path, 0o600);
    } catch {
      // Observability cannot reject a tool request or print its private payload.
      if (!warned) { warned = true; try { console.error("[chatgpt-web-mcp] diagnostic_log_unavailable"); } catch {} }
    }
  };
}
