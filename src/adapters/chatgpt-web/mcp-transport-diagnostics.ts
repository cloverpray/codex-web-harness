import { createHash } from "node:crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

/** Observe SDK input/output boundaries without retaining tool arguments or result bodies. */
export function observeMcpTransport(transport: Transport, emit: (event: string, fields: Record<string, unknown>) => void): void {
  const pending = new Map<string, string>();
  const key = (id: unknown) => createHash("sha256").update(JSON.stringify(id) ?? "undefined").digest("hex").slice(0, 12);
  const log = (event: string, fields: Record<string, unknown>) => { try { emit(event, fields); } catch {} };
  const start = transport.start.bind(transport);
  transport.start = async () => {
    const receive = transport.onmessage;
    transport.onmessage = (message, extra) => {
      if ("method" in message && message.method === "tools/call" && "id" in message) {
        const requestHash = key(message.id);
        pending.set(requestHash, "tools/call");
        if (pending.size > 256) pending.delete(pending.keys().next().value!);
        log("protocol_received", {requestHash, origin:"mcp_stdio_before_sdk_validation"});
      }
      receive?.(message, extra);
    };
    await start();
  };
  const send = transport.send.bind(transport);
  transport.send = async (message, options) => {
    if ("id" in message && !("method" in message)) {
      const requestHash = key(message.id);
      if (pending.delete(requestHash)) {
        const result = "result" in message ? message.result : undefined;
        log("protocol_response", {requestHash, origin:"mcp_sdk_response",
          outcome: "error" in message ? "protocol_error" : result?.isError === true ? "tool_reported_error" : "returned",
          ...( "error" in message ? {protocolErrorCode: message.error.code} : {}), policyVerdict:"unknown"});
      }
    }
    await send(message, options);
  };
}
