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
