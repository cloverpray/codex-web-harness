# code_web_harness_alpha 5.0.7-alpha.29

## 中文

### 本次更新
- **可选网络代理**：在安装页或设置页选择沿用现有设置、直接连接或自定义 HTTP/HTTPS 代理。浏览器与桌面更新使用所选代理，后台子进程接收代理环境变量，本地 Bridge 保持直连。
- **安装后继续连接 Harness**：不再把被动模型目录检测当作下一步的硬性条件。“重启 Codex”改为“重新检测模型”，点击不会重复安装。
- **诊断与恢复**：保留提交后的上游错误细节；改进传输诊断、原生压缩后环境记录认证，以及终止会话和上下文交接的重复重试处理。这些改动不保证消除所有上游服务错误。

### Windows 升级
彻底退出旧版 Launcher（包括托盘），运行本版本 Windows x64 `.exe` 安装包，使用原安装位置升级，通常无需先卸载。保留用户数据，避免手动删除配置目录。升级后重新打开；如启用自定义代理，填写本机代理软件的 HTTP/Mixed 地址（例如 `http://127.0.0.1:7890`，端口以实际配置为准），保存后再彻底退出并重开一次。

代理服务需自行提供；暂不支持仅 SOCKS 的端口或地址中携带账号密码。独立启动的原生 Codex 和外部浏览器不会被改动。默认模式保留现有设置；桌面系统代理不会自动转换成后台进程代理环境变量。

## English

### Changes
- **Optional network proxy:** choose existing settings, direct connection, or a custom HTTP/HTTPS proxy in Setup or Settings. Browser sessions and desktop updates use the selected proxy; child processes receive proxy environment variables. The local Bridge stays direct.
- **Continue setup after installation:** passive model-catalog detection no longer blocks Harness connection setup. “Check model detection” replaces the misleading “Restart Codex” action and does not reinstall.
- **Diagnostics and recovery:** preserve upstream errors after submission, improve transport diagnostics and authentication of native compacted environment records, and bound repeated retries for terminated sessions and context handoff. Upstream service failures remain possible.

### Upgrade
Fully quit the old Launcher, including its tray process, and install the new package in the same location. Windows users normally do not need to uninstall first; retain user data. Save proxy changes, then fully quit and reopen the app. Use an existing proxy service's HTTP/Mixed port; SOCKS-only endpoints and credentials embedded in proxy URLs are unsupported. Separately launched native Codex processes and external browsers are not reconfigured.

Local validation includes the 300-test Launcher suite, renderer typecheck/build, and Chromium/Bun proxy smoke checks with loopback bypass. Platform packaging and smoke checks run in GitHub Actions; these do not replace a Windows user-account and live-network test.
