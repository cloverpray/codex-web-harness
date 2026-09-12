# Installation and explicit Web profiles / 安装与显式 Web 模式

## 1. Install / 安装

Use a matching installer from this repository's Releases. Preview packages are also downloadable from successful CI runs (GitHub sign-in may be needed for Actions artifacts). Check `checksums.txt` before installing. Windows packages are unsigned unless the release explicitly says otherwise; macOS build signatures are not a claim of Apple notarization.

从本仓库 Releases 选择对应系统安装包。预览版也可从成功的 CI run 获取（Actions 产物可能需要登录 GitHub）。核对 `checksums.txt`。除非发行说明明确注明，Windows 包没有发行者签名，macOS 构建签名不等于 Apple 公证。

Install Codex separately. Sign in through the launcher's embedded browser, finish its setup and run the browser check. Browser-only mode cannot execute local Codex tools. Full mode requires the MCP/Tunnel setup and a successful runtime verification; follow the launcher's instructions for the current connector name and account capabilities.

另行安装 Codex，在启动器内置浏览器登录并完成设置与浏览器检查。Browser-only 模式不能执行本地工具；Full 模式需要完成 MCP/Tunnel 配置并通过运行时验证。连接器名称与账户能力按当前启动器指引核对。

## 2. Opt in with a profile / 使用 profile 按需启用

This preview preserves upstream setup behavior unless an explicit Web profile is configured. Do not assume that installing the app alone leaves a pre-existing global route untouched. The profile migration was exercised with Codex 0.154's profile-v2 files and `codex debug models --bundled`; other CLI versions need compatibility verification.

本预览版未配置 Web profile 时仍保留上游设置行为。不要假设仅安装应用就已切换为 profile。迁移已在 Codex 0.154 的 profile-v2 文件及 `codex debug models --bundled` 上验证，其他 CLI 版本需要核对兼容性。

After setting up the launcher:

1. Finish active Web tasks.
2. If a global bridge route is connected, disconnect it in Launcher so its original assignment is restored.
3. Quit Launcher.
4. From this source checkout, after the locked dependencies are installed, run:

```bash
bun run scripts/migrate-web-profile.ts web
```

5. Reopen Launcher. Select High explicitly when starting Codex:

```bash
codex -p web -m chatgpt-web/high -c model_reasoning_effort=high
```

完成启动器设置后：结束活任务；如全局桥接路由仍连接，先在启动器断开并恢复原配置；退出启动器；在已安装锁定依赖的源码目录运行上述迁移命令，再重新打开启动器。

The script uses the current user's config directories, creates `web.config.toml` and a dedicated model catalog, snapshots the files it owns, and refuses to overwrite an existing profile or migrate a still-connected global route. It does not silently overwrite a newer user value. An existing profile needs inspection, not deletion or forced reinstallation.

脚本根据当前用户目录创建 `web.config.toml` 和独立模型目录，备份它负责的配置，并拒绝覆盖已有 profile 或直接迁移仍连接的全局路由。遇到已有配置应核对，不要直接删除或强制覆盖。

## 3. Resume / 恢复

```bash
codex -p web resume YOUR_SESSION_ID
```

Keep Launcher running. First recovery of a large history may require an additional summarization turn. Check existing job handles before retrying experiments. Copying a session to a different OS does not translate its workspace paths; move project data separately and explicitly re-establish the target working directory and permissions.

保持启动器运行。较长历史首次恢复可能需要额外摘要回合。实验中断先查原句柄，避免重复提交。迁移会话到其他系统不会自动转换工作目录路径，需要单独迁移项目并核对目标目录与权限。

## 4. Optional teacher / 可选教师

The application supports available Web model routes; it does not impose a particular research split. Optional templates in `extras/research` demonstrate a low-frequency evidence-only teacher. Install those only if wanted and test the native hook boundary before using private research tasks.

程序不强制某种研究分工。`extras/research` 提供可选的低频、仅阅读证据的教师模板；按需安装，并先验证原生钩子的限制是否有效。
