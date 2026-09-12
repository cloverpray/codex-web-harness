/** One-time local migration after quitting Launcher. Never writes the native config. */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { getConfigDir, getConfigPath, loadConfig, saveConfig } from "../src/config";
import { findTopLevelAssignment, splitLines } from "../src/codex-integration-document";
import { getCodexHome, getCodexJournalPath, getCodexJournalRecoveryPath, installCodexIntegration, inspectCodexIntegration } from "../src/codex-integration";
import { getCodexModelsCachePath, restoreFileSnapshot, snapshotFile } from "../src/codex-integration-shared";
import { augmentNativeModelCatalog, getProfileCatalogTemplatePath, getProfileModelCatalogPath, syncProfileModelCatalog } from "../src/model-catalog";

const profile = process.argv[2] ?? "web";
if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(profile)) throw new Error("Invalid profile name");
const config = loadConfig();
const bundled = spawnSync("codex", ["debug", "models", "--bundled"], { encoding: "utf8", timeout: 15_000 });
if (bundled.status !== 0) throw new Error("Could not read the local Codex bundled model catalog");
const template = JSON.parse(bundled.stdout);
augmentNativeModelCatalog(template, config); // Validate before changing any configuration.
if (config.codexConfigProfile) throw new Error("A managed Codex profile is already configured");
const basePath = join(getCodexHome(), "config.toml");
const nativeBefore = readFileSync(basePath, "utf8");
if (findTopLevelAssignment(splitLines(nativeBefore), "openai_base_url").present) {
  throw new Error("Disconnect the existing global bridge route before migrating to an opt-in profile");
}
const target = join(getCodexHome(), `${profile}.config.toml`);
if (existsSync(target)) throw new Error(`Refusing to replace an existing profile: ${target}`);
const paths = [getConfigPath(), getCodexJournalPath(), getCodexJournalRecoveryPath(), target, getCodexModelsCachePath(), getProfileCatalogTemplatePath(), getProfileModelCatalogPath()];
const snapshots = paths.map(path => snapshotFile(path));
const backup = join(getConfigDir(), "backups", `profile-${profile}-${Date.now()}`);
mkdirSync(backup, { recursive: true, mode: 0o700 });
for (const [index, path] of paths.entries()) {
  if (!existsSync(path)) continue;
  const destination = join(backup, String(index));
  copyFileSync(path, destination);
  chmodSync(destination, 0o600);
}
writeFileSync(join(backup, "paths.json"), JSON.stringify(paths, null, 2), { mode: 0o600 });
try {
  mkdirSync(join(getConfigDir(), "codex"), { recursive: true, mode: 0o700 });
  writeFileSync(getProfileCatalogTemplatePath(), JSON.stringify(template), { mode: 0o600 });
  syncProfileModelCatalog(config);
  writeFileSync(target, `# Opt in with: codex -p ${profile}\n`
    + `model = ${JSON.stringify(config.proAvailable ? "chatgpt-web/pro" : "chatgpt-web/medium")}\n`
    + 'model_provider = "chatgpt_web_harness"\n\n'
    + `model_catalog_json = ${JSON.stringify(getProfileModelCatalogPath())}\n\n`
    + '[model_providers.chatgpt_web_harness]\n'
    + 'name = "ChatGPT Web Harness"\n'
    + `base_url = "http://${config.host}:${config.port}/v1"\n`
    + 'wire_api = "responses"\nrequires_openai_auth = false\nsupports_websockets = false\n', { mode: 0o600 });
  // Both old journal copies are archived above. Carrying either into the new
  // target would correctly fail the cross-config ownership check.
  rmSync(getCodexJournalPath(), { force: true });
  rmSync(getCodexJournalRecoveryPath(), { force: true });
  const next = { ...config, codexConfigProfile: profile };
  saveConfig(next);
  installCodexIntegration(next);
  const status = inspectCodexIntegration();
  if (status.errors.length) throw new Error(status.errors.join("; "));
  if (readFileSync(basePath, "utf8") !== nativeBefore) throw new Error("Native config changed concurrently during migration");
  console.log(JSON.stringify({ profile, configPath: target, backup, nativeConfigUnchanged: true, errors: status.errors }, null, 2));
} catch (error) {
  const failures: string[] = [];
  for (const snapshot of snapshots.reverse()) {
    try { restoreFileSnapshot(snapshot); } catch (rollback) { failures.push(String(rollback)); }
  }
  if (failures.length) throw new Error(`${String(error)}; rollback failures: ${failures.join("; ")}; backups: ${backup}`);
  throw error;
}
