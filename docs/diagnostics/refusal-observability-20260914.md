# Refusal and transport diagnostics

This patch improves evidence collection. It does not bypass approval checks, reconstruct undisclosed upstream reasons, or automatically replay failed work.

## Findings

- A `protocol_response` entry was written before `transport.send` completed. A failed write could therefore look like a delivered response.
- Reused JSON-RPC IDs produced identical hashes. New request sequence numbers now connect receipt, local call lifecycle and send outcome within an MCP process.
- Transport errors and closure had no dedicated diagnostic events. They now record pending invocation counts while preserving SDK callbacks and original errors.
- `Session terminated` does not identify the component that terminated the session or prove a safety decision. The earlier instruction requiring a new Codex process was too strong and has been corrected.
- An assistant's report of refusal is not the upstream rejection response. No corresponding local rejection for the reported R452 incident was established. Absence of a local record alone does not establish cause or execution status.

## Behavior

Original protocol and tool responses remain unchanged. Diagnostics omit raw commands, arguments, result bodies and error text. Explicit protocol error envelopes matching session termination receive a fixed diagnostic category and retain the actual protocol error code. A completed transport send does not prove remote consumption.

Browser text mentioning session termination triggers one diagnostic capture per browser turn, correlated by trace and broker revision. This remains an unverified page observation, like the existing safety phrase capture. It does not abort a turn, reset a session or retry work; quoted text can also match. Existing private browser-diagnostic storage controls apply.

Model instructions distinguish unavailable original refusal details from an upstream response that supplies no reason. The model is told not to keep probing a terminated session without recovery evidence. This is guidance, not a programmatic Goal circuit breaker.

## Validation and deployment

Type checking passed. Targeted transport, diagnostic logging and output-preservation tests: 14 passed. Browser-worker and prompt contracts: 151 passed. Failed sends, repeated request IDs, lifecycle lookup, closure callbacks and raw response preservation are covered.

The running research service is not restarted by this patch. Live verification against a future upstream rejection remains necessary; local tests cannot establish undisclosed upstream policy reasons.

## Native compaction environment follow-up (2026-09-15)

The reported 00:17 failure occurred after native Codex appended a `compacted` record. Its rebuilt environment preamble had a new message ID inside `replacement_history`, not a standalone `response_item`. Historical authentication did not inspect that record type and rejected the legitimate continuation.

The verifier now searches replacement histories in the already authenticated canonical rollout. It compares message ID and exact content; within the current task it additionally requires native current-turn provenance and the environment content kind. Filesystem authority still comes from the latest validated turn context. Partial JSONL records, unmatched IDs, altered contents, wrong roles and incorrect current-turn ownership remain rejected. No wire-only compaction object is accepted as authority. Failure details include only unmatched counts and inspected compaction-record counts.

A read-only replay of the affected local rollout resolved the original failed turn to its existing workspace and sandbox. Regression coverage includes current and historical replacement messages, missing task boundaries and incomplete appends. The earlier negative-test anomaly was caused by fixture workspace metadata allowing the separate canonical-metadata resolution path, not request-state pollution; the tests now exercise rollout validation directly and the integration path without that alternative source.
