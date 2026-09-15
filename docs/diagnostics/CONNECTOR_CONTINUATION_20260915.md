# Connector selection on continued ChatGPT tasks

A live High research Goal reproduced a failure that the setup smoke test missed:
`The configured connector did not appear after two menu lookups; no personalization control is visible.`

The account catalog was available (HTTP 200, same accessible connector list on home
and task pages). The task composer preserved `@codex`, focus and geometry were valid,
but its mention results contained files rather than the configured app. The home
page still offered the app. Setup verification refreshes the home page and selects
then clears a connector; it does not prove a second task message can invoke tools.

The task page's **Add files and more** composer menu exposed the configured app
under a `data-composer-plugin-impression-id` entry. The automatic flow also
requires the plus control to acknowledge expansion before checking app rows; a click
that only dismisses the preceding effort menu is retried once before submission. Selecting it produced the exact
current-message connector pill. Alpha.35 uses that menu on owned reused connector
conversations, with exact app-name matching and pill verification. If the menu
entry is unavailable, the existing mention/preflight path remains the fallback.
Neither route submits a task until attachment succeeds. Ambiguous selection,
failed verification and cancellation clean up the composer and fail explicitly.

A historical app mention was tested as a possible binding proof and rejected as
insufficient: later replies had no broker tool calls, and the historical node could
become unavailable. Alpha.35 never skips current-message attachment on that basis.
A completed browser task publishes connector binding only after successful prompt
attachment, not merely because configuration enables tools.

The no-progress guard also recognizes the observed English safety-status error
and Chinese safety-check interception wording. Three distinct automatic Goal
completions with such claims and no recorded tool batch stop further continuation.
This does not authenticate a policy refusal; ordinary work, actual tool calls,
explicit recovery requests and a new runtime retain their existing reset behavior.

Private local diagnostic artifacts and research outputs are excluded from this
repository. Live observations must distinguish a broker rejection, an upstream
HTTP error and an assistant's unverified account of a refusal. This change does
not bypass upstream policy checks or replay rejected experiments.


Further live monitoring distinguished an expanded menu with zero app entries from
an ignored click. A successful standalone menu probe does not establish that every
retained task page exposes apps. On a retained connector failure **before Send**, the
adapter permits one fresh-surface preparation only if there are no outstanding tools,
no tool-progress revisions, no streamed response text and no trace activity. The fresh
surface receives the canonical full context, never the retained suffix alone. Accepted
tasks and policy/tool refusals do not qualify for this connector recovery.

After observing this compatibility failure, that provider namespace uses fresh task
surfaces for the rest of the runtime. This trades retained-context savings for working
tool attachment and avoids paying for the same failed menu probes on each Goal turn.
Within-turn tool batches continue on their existing task; no completed experiment is
resubmitted. The compatibility cache is bounded to 64 namespaces and resets on restart.

## Local acceptance

The deployed Linux alpha.35 was exercised with a real High Goal. Its first task
executed native commands and wrote an isolated source-audit checkpoint. The next
automatic task reproduced the expanded-menu/zero-app failure; the adapter recovered
on a fresh surface and completed further native commands and another checkpoint.
The following automatic task prepared a fresh full context directly and invoked
the native teacher-wait tool without repeating the failed retained lookup. A
read-only Pro consultation was also started through the real model route.

Core verification passed 798 tests with one platform skip; Launcher verification
passed 303 tests. Type checks, relocatable runtime smoke and the Linux packaged
desktop smoke passed. This is not a Windows end-to-end acceptance result.

A separate assistant-reported safety-status refusal still lacked a matching local
MCP rejection. Successful connector recovery does not establish the cause of that
upstream-or-model-reporting issue, and the patch does not claim to resolve it.
