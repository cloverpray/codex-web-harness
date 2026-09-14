import {test,expect} from "bun:test";
import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {observeMcpTransport} from "../src/adapters/chatgpt-web/mcp-transport-diagnostics";

test("SDK validation failures remain observable without private request/result bodies",async()=>{
 const events: unknown[]=[];const sent: unknown[]=[];let received:unknown;
 const transport:Transport={start:async()=>{},close:async()=>{},send:async m=>{sent.push(m)}};
 observeMcpTransport(transport,(event,fields)=>events.push({event,...fields}));
 transport.onmessage=m=>{received=m};await transport.start();
 const request={jsonrpc:"2.0" as const,id:42,method:"tools/call",params:{name:"codex_exec",arguments:{cmd:"private command",turn_token:"secret"}}};
 transport.onmessage!(request);
 const response={jsonrpc:"2.0" as const,id:42,error:{code:-32602,message:"private validation detail"}};
 await transport.send(response);
 expect(received).toBe(request);expect(sent[0]).toBe(response);
 expect(events).toHaveLength(2);expect(events[1]).toMatchObject({event:"protocol_response",outcome:"protocol_error",protocolErrorCode:-32602});
 expect(JSON.stringify(events)).not.toMatch(/private|secret/);
});

test("protocol logging failure never prevents normal SDK dispatch",async()=>{
 let received=false,sent=false;
 const transport:Transport={start:async()=>{},close:async()=>{},send:async()=>{sent=true}};
 observeMcpTransport(transport,()=>{throw Error("log failed")});
 transport.onmessage=()=>{received=true};await transport.start();
 transport.onmessage!({jsonrpc:"2.0",id:1,method:"tools/call"});
 await transport.send({jsonrpc:"2.0",id:1,result:{isError:true}});
 expect(received&&sent).toBe(true);
});

test("failed sends never claim delivery and closure retains pending count", async () => {
 const events: any[]=[]; const failure=Error("private error"); let closes=0; let errors=0;
 const transport:Transport={start:async()=>{},close:async()=>{},send:async()=>{throw failure}};
 observeMcpTransport(transport,(event,fields)=>events.push({event,...fields}));
 transport.onclose=()=>{closes++};transport.onerror=()=>{errors++};await transport.start();
 transport.onmessage!({jsonrpc:"2.0",id:0,method:"tools/call"});
 await expect(transport.send({jsonrpc:"2.0",id:0,result:{}})).rejects.toBe(failure);
 transport.onerror!(failure); transport.onclose!();
 expect(events.some(e=>e.event==="protocol_response")).toBe(false);
 expect(events.find(e=>e.event==="protocol_send_failed")).toMatchObject({requestSequence:1});
 expect(events.find(e=>e.event==="transport_closed")).toMatchObject({pendingCount:1});
 expect(closes).toBe(1);expect(errors).toBe(1);expect(JSON.stringify(events)).not.toContain("private");
});

test("reused wire IDs have distinct sequences and terminal errors preserve raw response", async () => {
 const events:any[]=[];const sent:any[]=[];
 const transport:Transport={start:async()=>{},close:async()=>{},send:async m=>{sent.push(m)}};
 observeMcpTransport(transport,(event,fields)=>events.push({event,...fields}));await transport.start();
 for(const code of [-32600,32600]) {
  transport.onmessage!({jsonrpc:"2.0",id:0,method:"tools/call"});
  const response={jsonrpc:"2.0" as const,id:0,error:{code,message:"Session terminated",data:{private:"details"}}};
  await transport.send(response);expect(sent.at(-1)).toBe(response);
 }
 const responses=events.filter(e=>e.event==="protocol_response");
 expect(responses.map(e=>e.requestSequence)).toEqual([1,2]);
 expect(responses.every(e=>e.reason==="session_terminated"&&e.policyVerdict==="unknown")).toBe(true);
 expect(JSON.stringify(events)).not.toContain("private");
});

test("lifecycle correlation resolves only the pending invocation", async () => {
 const transport:Transport={start:async()=>{},close:async()=>{},send:async()=>{}};
 let hash="";const lookup=observeMcpTransport(transport,(event,fields)=>{if(event==="protocol_received") hash=String(fields.requestHash)});
 await transport.start();transport.onmessage!({jsonrpc:"2.0",id:0,method:"tools/call"});
 expect(lookup(hash)).toBe(1);
 await transport.send({jsonrpc:"2.0",id:0,result:{}});expect(lookup(hash)).toBeUndefined();
 transport.onmessage!({jsonrpc:"2.0",id:0,method:"tools/call"});expect(lookup(hash)).toBe(2);
 transport.onclose!();expect(lookup(hash)).toBeUndefined();
});
