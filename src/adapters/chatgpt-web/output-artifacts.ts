import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, lstatSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir } from "../../config";
import type { CodexToolResultMessage } from "../../types";

/** Preserve captured output before shortening its model-facing representation. Never cache execution. */
export function compactCommandOutput(message: CodexToolResultMessage, directory = join(getConfigDir(), "output-artifacts")): CodexToolResultMessage {
  if (message.isError || !["exec_command", "write_stdin"].includes(message.toolName)
    || (message.toolNamespace && message.toolNamespace !== "functions")) return message;
  const text = typeof message.content === "string" ? message.content
    : message.content.length === 1 && message.content[0]?.type === "text" ? message.content[0].text : undefined;
  // Only confirmed successful native envelopes; running handles and failures remain intact.
  if (!text || text.length <= 12_000 || !/^Chunk ID: [^\n]+\nWall time: [^\n]+\nProcess exited with code 0\n/.test(text)) return message;
  const split = text.indexOf("\nOutput:\n");
  if (split < 0) return message;
  const header = text.slice(0, split + 9), body = text.slice(split + 9);
  const hash = createHash("sha256").update(text).digest("hex");
  const path = join(directory, `${hash}.txt`);
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) return message;
    // Keep referenced artifacts stable. At the cap, fall back to full output rather than
    // deleting files still referenced by checkpoints or a retained browser conversation.
    if (!existsSync(path)) {
      let bytes = 0;
      for (const name of readdirSync(directory)) {
        if (/^[a-f0-9]{64}\.txt$/.test(name)) bytes += lstatSync(join(directory, name)).size;
      }
      if (bytes + Buffer.byteLength(text, "utf8") > 256 * 1024 * 1024) return message;
    }
    try { writeFileSync(path, text, { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink() || readFileSync(path, "utf8") !== text) return message;
    const preview = body.slice(0, 2400);
    return { ...message, content: `${header}${preview}\n\n[Harness output preview; omitted ${body.length - preview.length} characters]\nCaptured-output artifact: ${path}\nSHA-256 (UTF-8): ${hash}\nThis file preserves exactly the received result, including its native header. Any upstream truncation remains; it cannot recover text already omitted by the native tool. Read bounded ranges of this artifact with native tools if needed; do not rerun the command to obtain the remaining captured text. Identical captured output reuses this immutable artifact; changed output has a new hash.\n` };
  } catch { return message; } // Storage failure must not hide output or block a tool.
}
