# Build and release / 构建与发布

## Inputs / 构建输入

- Bun **1.4.0**, pinned in both workflows and checked by `scripts/check-version.ts`.
- Root and launcher `bun.lock`, installed with `--frozen-lockfile`.
- Native OS builds: Ubuntu 24.04 x64, Windows 2025 x64, macOS 15 arm64 / Intel runners.
- Node.js for Electron packaging and Node tests; CI runner images provide it.
- Linux: prepare compatible libnotify and the owned AppImage tools as shown in CI.

The runtime manifest records file hashes; installers have SHA-256 manifests and build metadata. Runner images, OS packages, archives, and signatures can change. This is a repeatable source build, not a guarantee of byte-for-byte reproducibility across machines.

依赖通过锁文件安装，Bun 版本固定；运行时记录文件哈希，CI 安装包附 SHA-256 与构建信息。Runner 镜像、系统包和签名仍可能变化，因此不承诺跨机器逐字节一致。

## Local / 本地

```bash
bun install --frozen-lockfile
cd launcher
bun install --frozen-lockfile
cd ..
bun run check-version
bun run verify
bun run app:package
bun run app:smoke
```

For Linux, run the prerequisite preparation steps from `.github/workflows/ci.yml` before packaging. `verify` includes dependency audits, runtime/launcher tests and type checks, renderer build, bundle generation and relocation smoke. `app:package` refuses cross-OS packaging because the runtime is native. Artifacts are copied to `launcher/artifacts/`.

Linux 打包前先运行 CI 中的系统依赖、libnotify 与 AppImage 工具准备步骤。`verify` 包含依赖审计、测试、类型检查、渲染器/运行时构建及运行时搬迁冒烟。安装包输出到 `launcher/artifacts/`；禁止跨系统拼装原生包。

## GitHub Actions

- **CI** runs on pushes to `main`, pull requests, and **Run workflow**. Four native jobs build and smoke-test installers, then upload `packages-<runner>` artifacts for 14 days.
- Each artifact contains packages, `BUILD_INFO.json` and `checksums.txt`.
- **Release** runs only on a `v*` tag matching the package version. It builds packages and runtime archives, adds licenses/installers, publishes checksummed assets. Hyphenated versions become prereleases.
- Forks configure their own repository via `bun run scripts/configure-release.ts OWNER/REPOSITORY`; CI also runs it with `github.repository`. Installer and updater URLs follow the configured repository, not upstream.

CI 在 main 推送、PR 或手动 Run workflow 时构建四个平台产物，保留14天。Release 仅在版本一致的 `v*` tag 上触发；含连字符的版本发布为预发布。Fork 应运行仓库配置脚本，CI 也会用当前仓库自动配置，避免更新回上游。

Do not publish account-bound fixtures, local session dumps or research artifacts. Authenticated Windows/macOS validation remains a separate release gate; a green packaging job does not prove a real ChatGPT tool turn.

不要发布登录资料、会话转储或研究产物。CI 打包通过不等于真实登录后的工具与压缩流程已通过。
