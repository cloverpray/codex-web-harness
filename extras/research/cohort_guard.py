#!/usr/bin/env python3
"""Compare frozen JSON cohort membership and execution masks, independently of row order."""
import argparse
import hashlib
import json
from pathlib import Path


def fingerprint(rows):
    indexed = {}
    for row in rows:
        key = row['opportunity_id']
        if not isinstance(key, str) or not key or key in indexed:
            raise ValueError('Missing/duplicate opportunity_id')
        flags = [row[k] for k in ('fillable', 'mature')]
        if any(type(flag) is not bool for flag in flags):
            raise ValueError('Masks must be explicit booleans, not null/coerced values')
        if flags[1] and not flags[0]:
            raise ValueError('Unfilled opportunity cannot be a mature trade')
        indexed[key] = flags
    raw = json.dumps(sorted(indexed.items()), separators=(',', ':')).encode()
    return {'sha256': hashlib.sha256(raw).hexdigest(), 'opportunities': len(indexed),
            'fillable': sum(v[0] for v in indexed.values()), 'mature': sum(v[1] for v in indexed.values())}


def compare(frozen, current):
    for key in ('contract_sha256', 'data_sha256'):
        if not frozen.get(key) or frozen[key] != current.get(key):
            raise ValueError('Contract/data identity differs; explicit new cohort required')
    old, new = fingerprint(frozen['rows']), fingerprint(current['rows'])
    if old != new:
        raise ValueError(f'Cohort differs: frozen={old}, current={new}; do not silently drop rows')
    return new


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('frozen', type=Path)
    p.add_argument('current', type=Path)
    a = p.parse_args()
    try:
        print(json.dumps(compare(json.loads(a.frozen.read_text()), json.loads(a.current.read_text()))))
    except (OSError, ValueError, KeyError, TypeError) as error:
        p.exit(2, f'cohort_guard: {error}\n')
