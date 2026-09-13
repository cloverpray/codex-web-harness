import {test,expect} from "bun:test";
import {mkdtempSync,existsSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {failFastWebCommand} from "../src/adapters/chatgpt-web/command-fail-fast";

test.skipIf(process.platform === "win32")("failed repair cannot start dependent job",()=>{
 const dir=mkdtempSync(join(tmpdir(),"repair-sequence-"));
 try {const cmd=failFastWebCommand('missing_repair_program_codex_test_782\nprintf launched > launched.txt',{shell:"/bin/bash"});const r=spawnSync('/bin/bash',['-c',cmd],{cwd:dir,encoding:'utf8'});expect(r.status).toBe(127);expect(r.stderr).toContain('command not found');expect(existsSync(join(dir,'launched.txt'))).toBe(false);}
 finally {rmSync(dir,{recursive:true,force:true});}
});

test.skipIf(process.platform === "win32")("verified repair and explicit independent conditional checks can continue",()=>{
 const cmd=failFastWebCommand("if false; then echo unused; fi\nprintf verified\nprintf executed",{shell:"/bin/bash"});const r=spawnSync('/bin/bash',['-c',cmd],{encoding:'utf8'});expect(r.status).toBe(0);expect(r.stdout).toBe('verifiedexecuted');
});

test("unknown shells, Windows and single commands are not rewritten",()=>{
 const cmd='repair\nrun';expect(failFastWebCommand(cmd,{shell:'/bin/fish'})).toBe(cmd);expect(failFastWebCommand(cmd,{platform:'win32',shell:'bash'})).toBe(cmd);expect(failFastWebCommand('echo ok',{shell:'/bin/bash'})).toBe('echo ok');expect(failFastWebCommand('set -e\nrepair',{shell:'/bin/bash'})).toBe('set -e\nrepair');
});
