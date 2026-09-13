# Validation / 验证

Status: **alpha / preview**. The fork's authenticated manual coverage is Linux x64 with Codex 0.154. Windows and macOS authenticated account flows remain unverified for these changes.

Historical pre-extraction checks: runtime suite 716 passed, 1 platform skip; read-only snapshot suite 6 passed; runtime type checking and installation-file hashes passed. Long-history browser compaction, subsequent reply and resume completed. No paired native/Web quality or speed benchmark has been performed.

发行源码整理前：716项运行时测试通过、1项平台跳过；只读采集器6项通过；类型检查与安装文件校验通过。Linux 长会话压缩、继续回复、再次恢复已实测。这些不是原生/Web 同任务性能或研究质量对照。

Fresh-source validation and platform package results are reported in GitHub Actions. Each package artifact includes the source commit and runtime bundle identity in BUILD_INFO.json. Check the actual run result; this page does not predeclare CI success.

当前发行源码及各平台安装包以 Actions 的实际结果为准，产物附源码 commit 和运行时 bundle 身份。本文不预先宣称 CI 已通过。

Before marking a stable release, complete the authenticated checks in [release-validation.md](release-validation.md) on each supported platform. Historical upstream validation in that file is not evidence that this fork has passed those flows.

## Fresh source checks (2026-09-12)

After updating the pinned Hono/js-yaml dependencies, `bun run verify` passed locally: 716 runtime tests passed, 1 platform skip; 297 launcher tests passed; both dependency audits, type checks, renderer build, license generation and relocatable runtime smoke passed. The optional snapshot tests passed 6/6.

The clean checkout installed locked JS dependencies. Its Electron binary download stalled on the local network; local validation used the already-verified matching Electron distribution via ELECTRON_OVERRIDE_DIST_PATH. Hosted CI must download its own platform binaries and build the installers. This local result does not predeclare hosted packaging success.

更新 Hono/js-yaml 锁定依赖后，本地 verify 全部通过：运行时716通过/1跳过，启动器297通过，依赖审计、类型检查、构建、许可证生成与运行时搬迁冒烟通过，可选快照6项通过。本机 Electron 二进制下载曾停滞，本地验证使用已有同版本发行文件；托管 CI 仍需自行下载并打包各平台，不能用本地结果替代。

## Four-platform CI (2026-09-12)

[CI run 34698239624](https://github.com/cloverpray/codex-web-harness/actions/runs/34698239624) passed all five jobs: actionlint and native verification/package/smoke jobs for Linux x64, Windows x64, macOS arm64 and macOS x64. Verified source: `cad429a00b356466ed5ed1d93d3ff235d05e6fc2`. Later documentation and artwork commits do not change the installer build identity.

四个平台及 actionlint 均已通过。发布流程复用该次 CI 的安装包，核验源码身份和 SHA-256 后发布，不重新打包。后续文档和配图改动不会改变这些安装包对应的源码 commit。Windows/macOS 真实账户测试仍待补充。

## Alpha.2 teacher hardening (2026-09-12)

Local `bun run verify` passed: **720 runtime tests passed, 1 platform skip; 297 launcher tests passed**. Dependency audits, type checking, renderer build and relocatable-runtime smoke passed. Optional research helpers passed **11 Python tests**, including teacher role/fork validation, UTF-8 packet limits, pending/terminal cancellation handling and session-scoped output limits. Existing public MCP connector ABI remains unchanged.

Codex 0.154 `hooks/list` confirmed the installed teacher command as enabled and trusted. This verifies hook discovery/trust, not a full live-model permissions audit. The local native hook update does not require replacing the active browser process; the new bridge code requires launching the updated app. No running research process was restarted by this repair.

The locally staged Linux installer reuses the existing matching Electron/AppImage runtime; native GitHub Actions builds obtain platform dependencies independently. Alpha.1 cross-platform results above do not establish Alpha.2 cross-platform success; consult its own Actions run.

The local Alpha.2 Linux AppImage passed symbol checks and an isolated desktop launch/install smoke test (`ok=true`, `packaged=true`, `runtimeVerified=true`, version `5.0.7-alpha.2`). This machine used its existing X display because xvfb-run was unavailable. An initial local repack with absolute symlinks was rejected; the accepted repack preserves relative symlinks and passed bundle validation. The existing running launcher was not restarted.

## Alpha.3 calendar rollover (2026-09-13)

A real native rollout reproduced Alpha.2's rejection of a midnight calendar delta; replay through the fixed resolver recovered the same cwd and sandbox from native turn_context. No model call or research experiment was replayed. Synthetic regressions cover tagged and untagged wire messages, altered content, incorrect native provenance, mismatched dates and non-calendar world-state changes.

Local `bun run verify` passed: **722 runtime tests, 1 platform skip; 297 launcher tests**, dependency audits, type checking, renderer build and relocatable-runtime smoke. The authenticated date-only exception does not derive filesystem authority from request XML. Alpha.3 cross-platform package results must be checked in its own CI run.


### 5.0.7-alpha.4 local response-binding validation

`bun run verify`: 724 runtime tests passed, one platform skip, zero failures; 297 launcher tests passed. Types, dependency audits, renderer build and relocatable runtime smoke passed. Added stable-message identity matching across three replaced containers, missing/ambiguous identity rejection, delayed message identity capture and new-user rejection through the binding lifecycle. The original incident has no saved prior message IDs, so it cannot be replayed byte-for-byte; these tests cover the recoverable identity-preserving transition. No research experiments were resubmitted for validation.


### 5.0.7-alpha.5 local validation

Full verify passed: 725 runtime tests, one platform skip, zero failures; 297 launcher tests; types, dependency audits, renderer build and relocatable runtime smoke passed. The ordinary response observation regression records a late message ID and rebinds after multiple container replacements. Optional Python helper tests: 21 passed, including interrupted commit recovery, newer-checkpoint preservation, membership/mask drift and broker timing correlation. Linux repack passed isolated packaged/runtimeVerified smoke. No live research experiment was resubmitted; deployment waits for an idle old runtime.


### 5.0.7-alpha.6 local validation

Full verify passed: 732 runtime tests, one platform skip, zero failures; 297 launcher tests, types, dependency audits, renderer build and relocatable runtime smoke passed. Integration tests cover transient upstream and rate-limit errors before send, after send activation and after confirmed submission, including two native requests and browser start counts. Pre-submission rate-limit retries remain bounded by the original retry policy. DOM predicate tests distinguish actual error text from answer Markdown, code, blockquotes and user content. Terminal DOM probes are bounded to two seconds.

The first regression run demonstrated the typed-error retryability defect for send-activated and submitted phases. No live model task or research experiment was replayed to validate these fixes.

## Alpha.7 failure diagnostics (2026-09-13)

Local `bun run verify` passed: **735 runtime tests passed, 1 platform skip, 0 failures; 297 launcher tests passed**. Audits, type checks, renderer build and relocatable runtime smoke passed. Optional research helpers passed **22 Python tests**. The 58 prompt/compaction contract tests passed separately. Final full log: `validation/failure-diagnostics-verify-accepted.log`.

Regression checks cover a local recursion rejection followed by native error and a usable next call, metadata logs that exclude arguments/results/capabilities, and both typed and unknown compaction exceptions with no duplicate browser submission on reconnect. Two old assertions were updated: a real compaction timeout must keep its specific code; evidence-based reporting may mention a blocked operation. Existing timeout, ownership and capability checks remain.

The local Linux AppImage passed an isolated desktop install/start smoke (`ok=true`, `packaged=true`, `runtimeVerified=true`, version `5.0.7-alpha.7`). It reuses the matching local Electron/AppImage shell. This does not establish hosted cross-platform CI success or prove that earlier research interruptions were platform safety refusals.

本地全量验证通过，安装包已完成独立配置启动验证。测试确认本地拒绝/工具错误不会因新增诊断而中断后续调用，压缩保留具体原因且重连不重复提交。未重放被拒绝的研究操作；未修改研究账本、原生权限或本机研究技能。

## Alpha.8 execution efficiency (2026-09-13)

Final local `bun run verify` passed: **741 runtime tests passed, 1 platform skip, 0 failures; 297 launcher tests passed**. Audits, type checks, renderer build and relocatable runtime smoke passed. Optional research helpers passed **23 Python tests**. Final log: `validation/efficiency-verify-final.log`.

An offline replay of an observed 7553-byte Goal continuation reduced that repeated block to a 479-byte reference (7074 bytes / 93.66% saved). This measures one repeated text block, not total prompt size, billed tokens, end-to-end latency or Alpha quality. Fresh/restored browser surfaces transmit full context first. Canonical Codex history and usage accounting remain unchanged.

Regression coverage includes changed objectives/budgets, intervening user instructions, multimodal content, ordinary messages and compaction; native text-error envelopes preserve original evidence and become MCP errors, while quoted errors and unrelated third-party namespaces remain untouched. Existing broker recovery tests ensure an error result does not itself retire the turn. No experiments or platform-refused operations were submitted for validation.

离线实测重复 Goal 块减少93.66%字节；不能据此声称整场研究提速或计费token同比下降。新页面、变化的目标/预算和压缩恢复仍发送完整上下文。研究状态与资格标准未修改。

The local alpha.8 Linux AppImage also passed isolated desktop startup/install smoke (`ok=true`, `packaged=true`, `runtimeVerified=true`). Local packaging reuses the matching Electron/AppImage shell; no hosted cross-platform CI or GitHub release is claimed for this update.

## Alpha.9 command output budgets (2026-09-13)

Full local verify passed: **741 runtime tests passed, 1 platform skip, 0 failures; 297 launcher tests passed**. Audits, type checks, renderer build and relocatable runtime smoke passed. Log: `validation/output-budget-verify-final.log`. The Linux AppImage passed isolated desktop installation/startup smoke; the activated alpha.9 runtime manifest matches the build.

Direct, generated-exec, MCP and broker tests verify that requests above the 8000-token output cap execute with a bounded budget instead of being rejected. Non-finite budgets remain invalid. Teacher permissions and recursion guards are unchanged.

A real pre-update read-only diagnostic successfully read a random file through the same Codex Native2 connector used by the research session. Separate original research calls appeared in webpage tool-call records without corresponding local MCP claims. This narrows the interruption boundary but does not establish a specific platform safety verdict; no original platform error response was available. No rejected research operation was replayed.

Post-update live validation passed through the same connector: the webpage requested 10000 output tokens, the native rollout received 8000, and one read-only cat returned the exact new random file content with exit code 0. This validates the budget fix on the real path, not removal of upstream safety checks.

## Alpha.10 MCP failure attribution (2026-09-13)

Full verify passed: **745 runtime tests, 1 platform skip, 0 failures; 297 launcher tests passed**. Audits, types, renderer and relocatable-runtime checks passed. Log: `validation/mcp-lifecycle-verify-final.log`. The packaged Linux AppImage passed isolated installation/startup smoke and the activated runtime manifest matches the build.

Failure-injection tests cover claim/action/settlement errors, preserved exception identity, a broken log sink, bounded aggregate cause classification, and unknown safety-check text remaining unknown. A local stdio probe against the installed alpha.10 MCP and live broker deliberately used an invalid diagnostic capability: logs identified `stage=claim`, `reason=turn_capability_invalid_or_expired`, with received/finished correlation and zero native commands. This is a local diagnostic, not a replay of an upstream refusal or a platform policy bypass.

## Alpha.11 durable MCP diagnostics (2026-09-13)

Full verification passed: 747 runtime tests, 1 platform skip, 0 failures; 297 launcher tests passed, plus audits, type checks, renderer and relocatable-runtime checks (`validation/mcp-persistence-verify-final.log`). After separating the persisted event category from the lifecycle phase, all 28 focused logger/lifecycle/prompt tests and type checking passed again. The final rebuilt Linux AppImage passed isolated install/startup smoke.

Tests cover bounded rotation, restricted fields, private file mode, unavailable storage, exception classification and current-turn-only token instructions. The previous prompt assertion forbidding any mention of expired/invalid tokens was updated for the explicitly requested guidance; single-token and historical-token redaction assertions remain.

Installed-runtime probe passed with stderr explicitly ignored: an invalid diagnostic capability returned a claim rejection, and the independent disk log retained received/failed/finished phases, reason and correlation hashes without the raw capability. No native commands ran. The deployed runtime manifest matches the final build.

## Alpha.12 protocol boundary diagnostics (2026-09-13)

Full verify passed: 749 runtime tests, one platform skip, zero failures; 297 launcher tests, audits, types, renderer and relocatable-runtime checks passed (`validation/mcp-boundary-verify.log`). The Linux package passed isolated startup/install smoke. A real local MCP SDK probe against the built runtime, with stderr ignored, rejected missing required arguments and persisted protocol_received/protocol_response without entering a tool callback; no native command ran. Logs excluded private arguments and raw errors. Deployment is deferred while existing research/teacher turns are active; no upstream safety refusal was replayed or claimed resolved.

## Alpha.13 failed prerequisites and error feedback (2026-09-13)

Full verification passed: 753 runtime tests, one platform skip, zero failures; 297 launcher tests, audits, types, renderer and relocatable-runtime checks passed (`validation/fail-fast-verify.log`). Real Bash regression tests verify that a missing repair executable exits127 and does not create the later job marker; normal successful steps and explicit independent conditionals continue. Unknown/Windows shells and single-line commands remain untouched.

A built-runtime MCP test used an isolated broker and forwarded command: the multiline command arrived with set -e, the local Bash executor returned127, the dependent marker remained absent, and the original error reached the MCP client. No research experiment or previously refused operation was run. Failed native envelopes preserve original output and describe possible partial effects, with bounded diagnostic categories rather than a data-quality or policy verdict.

## alpha.14 context output artifacts

Full verify: 756 runtime tests passed, 1 platform skip, 297 launcher tests passed; types, audits, renderer build and relocatable runtime smoke passed. Offline original-output replay: 22/45 results shortened; 220165 to 49427 estimated result tokens, excluding later expansion. Verification logs and the private-session replay remain local; no research transcripts are included in this repository. Original execution/state was not replayed.

Publication checks: 23 optional Python research-helper tests passed. Historical `validation/` log paths above refer to maintainer-local verification records, not files shipped in this repository. Cross-platform GitHub Actions results are reported separately.
