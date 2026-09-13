# 状态提交与样本一致性

由唯一状态写入者使用；不因这里有维护命令就接管另一个仍在运行的主线程。沿用已有研究合同，不更新冻结产物的哈希来绕过验收。

## 检查点提交

已有检查点采用显式 run_id 且 manifest 是路径到 SHA-256 的 JSON 映射时，可用 `scripts/checkpoint_commit.py DIRECTORY --proposed STAGED_CHECKPOINT.json --expected-checkpoint-sha256 OLD_CP_SHA --expected-manifest-sha256 OLD_MANIFEST_SHA --artifact PATH`。先核对实际结果与活句柄，再生成 staged 检查点；artifact 仅列本包已完成产物，不遍历全目录。预期哈希来自本轮已读的原文件。工具只维护检查点与其 manifest，不改 runtime 状态，不修改 artifact。

工具用协作锁、事务标记和文件替换提交。它不是跨文件原子事务，也不能替代唯一写入权。旧哈希变化则拒绝；发生半提交，快照显示 transaction_pending。确认没有其他写入者、核对事务与当前结果后可 `--recover`；当前文件已出现第三个版本或证据变化时拒绝恢复，需要主执行者对账。进程被强制杀死可能留下锁；不能仅凭锁存在时间自动删除。未知格式/相对路径别名先按原工作区明确规范化，不猜路径归属。不要无条件重算全部历史 manifest。

出现网页安全审查拒绝时保留“提交未完成”的真实状态，记录 trace/错误类别和已有产物；不换工具绕过同类拒绝。拒绝源尚不明确时不要声称本地命令执行失败或研究被证伪。

## 共享样本入口

同一冻结实验族从已有权威构造器一次生成机会 ID、fillable、mature 和未成交现金样本；后续诊断导入该构造器或复用对应冻结产物，避免复制筛选表达式。复用已有冻结证据即可，不强制重算历史实验。

如需确定性比对，可将两个入口导出的最小 JSON 交给 `scripts/cohort_guard.py FROZEN.json CURRENT.json`。格式为 `{"contract_sha256":"...","data_sha256":"...","rows":[{"opportunity_id":"...","fillable":true,"mature":true}]}`。脚本检查合同/数据身份、重复机会、全体 ID 和成交/成熟标记；顺序变化可接受，漏样本、额外样本或 mask 变化会拒绝。选择原合同要求的全部机会，不能只导出相同交集来通过校验。该校验不证明收益计算、PIT 或完整账户合格。

## Harness 成本观察

`harness_metrics.py LAUNCHER_LOG --since UTC_TIMESTAMP` 只读汇总请求体积、会话复用、工具排队至结果时长和网页拒绝词观测。未部署相应日志版本时体积为 null，不推算为零。网页出现拒绝词不证明拒绝来源；结合 trace 与 broker 分发记录判断。重叠区间不能相加成墙钟时间，编译文本字节不是计费 token。
