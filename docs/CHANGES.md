# Provenance and changes / 来源与改动

Upstream: https://github.com/miuuyy/codex-chatgpt-web

Base commit: `e85e3693fdb4e3e033348c08df0298c20fcdb612` (v5.0.6 worktree).

This is a derivative distribution, not a claim of original authorship of the launcher or bridge. The upstream MIT license and third-party notices are retained. The source was assembled from tracked upstream files plus explicitly selected new implementation/tests. Machine diagnostics, local configuration and private research history are excluded.

本项目是衍生发行版，不将原启动器或桥接器声明为自己的原创。保留上游 MIT 许可证和第三方许可；源码来自上游已跟踪文件与明确选择的新实现和测试，不包含本机诊断、用户配置或私人研究历史。

## 5.0.7-alpha.1

- Opt-in Codex profile routing and separate Web model metadata catalog.
- Trusted environment recovery and coalesced environment-cache writes.
- Codex 0.154 Responses-based text compaction and exact summary continuation registration.
- Pre-stream rejection of deterministic invalid environment requests.
- Bridge recursion guards across discovery, direct calls, nested execution and broker dispatch.
- Confirmed retained-context/static-instruction omission and conservative short-prompt submission readiness.
- Bounded browser cancellation cleanup with explicit unconfirmed outcomes.
- 30s worker / 55s evidence-only teacher wait options; 90s MCP invocation deadline retained.
- Optional read-only research snapshots and evidence-packet helpers, without a fixed research direction.
- Repository-specific installers/updater, bilingual onboarding and CI artifact manifests.

The experimental MCP batch tool remains off by default. The 55s option reduces possible polling calls; it is not event-driven teacher completion and does not accelerate model inference.

实验性 MCP 批处理仍默认关闭。55秒等待仅减少可能的轮询次数，并非事件推送重构，不会加速模型推理。

Release dependency refresh: Hono 4.13.5 and js-yaml 4.3.2 are pinned to address the advisories found by the fresh release audit. The running local installation was not changed by this source-only refresh.

## Teacher dispatch and bounded output hardening

- Web dispatch rejects full-history forks with role/model overrides instead of allowing generic Pro fallback. `pro_teacher` requires an isolated fork, role-owned settings and a complete packet within 16000 UTF-8 bytes.
- The same argument checks run in direct MCP dispatch, gateway calls, generated raw-exec tool wrappers and the broker. Commands default to 8000 output tokens; larger requested output must be saved to an artifact and queried in bounded excerpts.
- The optional native teacher hook protects pending teacher handles from agent-driven interruption and permits cleanup of completed/aborted handles. Poll timeout is not failure. Legacy incorrectly typed teacher handles can be explicitly protected in machine-local hook state.
- Thread-capacity recovery preserves the role: collect completed results, close unused terminal handles, or keep the packet pending. No automatic experiment resubmission, role fallback or forced cancellation.
- Public connector schema remains unchanged to avoid invalidating existing cached connector identities. The output bound is enforced at invocation time.

## Alpha.3 — calendar rollover during an active turn

Codex can emit a date-only environment delta at local midnight after `task_started`, without a new cwd and without wire-level turn attribution. The earlier history verifier rejected it because it only admitted environment messages preceding that boundary. The bridge now accepts this narrow case only when the canonical rollout proves the exact message ID/content, marks it as this turn's native `environments.environment_context`, and immediately records a matching date-only `world_state`. Filesystem authority still comes from the current native `turn_context`; changed content, wrong provenance and non-date state mutations remain rejected.

修复跨午夜时当前 turn 的日期增量被误判为历史环境的故障；不关闭环境验证、不放宽目录或权限。回归覆盖有/无 wire turn 标记、内容篡改、错误来源、日期不匹配及混入目录更新。


## 5.0.7-alpha.4 — response identity recovery

Track stable assistant message IDs while a response streams. When React replaces multiple historical turn containers, rebind only to the unique container containing the previously observed assistant message. Missing or ambiguous message provenance remains an error; a new user turn is still rejected. Identity failures now explain the page/identity problem instead of reporting that ChatGPT stopped responding. No prompt is resubmitted by this recovery.

回复容器重建时通过已观察到的消息身份恢复绑定；不能核对身份时明确报错，不按位置选最后一条回复。新增纯函数和绑定生命周期回归测试。此前失败诊断未保存旧消息身份，因此这修复了有证据可核对的重建场景，并不声称复现了原故障的全部浏览器状态。


## 5.0.7-alpha.5 — continuous identity observation and diagnostic metrics

The normal response polling loop now records late-arriving stable message IDs before a container disappears, including multipart acknowledgement polling. Alpha.4 captured IDs at binding/reconciliation but ordinary successful polls did not update the binding, leaving a gap for delayed IDs. The new regression exercises this observation path and subsequent multi-container recovery.

Structured transport logs report compiled text bytes, retained-context use, image count and estimated tokens without prompt contents. A once-per-turn displayed safety-refusal phrase observation is explicitly unverified: it does not assert policy provenance, stop the turn, or trigger a retry. Correlate its trace with broker dispatch records. Optional research helpers add recoverable owner-only checkpoint commits, frozen cohort comparison and offline Harness metrics.


## 5.0.7-alpha.6 — post-submission retry boundary and terminal UI scope

Typed transient errors no longer bypass the submission boundary: once Send was activated, native reconnects replay the same non-retryable failure instead of starting another browser execution. Pre-submission failures retain their original retry behavior and error codes remain specific. Regression tests failed for both send-activated and submitted phases before this fix and pass afterward.

Terminal error phrase detection excludes rendered answer Markdown, code, quotations and user content; actual response error UI remains detected. Failure diagnostics record elapsed time, execution abort state and submission uncertainty without copying abort reasons or task contents. They distinguish observed execution cancellation from unclassified failure, not the human/network cause of cancellation.

## Alpha.7 — failure evidence and diagnostics

Tool completion now records whether the native result reported an error; “returned” is not a claim that a command succeeded. Local broker/MCP argument guards and invocation transport failures have separate metadata-only events. Compaction errors preserve the adapter's cause code/status, remain non-retryable, and no longer dump exception stacks or advise blindly resubmitting a task. Diagnostic summaries keep local rejection, native error, handoff timeout, and an unverified refusal phrase separate. They cannot authenticate an upstream policy decision.

Transport guidance asks for the observed tool/error and explicitly acknowledges unavailable rejection evidence. Quoted tool-output instructions do not gain authority. Existing public MCP schemas and truthful capability annotations remain unchanged; this does not disable platform safeguards.

工具返回错误、本地参数拒绝、调用传输失败与压缩错误分别记录；日志不复制参数、输出或异常栈。压缩保留具体原因，不自动重复提交。网页回答中的“安全拦截”字样仍只算未确认线索。通用传输提示要求依据实际错误报告，引用的工具输出不获得指令权限；没有放宽工具权限或改变平台防护。

## Alpha.8 — retained Goal references and scoped failure recovery

A confirmed retained conversation can replace a byte-identical, long Goal continuation with a short reference to the original user block. Ordinary user requests, changed objectives/budgets, multimodal inputs, fresh surfaces and compaction rebuilds keep full content. The canonical Codex request is never rewritten. A transport revision change prevents inheriting an incompatible retained contract. Savings are recorded as serialized bytes, not billed tokens.

Native command failures and agent-capacity failures can arrive as plain text without an error flag. The bridge now recognizes narrow native result envelopes, preserves the entire original result, marks the MCP result as an error, and adds scoped recovery guidance. Quoted refusal words in file output do not trigger this behavior. No tool is executed, retried, cancelled or rerouted by this classification. Generic execution guidance favors collecting independent evidence together, reusing results, finishing a bounded decision and its state update, and keeping optional cleanup out of the critical path.

保留会话中的完全相同 Goal 续接块改用短引用；目标、预算或输入变化即完整发送，原始 Codex 请求始终保留。修复原生文本错误未设置错误标志的问题，给出局部恢复提示，防止容量不足或清理拒绝被扩大成全局恢复。没有修改平台防护、自动重试实验或强关教师句柄。

## Alpha.9 — output budgets do not veto commands

Oversized finite `max_output_tokens` requests are tightened to 8000 at the existing Web dispatch boundaries instead of rejecting the entire command. Smaller budgets remain unchanged; non-finite oversized values remain errors. This affects output volume only: native permissions, teacher isolation, recursion guards and platform checks remain in force. The transport prompt states the actual cap.

修复输出预算被当成整条命令拒绝条件的问题：超过8000时收紧返回上限，允许原本有权执行的命令继续；不放宽执行权限，也不更换被拒绝操作的路由。

## 5.0.7-alpha.10 — MCP call boundaries

MCP callbacks now emit correlated, bounded lifecycle events for receipt, claim, local action and lease cleanup. Errors before native dispatch are observable without recording commands, arguments, result bodies, capability tokens or raw error messages. Log sink failures cannot stop execution. These events describe local boundaries; they do not authenticate a webpage safety verdict or automatically resume a blocked Goal.

新增 MCP 调用阶段与耗时日志，覆盖 claim 失败和派发前本地处理失败。只记录关联标识和阶段，不记录研究正文、命令或令牌；日志写入失败不影响执行。Goal 的 blocked 状态仍由原会话管理。

## 5.0.7-alpha.11 — Durable MCP diagnostics

MCP lifecycle, local rejection and invocation failure events now persist independently of terminal stderr, with private files, size rotation and age cleanup. New turn guidance stops invalid-capability retries and reserves fresh tokens for newly authorized turns after existing work has been checked. This does not relax capability checks or replay interrupted commands.

MCP诊断独立落盘，补齐实际连接器stderr未被Launcher收集的缺口。失效令牌停止重试，新turn用新获发的令牌并先核对原任务；不自动重放命令。

## 5.0.7-alpha.12 — MCP protocol boundary evidence

Record parsed MCP tool requests before SDK validation and outgoing SDK response categories/codes, linked to callback diagnostics by hashed request ID. No arguments, raw errors or result bodies are logged. This closes a local observability gap; absent callback logs alone cannot attribute a refusal to the upstream platform. Failure guidance explicitly avoids splitting a refused operation into equivalent calls and keeps unavailable safety verdicts unconfirmed.

增加SDK校验前的MCP请求、SDK响应类别及协议错误码，关联原有回调日志。修正拒绝后拆分等价请求的处理提示；不宣称解除外部安全拒绝。

## 5.0.7-alpha.13 — Stop after failed prerequisites

The public native command bridge enables `set -e` for multiline scripts when running on a known POSIX shell. A missing repair executable therefore stops the script before a later job starts. Explicit shell conditionals and ignored-error handling retain their native semantics; Windows, unknown shells, single-line commands and generic tool routes are unchanged. No pipefail or automatic retries are added.

Native failed-command results keep the original output and exit code, distinguish missing commands/Python imports/Python execution exceptions, and explicitly warn that earlier steps or partial artifacts may exist. Repair guidance uses a verified interpreter and requires repair verification before dependent work. This is not a data-quality verdict or a change to upstream safety checks.

已知POSIX shell的多行codex_exec默认失败即停止，避免修复命令不存在后仍启动旧脚本。保留原始错误，提示可能已发生的部分效果；不自动重跑。显式if/||/set +e仍遵循shell语义，其他shell和通用工具路由需显式成功检查。

## 5.0.7-alpha.14

Successful large native command outputs use recoverable content-addressed previews in live MCP results and tool-capable replay. Failures, running handles, read-only and compaction evidence remain intact. Add metadata-only context accounting/submission metrics and bounded hash-keyed token-count caching. See CONTEXT_OUTPUTS.zh-CN.md for limits and offline measurements.

## 5.0.7-alpha.15 — native midnight context with subagent roster

Accept the optional UUID/name subagent roster in a native calendar delta. Exact rollout content, current-turn provenance and the following date-only world-state update remain mandatory. Does not change database permissions or tool safety decisions. Regression reproduces both tagged and untagged wire variants before the fix.
