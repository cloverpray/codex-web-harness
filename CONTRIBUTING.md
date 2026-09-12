# Contributing / 参与贡献

This fork is maintained in cloverpray/codex-web-harness. The original launcher and bridge were created by [miuuyy](https://github.com/miuuyy); upstream provenance and copyright remain intact.

欢迎中英文问题反馈、文档改进、平台验证及聚焦的代码修复。请先描述可复现问题、预期行为和已有证据。较大的行为变更请先开 issue 讨论范围，以免重复工作。

Small, focused patches are easiest to review. Include the relevant tests and validation result. For bugs, provide app/Codex versions, OS, reproduction steps and redacted errors. Do not upload account state or private conversation history. Run locked installs and `bun run verify` before submitting a code change; native packages require matching OS checks.

## Scope and invariants

- Keep the project focused on ChatGPT web-backed Codex models. Generic providers and unrelated
  product surfaces are out of scope.
- Model selection is explicit. Never silently fall back to another model or reasoning level.
- Full mode exposes local tools only through the active outer Codex registry and official MCP
  tunnel. Browser-only mode must not create a broker capability or attach an MCP connector.
- Every available ChatGPT Web effort has the same turn-bound MCP capability in Full mode. Do not
  add effort-specific MCP exclusions.
- Preserve fail-closed behavior. A selector or protocol failure must return an explicit error, not
  pick another option or claim success.
- Never commit browser state, cookies, API keys, tunnel IDs, Codex history, generated logs, or
  absolute user paths.

## Before opening a pull request

1. Run `bun install --frozen-lockfile` in the repository root and in `launcher/`.
2. Run `bun run verify`.
3. Add a focused regression test for behavior changes.
4. For browser UI changes, include the observed DOM evidence and a reproducible fixture. Do not
   broaden selectors speculatively.
5. Keep Terms and trademark claims factual. Do not market the project as a quota or rate-limit
   bypass.
6. Manually test the affected behavior. DEV mode is sufficient only when the change does not affect
   local-tool execution, MCP execution, or the outer Codex agent loop. Execution changes require a
   real installed Codex integration; DEV simulation is not end-to-end acceptance evidence.

Launcher changes must preserve native packaging on macOS, Windows, and Linux. Platform packages
must be built on their matching operating system. See [DEV chat mode](docs/dev-chat.md) for isolated
browser and MCP development, and [release validation](docs/release-validation.md) for the required
account-bound release checks.
