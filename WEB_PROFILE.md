Use `codex` for the existing native configuration and `codex -p web` for a
ChatGPT Web Harness session. This installation of Codex uses profile-v2 files:
`~/.codex/web.config.toml` is layered over `~/.codex/config.toml` for that invocation.
This is a CLI mode, not a switch for an already running desktop session.

The bridge runtime setting `codexConfigProfile: "web"` makes Launcher setup,
route validation, connect/disconnect, and rollback manage the profile file.
Without this setting the original global-route behavior is retained. Profile
names must be simple alphanumeric names with optional underscores or hyphens.
Existing journal target checks remain enforced; merely changing the setting does
not silently migrate an existing installation.

For this local installation, after quitting Launcher and confirming there are
no active Web turns, run `bun scripts/migrate-web-profile.ts web`. The migration
requires the global `openai_base_url` to be absent, refuses to overwrite an
existing profile, archives the old journals/config, and leaves the native config
byte-for-byte intact. Reopen the profile-capable Launcher afterwards.

Keep Launcher running during Web sessions. Start a Web session with
`codex -p web`, or choose a Web model explicitly with
`codex -p web -m chatgpt-web/pro`. Native and Web sessions can run concurrently.
Existing explicitly configured Web agents in the base config keep their routing.

The migration snapshots `codex debug models --bundled` as a local schema template.
In profile mode `/v1/models` derives the current Web model metadata from that
template and the runtime settings, without needing native OAuth or exposing
native models in the Web selector. Native passthrough authentication is unchanged.

The profile also points `model_catalog_json` at a dedicated `profile-models.json`.
Launcher refreshes it on runtime startup and model discovery. This prevents a
native session's shared `models_cache.json` refresh from removing Web metadata.

An explicit `model_reasoning_effort` in the base config is still inherited. To
make Codex's displayed effort match the selected Web route, use:

```sh
codex -p web -m chatgpt-web/high -c model_reasoning_effort=high
codex -p web -m chatgpt-web/extra-high -c model_reasoning_effort=xhigh
codex -p web -m chatgpt-web/pro -c model_reasoning_effort=ultra
```

The bridge's actual Web effort is fixed by the model slug even if Codex displays
an inherited effort. `permissions: YOLO mode` describes Codex's local tool
permissions, independently of which provider or Web effort is selected.

## Context reuse and tool batches (2026-09-12)

Retained automatic Web conversations now include the exact top-level system instructions
in their identity. A confirmed reused surface receives only the new message suffix and
omits those unchanged instructions. New surfaces, instruction changes, model/effort changes,
and compaction epochs continue to receive the full canonical context. Native Responses input
and usage accounting remain canonical. This reduces browser prompt retransmission, not the
initial request or the model's retained conversation history.

Automatic mode encourages batching independent read-only inspections within an existing native
command. Where the native JavaScript exec gateway is available, use `await Promise.allSettled`
and inspect every result. Dependencies, shared-state edits, approvals, and waits stay sequential.

An experimental `codex_tool_batch` MCP implementation supports up to eight independent calls,
preflights route/transport validation, and retains ordered results, per-item errors, structured
content, and images. Native permissions, cancellation, timeouts, and recursion guards remain in
force. Its integration tests opt into `CODEX_CHATGPT_WEB_EXPERIMENTAL_TOOL_BATCH=1`.
**It is disabled by default and is not an enabled production optimization:** ChatGPT safety checks
rejected both an initial control-name design (removed) and the subsequently declared, refreshed
MCP action before any native read was dispatched. Production retains its original tool catalog;
do not retry that blocked action through alternate wire names.

Confirmed retained prompts also omit unchanged static bridge instructions under a versioned
conversation identity. Current turn capabilities, new task context, and output requirements are
always transmitted. This saves browser prompt bytes even when Codex supplies no top-level system
records. New or invalidated surfaces use the full prompt automatically.

The broker's existing 15 ms coalescing window is unchanged. Diagnostic logs record only context
byte counts and batch sizes, not prompt or argument contents. Byte savings are not a measurement
of model reasoning speed or end-to-end latency improvement.

Short-prompt live validation exposed send activation failures before any new user bubble appeared.
The sender now requires the enabled state on two successive UI polls before its one activation;
submission acceptance is still required, and ambiguous submissions are never automatically resent.
This adds a 250 ms readiness interval. It is intentionally included in end-to-end measurements;
prompt byte savings alone must not be reported as an equivalent latency improvement.
