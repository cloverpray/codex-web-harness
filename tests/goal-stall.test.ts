import { expect, test } from "bun:test";
import { CHATGPT_WEB_MODEL_ID } from "../src/adapters/chatgpt-web/model";
import type { CodexMessage, CodexParsedRequest } from "../src/types";
import { repeatedUnverifiedToolUnavailability as stalled } from "../src/adapters/chatgpt-web/goal-stall";
const goal = (): CodexMessage => ({ role: "user", timestamp: 0, content: '<codex_internal_context source="goal">Continue</codex_internal_context>' });
const answer = (text = "当前响应环境仍未提供可用 Codex Native 执行接口，无法访问本地工作区。"): CodexMessage => ({role: "assistant", timestamp: 0, phase: "final_answer", content: [{type: "text", text}]});
function request(rounds = 3): CodexParsedRequest {
 return {modelId: CHATGPT_WEB_MODEL_ID, options: {}, stream: true, context: {messages: [...Array.from({length:rounds},()=>[goal(),answer()]).flat(),goal()]}};
}
test("third unsupported tool-unavailable answer stops the next automatic continuation",()=>{
 expect(stalled(request(2))).toBeFalse();
 expect(stalled(request(3))).toBeTrue();
 expect(stalled(request(12))).toBeTrue();
});
test("explicit user resumption, compaction and ordinary discussion are not stopped",()=>{
 const r=request(); r.context.messages[r.context.messages.length-1]={role:"user",timestamp:0,content:"I repaired the connector; continue."}; expect(stalled(r)).toBeFalse();
 expect(stalled({...request(),_compactionRequest:true})).toBeFalse();
 expect(stalled({...request(),_textCompactionRequest:true})).toBeFalse();
 const discussion=request(); discussion.context.messages[3]=answer("The next step is to compare two designs."); expect(stalled(discussion)).toBeFalse();
});
test("actual tool calls and results interrupt this unverified-claim detector",()=>{
 for (const isError of [true,false]) {
  const r=request();r.context.messages.splice(-2,0,{role:"toolResult",timestamp:0,toolCallId:"c1",toolName:"exec_command",isError,content:isError?"Session terminated":"exit 0"});expect(stalled(r)).toBeFalse();
 }
 const r=request();r.context.messages.splice(-2,0,{role:"assistant",timestamp:0,content:[{type:"toolCall",id:"c1",name:"exec_command",arguments:{cmd:"pwd"}}]});expect(stalled(r)).toBeFalse();
});
test("English missing-interface reports are also detected, but progress discussion is not",()=>{
 const r=request(); r.context.messages=r.context.messages.map(m=>m.role==="assistant"?answer("Codex Native tools are unavailable in this response."):m);expect(stalled(r)).toBeTrue();
});

test("adapter stops repeated automatic requests before leasing a browser or returning success", async()=>{
 const {createChatGptWebAdapter}=await import("../src/adapters/chatgpt-web/index");
 const {ChatGptBrowserWorker}=await import("../src/adapters/chatgpt-web/browser-worker");
 const provider={adapter:"chatgpt-web" as const,baseUrl:"browser://goal-stall-test",chatgptWeb:{localToolsEnabled:true,solAvailable:true,proAvailable:true}};
 const worker=ChatGptBrowserWorker.forProvider(provider);const original=worker.run;
 let starts=0;worker.run=async()=>{starts++;throw new Error("must not submit");};
 try {
  for(let i=0;i<2;i++){
   const events: import("../src/types").AdapterEvent[]=[];
   await createChatGptWebAdapter(provider).runTurn!(request(),{headers:new Headers()},e=>events.push(e));
   expect(events.filter(e=>e.type!=="heartbeat")).toEqual([expect.objectContaining({type:"error",code:"chatgpt_goal_no_tool_progress",retryable:false})]);
  }
  expect(starts).toBe(0);
 } finally {worker.run=original;}
});
