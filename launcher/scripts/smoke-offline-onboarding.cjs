// Run after build:renderer, with a desktop display (or xvfb-run on Linux).
// Uses isolated state and blocks external connections; never configures real Codex.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { _electron: electron } = require("playwright-core");

async function main() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "harness-offline-onboarding-"));
  const env = {
    ...process.env,
    CODEX_WEB_GPT_LAUNCHER_DATA_DIR: path.join(scratch, "launcher"),
    CODEX_CHATGPT_WEB_HOME: path.join(scratch, "core"),
    CODEX_HOME: path.join(scratch, "codex"),
    XDG_CONFIG_HOME: path.join(scratch, "config"),
    HTTP_PROXY: "http://127.0.0.1:9",
    HTTPS_PROXY: "http://127.0.0.1:9",
    http_proxy: "http://127.0.0.1:9",
    https_proxy: "http://127.0.0.1:9",
    NO_PROXY: "localhost,127.0.0.1,::1",
    no_proxy: "localhost,127.0.0.1,::1",
  };
  for (const key of ["ELECTRON_RUN_AS_NODE", "VITE_DEV_SERVER_URL", "ALL_PROXY", "all_proxy"]) delete env[key];
  let app;
  try {
    app = await electron.launch({
      executablePath: require("electron"),
      args: [path.resolve(__dirname, "../electron/main.cjs"), "--no-sandbox",
        "--proxy-server=http://127.0.0.1:9", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],
      env,
      timeout: 30_000,
    });
    const rendererUrl = require("node:url").pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href;
    // The embedded browser can attach before the shell; never click that surface.
    const deadline = Date.now() + 30_000;
    let page;
    while (!page && Date.now() < deadline) {
      page = app.windows().find(candidate => candidate.url() === rendererUrl);
      if (!page) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(page, "local launcher renderer did not load");
    page.setDefaultTimeout(15_000);
    await page.waitForSelector(".welcome");
    const initial = await page.evaluate(() => window.codexWebLauncher.snapshot());
    assert.equal(initial.state.onboardingComplete, false);
    assert.notEqual(initial.state.coreSetupComplete, true);
    // Emulate an unresponsive saved-session check: local configuration must remain usable.
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(820, 650);
      BrowserWindow.getAllWindows()[0].webContents.send("launcher:browser-state", {
        status: "loading", authenticated: false, message: "Offline startup probe",
      });
    });
    const panel = page.locator(".welcome .network-proxy-panel");
    await panel.locator("summary").click();
    await panel.locator("select").selectOption("custom");
    await panel.locator("input").fill("http://127.0.0.1:7890");
    await panel.getByRole("button", { name: "Save proxy settings", exact: true }).click();
    await panel.getByRole("status").waitFor();
    assert.deepEqual((await page.evaluate(() => window.codexWebLauncher.snapshot())).state.networkProxy,
      { mode: "custom", url: "http://127.0.0.1:7890" });

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("heading", { name: "ChatGPT interaction", exact: true }).waitFor();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("heading", { name: "Before we start", exact: true }).waitFor();
    // Do not open either external page. Exercise the real IPC completion handler.
    await page.getByRole("button", { name: "Open launcher", exact: true }).click();
    await page.waitForSelector(".welcome", { state: "detached" });
    const after = await page.evaluate(() => window.codexWebLauncher.snapshot());
    assert.equal(after.state.onboardingComplete, true);
    assert.equal(after.state.githubOpened, false);
    assert.equal(after.state.xOpened, false);
    assert.notEqual(after.state.coreSetupComplete, true);
    assert.notEqual(after.state.mcpSetupComplete, true);
    assert.notEqual(after.browser?.authenticated, true);
    const saved = JSON.parse(fs.readFileSync(path.join(scratch, "launcher/launcher-state.json"), "utf8"));
    assert.deepEqual(saved.networkProxy, { mode: "custom", url: "http://127.0.0.1:7890" });
    assert.equal(saved.onboardingComplete, true);
    console.log("OFFLINE_ONBOARDING_SMOKE_OK: proxy saved, external links optional, setup unverified");
  } finally {
    if (app) await app.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
