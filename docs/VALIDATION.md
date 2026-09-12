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
