import copy
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch
import checkpoint_commit as commit
from cohort_guard import compare


class IntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.cp = self.root/'RESEARCH_CHECKPOINT.json'
        self.mf = self.root/'CHECKPOINT_MANIFEST.json'
        self.cp.write_bytes(commit.encoded({'run_id': 'r1', 'status': 'old'}))
        self.mf.write_bytes(commit.encoded({str(self.cp): commit.sha(self.cp.read_bytes())}))
        self.args = (self.root, {'run_id': 'r1', 'status': 'new'}, commit.sha(self.cp.read_bytes()), commit.sha(self.mf.read_bytes()))

    def test_commit_and_stale_writer(self):
        commit.publish(*self.args)
        self.assertEqual(json.loads(self.mf.read_text())[str(self.cp)], commit.sha(self.cp.read_bytes()))
        with self.assertRaisesRegex(ValueError, 'Stale'):
            commit.publish(*self.args)

    def test_interruption_is_visible_and_recoverable(self):
        original = commit.atomic
        def crash(path, raw):
            if path == self.mf:
                raise OSError('simulated failure')
            original(path, raw)
        with patch.object(commit, 'atomic', crash):
            with self.assertRaises(OSError):
                commit.publish(*self.args)
        self.assertTrue((self.root/'.checkpoint-transaction.json').exists())
        commit.publish(self.root, None, None, None, recover=True)
        self.assertEqual(json.loads(self.mf.read_text())[str(self.cp)], commit.sha(self.cp.read_bytes()))

    def test_recovery_refuses_newer_checkpoint(self):
        original = commit.atomic
        def crash(path, raw):
            if path == self.mf: raise OSError('failure')
            original(path, raw)
        with patch.object(commit, 'atomic', crash):
            with self.assertRaises(OSError): commit.publish(*self.args)
        self.cp.write_bytes(commit.encoded({'run_id': 'r1', 'status': 'newer'}))
        with self.assertRaisesRegex(ValueError, 'Concurrent'):
            commit.publish(self.root, None, None, None, recover=True)
        self.assertEqual(json.loads(self.cp.read_text())['status'], 'newer')

    def test_cohort_order_extra_row_and_mask(self):
        frozen = {'contract_sha256': 'contract', 'data_sha256': 'data', 'rows': [
            {'opportunity_id': 'a', 'fillable': True, 'mature': True},
            {'opportunity_id': 'b', 'fillable': False, 'mature': False}]}
        current = copy.deepcopy(frozen)
        current['rows'].reverse()
        self.assertEqual(compare(frozen, current)['mature'], 1)
        current['rows'].append({'opportunity_id': 'extra', 'fillable': True, 'mature': True})
        with self.assertRaisesRegex(ValueError, 'Cohort differs'): compare(frozen, current)
        current = copy.deepcopy(frozen)
        current['rows'][0]['mature'] = False
        with self.assertRaisesRegex(ValueError, 'Cohort differs'): compare(frozen, current)
        current['rows'][0]['fillable'] = None
        with self.assertRaisesRegex(ValueError, 'booleans'): compare(frozen, current)

class MetricsTests(unittest.TestCase):
    def test_metrics_distinguish_unobserved_and_correlated_calls(self):
        from harness_metrics import report
        rows = [
            {'at': '2026-09-13T00:00:00Z', 'event': 'browser.turn_started', 'detail': {'traceId': 'abc'}},
            {'at': '2026-09-13T00:00:01Z', 'event': 'runtime.daemon_stdout', 'detail': {'line': '[chatgpt-web] broker trace=abc queued call=c1 tool=exec_command'}},
            {'at': '2026-09-13T00:00:03Z', 'event': 'runtime.daemon_stdout', 'detail': {'line': '[chatgpt-web] broker trace=abc completed call=c1 pending=0'}},
            {'at': '2026-09-13T00:00:04Z', 'event': 'runtime.daemon_stdout', 'detail': {'line': '[chatgpt-web] transport_metrics {"traceId":"abc","textPayloadBytes":120,"retained":true}'}},
        ]
        result = report(map(json.dumps, rows))
        self.assertEqual(result['broker_queue_to_result_seconds_total'], 2)
        self.assertEqual(result['compiled_text_bytes_total'], 120)
        self.assertEqual(result['started_without_end_in_window'], 1)
        self.assertIsNone(report([])['compiled_text_bytes_total'])

    def test_failure_origins_and_reconnected_handoff_are_not_policy_verdicts(self):
        from harness_metrics import report
        payloads = [
            ('[chatgpt-web] tool_outcome ', {'traceId': 'a', 'outcome': 'tool_reported_error'}),
            ('[chatgpt-web-mcp] tool_rejection ', {'origin': 'mcp_guard'}),
            ('[chatgpt-web] compaction_failure ', {'traceId': 'a', 'code': 'compaction_handoff_timeout'}),
            ('[chatgpt-web] compaction_failure ', {'traceId': 'a', 'code': 'compaction_handoff_timeout'}),
            ('[chatgpt-web-mcp] invocation_failure ', {'code': 'codex_tool_timeout'}),
        ]
        rows = [json.dumps({'at': '2026-09-13T00:00:00Z', 'event': 'runtime.daemon_stdout',
                            'detail': {'line': prefix + json.dumps(data)}}) for prefix, data in payloads]
        result = report(rows)
        self.assertEqual(result['tool_outcomes'], {'tool_reported_error': 1})
        self.assertEqual(result['local_guard_rejections'], {'mcp_guard': 1})
        self.assertEqual(result['compaction_failure_traces'], {'compaction_handoff_timeout': 1})
        self.assertEqual(result['invocation_transport_failures'], {'codex_tool_timeout': 1})
        self.assertEqual(result['policy_verdict'], 'unknown_without_original_platform_evidence')

    def test_goal_savings_do_not_count_reconnects_twice(self):
        from harness_metrics import report
        data = {'traceId': 'a', 'savedSerializedBytes': 7000}
        row = json.dumps({'at': '2026-09-13T00:00:00Z', 'detail': {
            'line': '[chatgpt-web] retained_context_savings ' + json.dumps(data)}})
        result = report([row, row])
        self.assertEqual(result['goal_reference_samples'], 1)
        self.assertEqual(result['goal_reference_saved_serialized_bytes'], 7000)
        self.assertIsNone(report([])['goal_reference_saved_serialized_bytes'])
