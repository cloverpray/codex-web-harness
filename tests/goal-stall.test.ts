import { expect, test } from "bun:test";
import { CHATGPT_WEB_MODEL_ID } from "../src/adapters/chatgpt-web/model";
import type { CodexMessage, CodexParsedRequest } from "../src/types";
const goal = (): CodexMessage => ({ role: "user", timestamp: 0, content: '<codex_internal_context source="goal">Continue</codex_internal_context>' });
const answer = (text = "当前响应环境仍未提供可用 Codex Native 执行接口，无法访问本地工作区。"): CodexMessage => ({role: "assistant", timestamp: 0, phase: "final_answer", content: [{type: "text", text}]});
function request(rounds = 3): CodexParsedRequest {
 return {modelId: CHATGPT_WEB_MODEL_ID, options: {}, stream: true, context: {messages: [...Array.from({length:rounds},()=>[goal(),answer()]).flat(),goal()]}};
}
test("runtime guard ignores old history and counts only distinct observed completions", async()=>{
 const {GoalToolStallGuard}=await import("../src/adapters/chatgpt-web/goal-stall");
 const guard=new GoalToolStallGuard();const r=request(12);
 expect(guard.shouldStop("a",r)).toBeFalse();
 for(let i=0;i<3;i++){
  guard.observe("a",String(i),r,"Codex Native tools are unavailable",false);
  guard.observe("a",String(i),r,"Codex Native tools are unavailable",false);
  expect(guard.shouldStop("a",r)).toBe(i===2);
 }
 expect(guard.shouldStop("other",r)).toBeFalse();
 expect(new GoalToolStallGuard().shouldStop("a",r)).toBeFalse();
 guard.observe("a","tool-success",r,"Codex Native tools are unavailable",true);
 expect(guard.shouldStop("a",r)).toBeFalse();
 for(let i=0;i<3;i++)guard.observe("a",`again${i}`,r,"Codex Native tools are unavailable",false);
 const manual=request();manual.context.messages.push({role:"user",timestamp:0,content:"Resume after repair"});
 expect(guard.shouldStop("a",manual)).toBeFalse();
 expect(guard.shouldStop("a",r)).toBeFalse();
});

test("runtime stall counting excludes compaction, explicit tasks and ordinary answers", async()=>{
 const {GoalToolStallGuard}=await import("../src/adapters/chatgpt-web/goal-stall");
 const guard=new GoalToolStallGuard();const r=request();
 for(let i=0;i<4;i++)guard.observe("a",`compact${i}`,{...r,_compactionRequest:true},"Codex Native tools are unavailable",false);
 expect(guard.shouldStop("a",r)).toBeFalse();
 for(let i=0;i<4;i++)guard.observe("a",`normal${i}`,r,"The design comparison is complete.",false);
 expect(guard.shouldStop("a",r)).toBeFalse();
 guard.observe(undefined,undefined,r,"Codex Native tools are unavailable",false);
 expect(guard.shouldStop(undefined,r)).toBeFalse();
});
