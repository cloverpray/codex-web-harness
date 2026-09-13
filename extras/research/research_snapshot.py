#!/usr/bin/env python3
"""Collect a bounded read-only persisted research snapshot; never calls runtime status."""
import argparse
import hashlib
import json
from pathlib import Path

LIMIT = 4 * 1024 * 1024
STATE_KEYS = ('schema', 'version', 'run_id', 'status', 'action', 'contract', 'trials',
              'cycle', 'cycle_remaining', 'pending', 'last', 'workspace')
CHECKPOINT_KEYS = ('status', 'direction', 'report', 'next', 'previous_turn', 'partition',
                   'partition_record', 'qualification', 'running_trial',
                   'runtime_trials_completed', 'new_models', 'new_accounts',
                   'teacher_consulted_this_turn', 'teacher_submission_pending', 'campaign_completed_models')
DIRECTION_KEYS = ('status', 'decision', 'conclusion', 'next', 'next_action', 'qualification',
                  'failed_gate', 'outcome', 'reason', 'diagnostic_only', 'source_status')


def stamp(path):
    try:
        s = path.stat()
        return (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
    except FileNotFoundError:
        return None


def collect(run_dir, checkpoint, max_bytes=16000):
    run_dir, checkpoint = Path(run_dir).resolve(), Path(checkpoint).resolve()
    cache, watched = {}, {}

    def watch(path):
        path = Path(path)
        watched.setdefault(path, stamp(path))
        return watched[path]

    def read(path):
        path = Path(path)
        if path not in cache:
            before = watch(path)
            if before is None:
                raise ValueError(f'Missing required file: {path}')
            with path.open('rb') as f:
                raw = f.read(LIMIT + 1)
            if len(raw) > LIMIT:
                raise ValueError(f'File exceeds 4 MiB: {path}')
            if stamp(path) != before:
                raise ValueError(f'File changed during read; retry snapshot: {path}')
            value = json.loads(raw)
            if not isinstance(value, dict):
                raise ValueError(f'Expected JSON object: {path}')
            cache[path] = (value, hashlib.sha256(raw).hexdigest())
        return cache[path][0]

    def evidence(path, keys=None):
        value = read(path)
        selected = value if keys is None else {k: value[k] for k in keys if k in value}
        return {'path': str(path), 'sha256': cache[path][1], 'values': selected,
                'omitted_keys': sorted(set(value) - set(selected))}

    run_path, state_path = run_dir / 'RUN.json', run_dir / 'CURRENT_STATE.json'
    run, state, cp = read(run_path), read(state_path), read(checkpoint)
    if not run.get('run_id') or state.get('run_id') != run['run_id']:
        raise ValueError('RUN and CURRENT_STATE identities disagree')
    warnings = []
    if state.get('contract') != {k: run[k] for k in ('holdout_start', 'qualification') if k in run}:
        warnings.append('Contract representations differ; inspect before making a research decision')
    dependencies = {}
    for name in ('TRIALS.jsonl', 'PENDING.json'):
        path = run_dir / name
        s = watch(path)
        dependencies[name] = {'exists': s is not None, 'bytes': s[2] if s else None,
                              'mtime_ns': s[3] if s else None}
        if s and s[3] > watched[state_path][3]:
            warnings.append(f'{name} is newer than CURRENT_STATE; owner must reconcile runtime state')
    if cp.get('runtime_trials_completed') is not None and cp['runtime_trials_completed'] != state.get('trials'):
        warnings.append('Checkpoint trial count differs from persisted runtime state')
    result = {'schema': 'research_snapshot/v1', 'read_only': True,
              'freshness': 'persisted_snapshot_not_ledger_recomputed',
              'run': evidence(run_path), 'state': evidence(state_path, STATE_KEYS),
              'checkpoint': evidence(checkpoint, CHECKPOINT_KEYS), 'dependencies': dependencies,
              'warnings': warnings, 'linked_evidence': []}
    pending_path = run_dir / 'PENDING.json'
    if dependencies['PENDING.json']['exists']:
        pending = read(pending_path)
        if pending.get('run_id') != run['run_id']:
            raise ValueError('Pending task belongs to another RUN')
        result['pending'] = evidence(pending_path)
    seen = set()
    for key in ('direction', 'report', 'partition_record'):
        ref = cp.get(key)
        if not isinstance(ref, str) or not ref:
            continue
        path = (checkpoint.parent / ref).resolve()
        if path in seen:
            continue
        seen.add(path)
        if not path.is_relative_to(checkpoint.parent):
            warnings.append(f'{key} points outside checkpoint directory; explicit inspection required')
            continue
        if watch(path) is None:
            warnings.append(f'{key} file is missing: {path}')
            continue
        if path.suffix.lower() != '.json':
            warnings.append(f'{key} is not JSON; inspect referenced text explicitly: {path}')
            continue
        result['linked_evidence'].append(evidence(path, DIRECTION_KEYS))
    for path, before in watched.items():
        if stamp(path) != before:
            raise ValueError(f'Snapshot changed during collection; retry once writers settle: {path}')
    encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'
    if max_bytes <= 0 or len(encoded.encode()) > max_bytes:
        raise ValueError('Snapshot exceeds byte budget; explicitly increase --max-bytes; no output was truncated')
    return encoded


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--run-dir', type=Path, required=True)
    p.add_argument('--checkpoint', type=Path, required=True)
    p.add_argument('--max-bytes', type=int, default=16000)
    args = p.parse_args()
    try:
        print(collect(args.run_dir, args.checkpoint, args.max_bytes), end='')
    except (ValueError, OSError, TypeError, KeyError) as e:
        p.exit(2, f'research_snapshot: {e}\n')


if __name__ == '__main__':
    main()
