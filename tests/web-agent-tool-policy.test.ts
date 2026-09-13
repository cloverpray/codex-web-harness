import { test, expect } from 'bun:test';
import { assertWebAgentToolArguments as guard, webAgentToolGuardProgram } from '../src/adapters/chatgpt-web/agent-tool-policy';

test('teacher stays isolated, role-owned and UTF-8 bounded', () => {
  expect(() => guard('multi_agent_v1__spawn_agent', {agent_type:'pro_teacher', fork_context:false, message:'evidence'})).not.toThrow();
  for (const args of [
    {agent_type:'pro_teacher', fork_context:true, message:'evidence'},
    {model:'chatgpt-web/pro', fork_context:true},
    {model:'chatgpt-web/pro', fork_context:false},
    {agent_type:'pro_teacher', fork_context:false, model:'chatgpt-web/pro', message:'evidence'},
    {agent_type:'pro_teacher', fork_turns:'none', message:'中'.repeat(5334)},
  ]) expect(() => guard('multi_agent_v1__spawn_agent',args)).toThrow();
});
test('ordinary workers and unrelated third-party tools remain usable', () => {
  guard('spawn_agent',{agent_type:'worker',fork_context:false,message:'work'});
  guard('spawn_agent',{fork_context:true,message:'work'});
  guard('other_spawn_agent',{model:'chatgpt-web/pro',fork_context:true});
});
test('bounded shell output in direct and generated raw exec guard', () => {
  const raw = new Function(webAgentToolGuardProgram() + '; return assertWebAgentToolArguments;')();
  for (const fn of [guard, raw]) {
    fn('exec_command',{cmd:'rg --files',max_output_tokens:8000});
    for (const tool of ['exec_command', 'write_stdin']) {
      const args = {cmd:'pwd',max_output_tokens:28000};
      fn(tool,args);
      expect(args).toEqual({cmd:'pwd',max_output_tokens:8000});
      const bounded = {max_output_tokens:100}; fn(tool,bounded);
      expect(bounded.max_output_tokens).toBe(100);
    }
    expect(() => fn('exec_command',{max_output_tokens:Infinity})).toThrow('finite');
    expect(() => fn('spawn_agent',{fork_context:true,model:'chatgpt-web/pro'})).toThrow();
  }
});
