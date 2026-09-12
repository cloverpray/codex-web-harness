import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dir, "..");
const path = resolve(root, "release-source.json");
const metadata = JSON.parse(readFileSync(path, "utf8"));
const repository = process.argv[2];
if (!repository || repository === "OWNER/REPOSITORY" || !/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error("Pass the destination GitHub OWNER/REPOSITORY");
}
const replacements = metadata.configuration_files.map((file: string) => {
  const target = resolve(root, file);
  if (!target.startsWith(root + "/") && !target.startsWith(root + "\\")) throw new Error("Path escapes source root");
  return [target, readFileSync(target, "utf8").split(metadata.repository).join(repository)];
});
for (const [target, content] of replacements) writeFileSync(target, content);
metadata.repository = repository;
writeFileSync(path, JSON.stringify(metadata, null, 2) + "\n");
console.log(`Release repository configured: ${repository}`);
