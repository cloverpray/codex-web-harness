# 排查研究中断

先保留当前 ChatGPT 页面、Codex 会话和已有实验句柄。不要因为网页回答说“全部被拦截”就重开实验，也不要通过更换工具包装重试被明确拒绝的操作。

| 记录 | 能说明什么 | 不能说明什么 |
| --- | --- | --- |
| `tool_rejection` / `broker_guard`、`mcp_guard` | 本地参数或递归路由规则在派发前拒绝 | OpenAI 服务端拒绝 |
| `tool_outcome` / `tool_reported_error` | 原生工具的 `isError=true` | 错误一定来自安全检查 |
| `tool_outcome` / `returned` | 工具已返回，未标记 MCP 错误 | 命令退出码为零、实验成功 |
| `invocation_failure` | broker 调用超时、取消或失败，已请求回收绑定 | 原实验进程已经停止 |
| `compaction_failure` | 上下文交接失败，保留具体错误码 | 工具被禁用 |
| `response_surface_marker` | 网页回答出现拒绝措辞 | 该措辞是平台的原始拒绝 |

运行只读汇总：

```bash
python3 extras/research/harness_metrics.py /path/to/launcher.jsonl --since 2026-09-13T00:00:00Z
```

按 trace/call 关联已收到的事件。MCP 事件由其 stderr 输出，是否进入 Launcher 日志取决于宿主采集；未采集的事件不可推断为未发生。重连可重复输出诊断，交接失败按 trace 去重。日志窗口可能缺少事件起点，旧版本没有新字段。

确认平台拒绝需要平台的原始错误或明确 UI 提示，不能只引用 Agent 的总结。保存错误码和必要的脱敏原句即可，不要公开认证信息、工具令牌、完整研究提示词。明确拒绝应调整任务到允许范围；传输故障则先核对原句柄和产物，再决定如何恢复。

本次新增诊断不写研究合同、检查点、预算或揭盲状态。它改善故障归因，不承诺提升模型推理速度或解除平台限制。

## MCP 回调生命周期（alpha.10）

`[chatgpt-web-mcp] call_lifecycle` 按 `callId` 关联 received、claimed、action_returned/action_failed、settled、failed、finished；成功 claim 后增加脱敏 bindingHash，可关联现有 broker 诊断。elapsedMs 为调用内累计耗时。received 仅表示进入已通过 SDK 参数解析的工具回调，不代表 HTTP/连接器最外层入口。

- 没有 received：不能归因为本地工具参数策略；也可能是连接器、SDK 解析或日志采集问题，不能只靠缺日志判定平台拒绝。
- received 后在 claim 阶段 failed：检查 claim/令牌生命周期及 broker 可达性。
- action_failed：本地处理失败；结合 tool_rejection、invocation_failure 和 broker 日志进一步定位。不是平台安全结论。
- action_returned：处理函数返回，仍可能是 `isError` 工具结果；不是命令成功或研究成功。
- settle 阶段 failed：清理未完成，结合原调用记录查验，不能自动重放命令。

若原生 rollout 有成功的 `update_goal({status:"blocked"})`，Goal 停止是持久状态变化。Harness 更新不会自行覆盖状态；在原会话恢复时先核对原句柄、产物和最后错误。Agent 在总结中写“safety checks”不是原始平台拒绝码。

失败事件另含固定 `reason` 和 `evidence=local_exception_signature`。分类包括 broker_timeout、invocation_cancelled、local_io_unavailable、broker_connection_closed、turn_capability_invalid_or_expired、turn_already_finished、local_bridge_recursion_guard、local_agent_argument_policy、local_output_budget_invalid、turn_environment_changed、turn_binding_inconsistent、activity_cleanup_failed。复合错误最多记录3个 causes 分类。未知异常保留 unknown_local_exception；不记录原始错误正文，也不根据“safety checks”文字认证平台拒绝。分类说明观察到的失败，不证明最早根因，例如令牌失效仍需向前查超时或 turn 完成记录。

## 持久 MCP 日志（alpha.11）

MCP 自行写入 `<CODEX_CHATGPT_WEB_HOME>/diagnostics/mcp/mcp-<pid>.jsonl`，默认目录为 `~/.codex-chatgpt-web/diagnostics/mcp`。不依赖连接器宿主是否收集 stderr。每个进程一份当前文件和一份 `.1` 轮转文件，每份上限2 MiB；启动写入时清理超过7天的同类旧文件。文件权限0600，新建目录0700。只保存固定诊断字段，不保存 scope、命令、参数、结果、令牌或原始异常。磁盘写入失败只发一次通用stderr警告，不影响工具调用。

固定提示明确区分“当前响应令牌失效”与“下一轮获发新令牌”：失效后结束当前响应的本地调用，不能从历史寻找令牌、猜测令牌或用新令牌重放旧请求。只有新获授权的Codex turn可以提供新的令牌，继续前先检查原句柄与产物。令牌生命周期检查保持不变，提示不能让已发送的旧网页请求消失。

## 协议边界（alpha.12）

`protocol_received` 代表收到可解析的 tools/call JSON-RPC 请求、尚未进入 SDK 工具参数校验；`protocol_response` 代表SDK准备返回的响应，记录 returned/tool_reported_error/protocol_error 及数字 protocolErrorCode。requestHash 与 call_lifecycle 对应，最多关联256个未结请求。不读取原始工具输入、结果或错误正文。响应事件不等于对端已收到；不可解析的原始stdio输入与到达本进程之前的HTTP/平台行为不在该观察边界内。

若protocol_received后出现protocol_error而没有call_lifecycle，说明本地SDK已处理并返回协议错误，应查对应代码。若没有protocol_received，仍须排除日志故障、进程选择与连接器传输；不能仅凭日志缺失认证OpenAI安全规则。研究产物里的LOCAL_TOOL_REFUSAL标签和Agent转述也不能替代原始拒绝来源。
