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
