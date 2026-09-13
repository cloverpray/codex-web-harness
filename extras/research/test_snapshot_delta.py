import copy
import unittest
from snapshot_delta import make_delta, restore


class SnapshotDeltaTests(unittest.TestCase):
    def snapshot(self):
        return {'schema': 'research_snapshot/v1', 'run': {'path': '/run/RUN.json', 'values': {'run_id': 'r1', 'qualification': {'win': .7}}},
                'state': {'values': {'pending': None}}, 'checkpoint': {'path': '/work/checkpoint.json', 'values': {'next': 'inspect'}},
                'warnings': [], 'linked_evidence': [{'values': {'evidence': '中文证据' * 2000}}]}

    def test_roundtrip_changes_removals_and_safety_fields(self):
        base = self.snapshot()
        base['pending'] = {'handle': 'old'}
        current = copy.deepcopy(base)
        del current['pending']
        current['warnings'] = ['ledger newer than state']
        current['checkpoint']['values']['next'] = 'reconcile'
        packet = make_delta(base, current)
        self.assertEqual(packet['mode'], 'delta')
        delta = packet['payload']
        self.assertEqual(restore(base, delta), current)
        self.assertEqual(delta['set']['run'], current['run'])
        self.assertEqual(delta['set']['warnings'], current['warnings'])
        self.assertIn('pending', delta['remove'])
        self.assertGreater(packet['metrics']['saved_payload_bytes'], 0)

    def test_wrong_or_lost_baseline_and_tampering(self):
        base = self.snapshot()
        delta = make_delta(base, base)['payload']
        changed = copy.deepcopy(base)
        changed['warnings'] = ['changed']
        with self.assertRaisesRegex(ValueError, 'Baseline hash'):
            restore(changed, delta)
        delta['set']['warnings'] = ['tampered']
        with self.assertRaisesRegex(ValueError, 'Restored snapshot hash'):
            restore(base, delta)

    def test_small_snapshot_falls_back_and_run_mismatch_fails(self):
        base = self.snapshot()
        del base['linked_evidence']
        self.assertEqual(make_delta(base, base)['mode'], 'full')
        changed = copy.deepcopy(base)
        changed['run']['values']['run_id'] = 'r2'
        with self.assertRaisesRegex(ValueError, 'RUN identities'):
            make_delta(base, changed)

    def test_delta_cannot_be_used_as_full_baseline(self):
        base = self.snapshot()
        with self.assertRaisesRegex(ValueError, 'full research_snapshot'):
            make_delta(make_delta(base, base)['payload'], base)
