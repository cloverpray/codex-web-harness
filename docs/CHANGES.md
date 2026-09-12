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
