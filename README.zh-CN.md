# Codex Web Harness

**让网页里的 GPT，动手写代码。把已有的 ChatGPT 额度，用到真实项目里。**

[English](README.md) · [安装与模式配置](docs/GETTING_STARTED.md) · [构建与发布](docs/BUILDING.md) · [故障排查](TROUBLESHOOTING.md)

[![CI](https://github.com/cloverpray/codex-web-harness/actions/workflows/ci.yml/badge.svg)](https://github.com/cloverpray/codex-web-harness/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![预览版](https://img.shields.io/badge/status-alpha-orange.svg)](docs/VALIDATION.md)

![让网页里的 GPT，动手写代码](assets/readme/hero-zh.png)

ChatGPT 已经订阅了，写项目时还在来回粘贴代码？这个项目把网页里的模型接到 Codex 任务中，让它读取选定文件、修改代码、运行权限允许的命令，再根据测试结果继续做事。

你在终端里提需求，模型通过网页推理，工具在任务环境中执行。这个非官方启动器负责把它们接起来。

基于 [miuuyy/codex-chatgpt-web](https://github.com/miuuyy/codex-chatgpt-web)，保留原许可证与贡献者归属。[来源与改动](docs/CHANGES.md)。本项目与 OpenAI 无隶属关系。

## alpha.37：离线也能配置，连接器丢失可恢复

首次欢迎页即可配置代理，无需先登录；GitHub 和 X 外链改为可选。旧 ChatGPT 网页丢失连接器时，确认尚未发送且没有工具活动后，允许一次携带完整上下文的新网页恢复。这条恢复路径不会重发已执行任务或工具拒绝。

Linux 上已用真实 High Goal 验收连续三轮原生工具调用。新网页兼容恢复比正常复用更费上下文；尚未确认来源的上游安全拒绝不在本次修复结论内。

[下载 alpha.37](https://github.com/cloverpray/codex-web-harness/releases/tag/v5.0.7-alpha.37) · [Network proxy / 代理配置](docs/NETWORK_PROXY.md)

## alpha.14：长任务，把上下文留给下一步

一份长测试日志、一次大范围仓库搜索，就可能塞进数万字符。任务还没推进多少，上下文已经快满了。**这次更新让模型先看短预览，需要细节时再按范围读取保存的结果**，减少大段成功输出在工具可用的历史重建中占用的空间。

| 这次改了什么 | 对开发者有什么用 |
|---|---|
| 大输出预览与结果文件 | 收到的结果保存在磁盘，需要哪段读哪段，不用为了找剩余输出重跑命令。错误和运行中的任务句柄保留完整。 |
| 上下文指标与有界 token 计数缓存 | 分清准备发送的文本大小与上下文估算增长；相同文本不用反复计算 token。 |
| 更具体的错误回传 | 区分本地参数拒绝、无效令牌、命令执行失败与传输中断，减少把所有故障都当成“安全拒绝”的误判。 |
| 前置步骤失败保护 | 支持的 POSIX shell 中，多行 `codex_exec` 默认加 `set -e`；修复步骤出现未处理的失败时，停止同一次调用里的后续命令。 |

**离线回放：工具结果从 220,165 降到 49,427 估算 token，减少 77.6%。** 样本共 45 个结果，其中 22 个改成预览。这是结果表示层面的测量：继续展开会增加用量，不代表整个任务省了同样比例的 token，也不代表提速或研究质量提升。原生工具已经截掉的内容无法补回；只读模型和正式压缩请求仍保留原始证据。

[下载 alpha.14：Windows / Linux / macOS](https://github.com/cloverpray/codex-web-harness/releases/tag/v5.0.7-alpha.14) · [输出预览的具体行为](docs/CONTEXT_OUTPUTS.zh-CN.md) · [四平台构建记录](https://github.com/cloverpray/codex-web-harness/actions/runs/34764766139)

## 网页额度也能拿来干活，少一份 API 开销

用 GPT-6 这类模型反复读代码、排查问题、跑实验，按 token 付费的账单很容易累积。既然账户里还有可用的 ChatGPT 网页额度，就可以把它用在这些任务上。**走本项目的 Web 推理路线，不为这部分推理另付模型 API token 费用。**

所谓“白嫖”，这里指的是把已有额度用足。订阅费和账户限额仍然存在，免费账户也不会因此获得 Pro；本地工具所需的 Full 模式还要单独完成配置。需要比较 API 成本，可以直接看 [GPT-6 Astra 官方现价](https://developers.openai.com/api/docs/models/gpt-6-astra)，这里不放容易过期的价格截图。

原生 Codex 本身也支持[使用 ChatGPT 套餐](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。这个项目的特色，是让你在 Codex 任务中选择**网页版推理路线及账户可用档位**。

## 能帮开发者做什么？

| 开发任务 | 如何使用 |
|---|---|
| 排查仓库问题 | 让网页模型读取选定文件、运行权限允许的本地命令，并结合测试结果继续分析。 |
| 审查或实现代码修改 | 保留 Codex 终端、任务上下文和工具展示，按需选择可用的网页推理档位。 |
| 持续调查复杂问题 | 在支持的压缩流程后恢复任务，关键检查点和产物仍保存在磁盘。 |
| 获取第二意见 | 可选用 [Pro 教师](extras/research)阅读紧凑证据包，由主执行者承担全部写入。 |
| 保留原生 Codex | 通过显式 Web profile 选择路线，不要求所有会话都经过网页。 |

可以先拿一个需要读几份文件、跑几轮测试的 bug 试试，或者让它处理需要较多思考的调查任务。浏览器传输有额外开销；如果任务全是细碎的顺序工具调用，原生 Codex 通常更合适。

## 原版的优势，我们增加的改进

原版提供了核心能力：跨平台桌面启动器、内置 ChatGPT 登录、网页推理档位、回传 Codex 的流式输出，以及通过 MCP 使用当前任务工具。本分支是在这些能力上继续改进。

| 方面 | 上游 v5.0.6 基础能力 | 本预览版新增 |
|---|---|---|
| 本地工具工作流 | 通过 MCP 连接 Codex 任务工具 | 在发现、分发和嵌套执行处补充递归保护 |
| 模型路由 | 启动器管理模型集成 | 显式 Web profile 与独立模型目录 |
| 长会话 | 已有压缩和任务续接 | 补齐 Codex 0.154 普通 Responses 文本压缩恢复 |
| 上下文传输 | 与任务绑定的可复用会话 | 省略不变静态指令及已确认历史前缀，新增可按需展开的大输出预览 |
| 故障处理 | 浏览器及桥接生命周期管理 | 稳定回复身份恢复、持久 MCP 诊断及前置步骤失败保护 |
| 教师协调 | 固定30秒 Web 等待 | 无工具教师可用有界55秒选项，工作子模型保留30秒建议 |

这些改动围绕一件实际的事：让长任务更容易做完。少传重复上下文，接续支持的压缩会话，在递归调用拖成超时前报错。目前还没有相对上游或原生 Codex 的整体提速数据。[改动与来源](docs/CHANGES.md) · [验证范围](docs/VALIDATION.md)。

## 工作方式

![显式选择原生与 Web 路线](assets/readme/workflow.svg)

<details>
<summary><strong>查看继承的启动器界面演示</strong></summary>

![上游项目的启动器界面演示](assets/demo.gif)

该演示来自上游项目，保留归属说明。它不是本分支新增压缩或耗时测试的录像；当前行为和限制以下文为准。

</details>

## 快速开始

1. 在 [Releases](https://github.com/cloverpray/codex-web-harness/releases) 下载对应的预览版安装包。
2. 启动应用，在内置浏览器中登录 ChatGPT。
3. 完成浏览器验证和模型设置。需要本地工具时，按启动器指引完成 MCP/Tunnel 配置，并运行 **Verify runtime**。
4. 按[模式配置指南](docs/GETTING_STARTED.md)建立显式 Web profile。**仅安装应用不会自动创建 `web` profile。**

配置完成后：

```bash
# 沿用原生配置
codex

# 显式使用 Web High
codex -p web -m chatgpt-web/high -c model_reasoning_effort=high

# 账户可用时使用 Web Pro
codex -p web -m chatgpt-web/pro -c model_reasoning_effort=ultra

# 恢复原 Web 会话
codex -p web resume YOUR_SESSION_ID
```

网页档位由模型路由决定，账户和界面决定可用范围。Web High／Pro 不代表与原生 Codex 使用完全相同的模型快照或推理预算。

## 平台与验证状态

| 平台 | 安装包 | 本分支验证范围 |
|---|---|---|
| Linux x64 | AppImage | 已做本地登录后的真实工作流验证；CI 构建与冒烟测试 |
| Windows x64 | `.exe` 安装器 | CI 构建及冒烟通过；真实账户流程待验证 |
| macOS arm64／x64 | `.dmg`、`.zip` | 两种架构 CI 构建及冒烟通过；真实账户流程待验证 |

**alpha.14 已通过[四个平台的 CI 构建与启动检查](https://github.com/cloverpray/codex-web-harness/actions/runs/34764766139)。** 本地验证为运行时 756 项通过、1 项平台跳过，Launcher 297 项通过，可选研究辅助工具 23 项通过。Windows/macOS 登录真实账户后的工作流仍需人工验证；这些检查不代表已达到原生 Codex 的速度或研究质量。详见 [VALIDATION.md](docs/VALIDATION.md)。

## 从源码运行

需要 Bun 1.4.0；启动器测试和打包还会使用 Node.js。

```bash
git clone https://github.com/cloverpray/codex-web-harness.git
cd codex-web-harness
bun install --frozen-lockfile
cd launcher
bun install --frozen-lockfile
cd ..
bun run app
```

跨平台打包和 GitHub Actions 见 [BUILDING.md](docs/BUILDING.md)。每个平台需在对应系统构建，因为安装包内含原生运行时。这里的可复现是指依赖锁定、步骤明确、可重新构建，不保证签名安装包逐字节一致。

## 使用边界

- 浏览器和 MCP 往返会增加延迟，工具密集任务可能明显慢于原生 Codex。
- 自动压缩生成摘要，不保证保留所有细节；任务状态以文件和已验证产物为准。
- token 用量为估算，不能作为计费或缓存命中的准确证据。
- 实验性 MCP 批处理工具仍默认关闭；可以使用现有原生命令合并独立读取。
- 本项目不消除订阅、用量或工作区限制。模型 API 密钥与 Full 模式 Tunnel 可能需要的凭据不是同一件事。
- 提示词和选定工具结果会发送至 ChatGPT，并非纯本地推理。网页界面变化可能影响兼容性。
- 可选教师配置需要在目标 Codex 版本验证钩子是否生效，不能仅凭“只读”标签判定权限已收窄。

## 参与改进

欢迎提交可复现问题、Windows/macOS 实测记录、脱敏耗时证据和针对性测试。请附操作系统、应用/Codex 版本及预期结果；不要上传凭据、浏览器资料或私人任务历史。

[贡献指南](CONTRIBUTING.md) · [安全报告](SECURITY.md) · [路线图](docs/ROADMAP.md)。如果对你的工作有帮助，欢迎 Star，让更多需要的人找到项目。

## 许可证

[MIT](LICENSE)，保留原作者版权及第三方许可说明。感谢上游项目及贡献者。
