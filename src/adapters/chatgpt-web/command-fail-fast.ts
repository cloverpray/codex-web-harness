import { basename } from "node:path";

/** Preserve command bodies; enable native shell fail-fast only for known POSIX shells. */
export function failFastWebCommand(cmd: string, options: { platform?: string; shell?: string } = {}): string {
  if ((options.platform ?? process.platform) === "win32" || !cmd.includes("\n")) return cmd;
  const shell = options.shell ?? process.env.SHELL;
  if (!shell || !["bash", "sh", "dash", "zsh", "ksh"].includes(basename(shell))) return cmd;
  if (cmd.startsWith("set -e\n")) return cmd;
  // No pipefail: a bounded read such as rg | head can intentionally close a pipe early.
  // Explicit if/||/set +e handling remains under the caller's control.
  return `set -e\n${cmd}`;
}
