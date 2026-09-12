import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dir, "..");
const directory = resolve(root, "launcher/artifacts");
const info = {
  version: JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version,
  commit: process.env.GITHUB_SHA ?? null,
  repository: JSON.parse(readFileSync(resolve(root, "release-source.json"), "utf8")).repository,
  platform: process.platform, arch: process.arch, bun: Bun.version,
  runtimeBundle: JSON.parse(readFileSync(resolve(root, "launcher/build/runtime/manifest.json"), "utf8")).bundleId,
};
writeFileSync(resolve(directory, "BUILD_INFO.json"), JSON.stringify(info, null, 2) + "\n");
const files = readdirSync(directory).filter(file => file !== "checksums.txt").sort();
if (!files.some(file => /\.(exe|AppImage|dmg|zip)$/.test(file))) throw new Error("No installer artifacts");
writeFileSync(resolve(directory, "checksums.txt"), files.map(file =>
  `${createHash("sha256").update(readFileSync(resolve(directory, file))).digest("hex")}  ${file}\n`
).join(""));
