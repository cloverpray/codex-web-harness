# Optional network proxy / 可选网络代理

Open **Setup** or **Settings → Network proxy**. Choose existing settings (default), direct connection, or a custom HTTP/HTTPS proxy. For a local proxy app, use its HTTP or Mixed endpoint, such as `http://127.0.0.1:7890`; the port is an example, not an automatically detected value. SOCKS-only endpoints and embedded usernames/passwords are not supported.

Save, then fully quit the Launcher from its tray menu and reopen it. Saving does not interrupt running tasks. Chromium sessions and desktop update downloads use the selected browser proxy. New Bun runtime and Tunnel child processes receive HTTP_PROXY/HTTPS_PROXY, with loopback excluded through NO_PROXY. Existing system settings are retained in the default mode; system browser settings alone are not automatically converted into subprocess environment settings. External browsers and separately started native Codex processes are not reconfigured. The proxy service must already be running; this application does not provide one or alter account eligibility, authentication or usage limits.

Local Chromium-session and Bun-fetch smoke checks each verified one request through a local test proxy and a separate loopback request sent directly. Windows end-to-end validation and a live Tunnel connection through the user's proxy remain to be verified on the target machine.

在「设置 Codex」或「设置 → 网络代理」中选择模式。自定义模式填写代理软件的 HTTP/Mixed 端口，保存后从托盘彻底退出并重新打开本软件。无需修改系统代理，也不会在保存时中断研究。暂不支持仅 SOCKS 的端口或带账号密码的代理地址。

## Setup flow change / 安装流程调整

Installing models and observing Codex's model-list request are separate states. Once installation succeeds, MCP setup is accessible while model detection remains pending. “Check model detection” observes existing health evidence; it does not reinstall, reset installation state, launch Codex, or pretend that Codex restarted. An actual model-list request still controls the verified indicator. Runtime errors, missing credentials and active-operation locks remain effective.

模型安装成功后即可进入 Harness 连接设置；无需等待被动模型检测。原来的“重启 Codex”操作改为“重新检测模型”，不会再次重装。模型检测状态继续如实显示。新版本发布前，已安装的 Windows 版本不会自动获得此改动。

Implementation references: [Electron ProxyConfig](https://www.electronjs.org/docs/latest/api/structures/proxy-config), [Bun fetch proxy](https://bun.com/reference/globals/BunFetchRequestInit/proxy).
