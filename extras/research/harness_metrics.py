#!/usr/bin/env python3
"""Summarize structured launcher observations without copying prompts or tool contents."""
import argparse
from collections import Counter
from datetime import datetime
import json
from pathlib import Path
import re


def report(lines, since=''):
    events = Counter()
    outcomes, rejections, handoffs, transports_failed = Counter(), Counter(), {}, Counter()
    transports, markers, starts, ends, queued, latencies = {}, set(), {}, {}, {}, []
    malformed = 0
    goal_savings, native_failures = {}, Counter()
    for line in lines:
        try:
            v = json.loads(line)
            at = v.get('at', '')
            if at < since:
                continue
            event, detail = v.get('event'), v.get('detail', {})
            text = detail.get('line', '')
            events[event] += 1
            if event == 'browser.turn_started': starts[detail['traceId']] = at
            if event == 'browser.turn_ended': ends[detail['traceId']] = (at, detail.get('status'))
            for prefix, target in [('transport_metrics ', transports), ('response_surface_marker ', None)]:
                if '[chatgpt-web] ' + prefix in text:
                    d = json.loads(text.split('[chatgpt-web] ' + prefix, 1)[1])
                    if target is not None: target[d['traceId']] = d
                    else: markers.add(d['traceId'])
            # Fixed categories only: never export result text or arbitrary exception messages.
            for prefix in ('[chatgpt-web] tool_outcome ', '[chatgpt-web] tool_rejection ',
                           '[chatgpt-web-mcp] tool_rejection ', '[chatgpt-web] compaction_failure ',
                           '[chatgpt-web-mcp] invocation_failure '):
                if prefix not in text:
                    continue
                d = json.loads(text.split(prefix, 1)[1])
                if 'tool_outcome ' in prefix:
                    outcome = d.get('outcome')
                    outcomes[outcome if outcome in ('returned', 'tool_reported_error') else 'unknown'] += 1
                elif 'tool_rejection ' in prefix:
                    origin = d.get('origin')
                    rejections[origin if origin in ('broker_guard', 'mcp_guard') else 'unknown'] += 1
                elif 'compaction_failure ' in prefix:
                    code = d.get('code')
                    handoffs[d['traceId']] = code if code in ('compaction_handoff_timeout', 'compaction_source_unavailable', 'compaction_handoff_failed', 'client_cancelled') else 'other'
                else:
                    code = d.get('code')
                    transports_failed[code if code in ('codex_tool_timeout', 'invocation_aborted', 'broker_invocation_failed') else 'other'] += 1
            if '[chatgpt-web] retained_context_savings ' in text:
                d = json.loads(text.split('[chatgpt-web] retained_context_savings ', 1)[1])
                saved = d.get('savedSerializedBytes')
                if isinstance(saved, int) and not isinstance(saved, bool) and saved >= 0:
                    goal_savings[d['traceId']] = saved
            if '[chatgpt-web] native_tool_failure ' in text:
                d = json.loads(text.split('[chatgpt-web] native_tool_failure ', 1)[1])
                code = d.get('code')
                native_failures[code if code in ('native_agent_capacity', 'native_execution_rejected', 'native_command_failed') else 'unknown'] += 1
            match = re.search(r'broker trace=(\w+) (queued|completed) call=(\S+)', text)
            if match:
                key = (match[1], match[3])
                if match[2] == 'queued': queued[key] = at
                elif key in queued:
                    duration = (datetime.fromisoformat(at.replace('Z', '+00:00')) - datetime.fromisoformat(queued.pop(key).replace('Z', '+00:00'))).total_seconds()
                    if duration >= 0: latencies.append(duration)
        except (ValueError, TypeError, KeyError, AttributeError):
            malformed += 1
    values = sorted(d['textPayloadBytes'] + d.get('multipartPayloadBytes', 0) for d in transports.values())
    return {'schema': 'harness_metrics/v1', 'started': len(starts),
            'ended_statuses': dict(Counter(status for _, status in ends.values())),
            'started_without_end_in_window': len(set(starts) - set(ends)),
            'transport_samples': len(transports), 'retained_samples': sum(d['retained'] is True for d in transports.values()),
            'compiled_text_bytes_total': sum(values) if values else None,
            'compiled_text_bytes_median': values[len(values)//2] if values else None,
            'compiled_text_bytes_max': max(values) if values else None,
            'refusal_phrase_observed_traces': len(markers), 'refusal_origin': 'unverified_not_a_policy_verdict',
            'goal_reference_samples': len(goal_savings),
            'goal_reference_saved_serialized_bytes': sum(goal_savings.values()) if goal_savings else None,
            'native_failure_envelopes': dict(native_failures),
            'tool_outcomes': dict(outcomes), 'local_guard_rejections': dict(rejections),
            'compaction_failure_traces': dict(Counter(handoffs.values())),
            'invocation_transport_failures': dict(transports_failed),
            'policy_verdict': 'unknown_without_original_platform_evidence',
            'broker_completed_samples': len(latencies),
            'broker_queue_to_result_seconds_total': sum(latencies),
            'broker_queue_to_result_seconds_max': max(latencies) if latencies else None,
            'malformed_records': malformed,
            'limits': 'Window may omit boundaries. Broker intervals include execution and may overlap. Bytes exclude images/transport wrappers; no billing or Alpha-speed claim.'}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('launcher_log', type=Path)
    p.add_argument('--since', default='')
    a = p.parse_args()
    with a.launcher_log.open() as stream:
        print(json.dumps(report(stream, a.since), indent=2))
