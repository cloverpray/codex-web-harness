#!/usr/bin/env python3
"""Emit a verifiable snapshot delta. Both inputs remain read-only; no hidden cache."""
import argparse
import copy
import hashlib
import json
from pathlib import Path

LIMIT = 4 * 1024 * 1024


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def digest(value):
    return hashlib.sha256(encode(value)).hexdigest()


def validate(value):
    if not isinstance(value, dict) or value.get('schema') != 'research_snapshot/v1':
        raise ValueError('Expected a full research_snapshot/v1, not a previous delta')
    for key in ('run', 'state', 'checkpoint'):
        if not isinstance(value.get(key), dict) or not isinstance(value[key].get('values'), dict):
            raise ValueError('Missing snapshot evidence')
    if not value['run']['values'].get('run_id'):
        raise ValueError('Missing RUN identity')


def make_delta(base, current):
    validate(base)
    validate(current)
    for key in ('run', 'checkpoint'):
        if base[key].get('path') != current[key].get('path'):
            raise ValueError('Snapshot paths differ; use a full snapshot')
    if base['run']['values']['run_id'] != current['run']['values']['run_id']:
        raise ValueError('RUN identities differ; use a full snapshot')
    changed = {k: v for k, v in current.items() if k not in base or base[k] != v}
    removed = sorted(set(base) - set(current))
    # These are deliberately repeated, including all current warnings and live handles.
    for key in ('run', 'state', 'checkpoint', 'dependencies', 'warnings', 'freshness', 'pending'):
        if key in current:
            changed[key] = current[key]
    delta = {'schema': 'research_snapshot_delta/v1', 'base_sha256': digest(base),
             'current_sha256': digest(current), 'set': changed, 'remove': removed}
    # Avoid making small snapshots larger. Never truncate to achieve a target ratio.
    full_bytes = len(encode(current))
    delta_bytes = len(encode(delta))
    use_delta = delta_bytes < full_bytes
    return {'schema': 'research_snapshot_transport/v1',
            'mode': 'delta' if use_delta else 'full',
            'metrics': {'full_payload_bytes': full_bytes, 'selected_payload_bytes': delta_bytes if use_delta else full_bytes,
                        'saved_payload_bytes': max(0, full_bytes - delta_bytes),
                        'scope': 'snapshot_payload_only_not_model_tokens_or_total_request'},
            'payload': delta if use_delta else current}


def restore(base, delta):
    validate(base)
    if delta.get('schema') != 'research_snapshot_delta/v1' or digest(base) != delta.get('base_sha256'):
        raise ValueError('Baseline hash mismatch; load a full snapshot')
    result = copy.deepcopy(base)
    for key in delta['remove']:
        result.pop(key, None)
    result.update(delta['set'])
    if digest(result) != delta.get('current_sha256'):
        raise ValueError('Restored snapshot hash mismatch')
    validate(result)
    return result


def read(path):
    with Path(path).open('rb') as stream:
        raw = stream.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise ValueError('Snapshot exceeds 4 MiB')
    return json.loads(raw)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline')
    parser.add_argument('current')
    parser.add_argument('--max-bytes', type=int, default=16000)
    args = parser.parse_args()
    try:
        output = encode(make_delta(read(args.baseline), read(args.current))) + b'\n'
        if args.max_bytes <= 0 or len(output) > args.max_bytes:
            raise ValueError('Output exceeds byte budget; no content truncated')
        print(output.decode(), end='')
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(2, f'snapshot_delta: {error}\n')


if __name__ == '__main__':
    main()
