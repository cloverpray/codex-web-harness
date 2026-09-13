# Output previews and context accounting

[中文说明](CONTEXT_OUTPUTS.zh-CN.md)

Alpha.14 saves large, successful native command results as content-addressed files and sends a short preview to the Web model. Use existing native tools to read only the ranges needed. The same representation is used when rebuilding tool-capable history; the original Codex rollout is unchanged.

- Applies to recognized successful `exec_command` and `write_stdin` results above 12,000 characters. The preview includes the native header and 2,400 body characters.
- Failed commands, running process handles, third-party tools, read-only model contexts and compaction requests keep their original evidence.
- Artifacts preserve exactly the received result. They cannot recover output already truncated upstream. Prefer writing large experimental results to task artifacts before printing a focused summary.
- Files live under the Harness configuration directory in `output-artifacts/`, with content hashes as names. The directory defaults to mode 0700 and files to 0600. At 256 MiB, new results fall back to full output; referenced files are not automatically deleted.
- Reuse is by captured output content, not by command or source file. It never skips execution or proves that a source file is unchanged.

Metadata-only `context_submission` and `context_accounting` events distinguish prepared text bytes from canonical context estimates. Neither is OpenAI billing or proof of successful network delivery. Token counts use a bounded hash-keyed cache without storing original text.

An offline sample of 45 captured tool results shortened 22 results, reducing estimated result tokens from 220,165 to 49,427 (77.6%). Reading additional ranges adds tokens. This is not a measurement of total task cost, latency, or research quality.

Automatic source-file caching, removal of public progress history, and removal of MCP structured/text dual representations remain deferred pending consumer-side evidence.
