# Optional research helpers / 可选研究组件

These files are not installed or activated by the application. They do not contain a research campaign, data, credentials, or a fixed Alpha direction.

这些文件不随应用自动安装，不含研究 RUN、数据或凭据，也不限定涨停接力等方向。

- `research_snapshot.py`: read-only, bounded persisted RUN/checkpoint snapshot with source hashes. Requires Python 3.9+ and the documented A-share discovery JSON layouts; it is not a general parser for arbitrary project state.
- `teacher_packet.py`: selected JSON pointers or line ranges plus SHA-256 evidence, with explicit output budgets.
- `pro_teacher.example.toml`: optional evidence-only Web Pro role. Change the model provider to the Web provider configured on the target machine.
- `pro_teacher_evidence_only.py`: native PreToolUse hook that denies tools only when native role metadata identifies `pro_teacher`.

```bash
python research_snapshot.py --run-dir PATH_TO_RUN --checkpoint PATH_TO_CHECKPOINT
python teacher_packet.py PATH_TO_PACKET_SPEC
```

Both utilities write only to stdout; redirect to a file only where intended. Snapshot freshness checks are limited: it does not replay the ledger or establish research qualification. Do not call a state-writing runtime command merely to gather a snapshot.

两个采集脚本只输出到 stdout；快照不重算账本、不证明研究资格。不要为采集而调用会写状态的 runtime 命令。

Teacher default: the main executor proceeds independently. Consult only for a materially new major question/evidence that the executor cannot reliably resolve; do not consult once per turn or merely because another candidate/data route failed. One consultation returns the complete work package, routing and conditions for reopening.

教师默认低频：主执行者独立推进；只对自行分析后仍无法可靠决定的重大新问题/证据咨询。不因每个 turn、每次失败或再次缺少假设触发。一次返回完整工作包、分流和重开条件。

## Hook integration / 钩子集成

Do not assume copying the TOML enforces read-only permissions. Configure a **global** native PreToolUse hook using the target CLI's documented hook schema, with an absolute path to a verified Python interpreter and the supplied hook script. The role itself disables shell/apps/delegation, while the global hook handles other tool paths. Preserve the machine's existing hooks and complete its native hook-trust process. Never copy a trust hash or interpreter path from another machine.

不要假设复制 TOML 就形成只读边界。按目标 CLI 的钩子 schema 配置全局 PreToolUse，使用目标机器已验证 Python 和脚本的绝对路径，保留其他钩子，并完成原生信任流程。不要复制别处的解释器路径或信任哈希。

Before using the role, test that ordinary main-agent tools still work and teacher exec/patch/goal/delegation attempts cannot execute. Test with disposable fixtures, not live research. If hooks do not enforce the boundary, leave the optional role disabled.

### Teacher dispatch hardening

The native PreToolUse helper now requires explicit roles for Web Pro subagents and rejects full-history Pro fallback, keeps `pro_teacher` model/effort role-owned, and enforces a 16000-byte evidence packet. It blocks agent-driven interruption of pending teachers; finished/aborted handles can be closed after collecting their result. Explicit cancellation remains available through the native user interface. `wait_agent` timeout is only a polling result.

For migrating a previously misconfigured generic teacher, a local `$CODEX_HOME/hooks/teacher-protected-handles.json` may list its exact session UUID. This file is machine-local state: do not publish it. The helper also denies tools from those listed sessions. New correctly typed teacher sessions are recognized using native role metadata. Hook integration must be validated on the target Codex version; changing a script does not demonstrate that an already-running process reloaded its hook configuration.

教师角色失败或线程满时不得降级；先收集完成结果、关闭不用的已完成句柄，或保存待提交证据包。55 秒等待超时不授权中断。主执行者保持唯一研究状态写入权。上述规则与研究方向无关。

For an already-running Web executor, `hooks/web-bounded-output-handles.json` may list exact session UUIDs to reject native command output requests above 8000 tokens immediately. Native sessions outside this local list are unchanged. New Web bridge dispatch enforces the bound independently of that migration list. Do not publish either local handle file.
