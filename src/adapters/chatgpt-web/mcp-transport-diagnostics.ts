import { createHash } from "node:crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

/** Observe transport boundaries without retaining arguments, result bodies or raw exceptions. */
export function observeMcpTransport(transport: Transport, emit: (event: string, fields: Record<string, unknown>) => void): (requestHash: string) => number | undefined {
  const pending = new Map<string, number>();
  let sequence = 0;
  const key = (id: unknown) => createHash("sha256").update(JSON.stringify(id) ?? "undefined").digest("hex").slice(0, 12);
  const log = (event: string, fields: Record<string, unknown>) => { try { emit(event, fields); } catch {} };
  const start = transport.start.bind(transport);
  transport.start = async () => {
    const receive = transport.onmessage;
    const closed = transport.onclose;
    const failed = transport.onerror;
    transport.onclose = () => {
      log("transport_closed", { origin: "mcp_transport", pendingCount: pending.size, policyVerdict: "unknown" });
      pending.clear();
      closed?.();
    };
    transport.onerror = error => {
      log("transport_error", { origin: "mcp_transport", pendingCount: pending.size, policyVerdict: "unknown" });
      failed?.(error);
    };
    transport.onmessage = (message, extra) => {
      if ("method" in message && message.method === "tools/call" && "id" in message) {
        const requestHash = key(message.id);
        const requestSequence = ++sequence;
        if (pending.has(requestHash)) log("protocol_id_reused_while_pending", { requestHash, requestSequence });
        pending.set(requestHash, requestSequence);
        if (pending.size > 256) pending.delete(pending.keys().next().value!);
        log("protocol_received", {requestHash, requestSequence, origin:"mcp_stdio_before_sdk_validation"});
      }
      receive?.(message, extra);
    };
    await start();
  };
  const send = transport.send.bind(transport);
  transport.send = async (message, options) => {
    const requestHash = "id" in message && !("method" in message) ? key(message.id) : undefined;
    const requestSequence = requestHash === undefined ? undefined : pending.get(requestHash);
    try {
      await send(message, options);
    } catch (error) {
      log("protocol_send_failed", {requestHash, requestSequence, origin:"mcp_transport", policyVerdict:"unknown"});
      throw error;
    }
    if (requestHash !== undefined && requestSequence !== undefined && "id" in message && !("method" in message)) {
      if (pending.get(requestHash) === requestSequence) pending.delete(requestHash);
      const result = "result" in message ? message.result : undefined;
      log("protocol_response", {requestHash, requestSequence, origin:"mcp_sdk_response",
        delivery: "transport_send_completed",
        outcome: "error" in message ? "protocol_error" : result?.isError === true ? "tool_reported_error" : "returned",
        ...("error" in message ? {protocolErrorCode: message.error.code,
          reason: Math.abs(message.error.code) === 32600 && /^Session terminated[.!]?$/i.test(message.error.message.trim())
            ? "session_terminated" : "unclassified_protocol_error"} : {}), policyVerdict:"unknown"});
    }
  };
  return requestHash => pending.get(requestHash);
}
