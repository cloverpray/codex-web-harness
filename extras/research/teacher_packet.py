#!/usr/bin/env python3
"""Build a bounded, source-addressed teacher packet; stdout only, no research writes."""
import argparse
import hashlib
import json
from pathlib import Path


def build_packet(spec, base, max_bytes=16000):
    required = ('question', 'constraints', 'sources', 'nearest_mechanisms', 'resources')
    missing = [key for key in required if not spec.get(key)]
    if missing:
        raise ValueError('Missing packet fields: ' + ', '.join(missing))
    result = {key: spec[key] for key in required}
    result['evidence'] = []
    cache = {}
    for ref in spec.get('evidence', []):
        path = (Path(base) / ref['path']).resolve()
        if path not in cache:
            with path.open('rb') as stream:
                raw = stream.read(4 * 1024 * 1024 + 1)
            if len(raw) > 4 * 1024 * 1024:
                raise ValueError(f'Evidence file exceeds 4 MiB: {path}; provide a small verified artifact')
            cache[path] = (raw, hashlib.sha256(raw).hexdigest())
        raw, digest = cache[path]
        if ref.get('sha256') and ref['sha256'] != digest:
            raise ValueError(f'Stale evidence hash: {path}')
        if ('pointers' in ref) == ('lines' in ref):
            raise ValueError('Select exactly one of JSON pointers or a line interval')
        if 'pointers' in ref:
            value = json.loads(raw)
            excerpt = {}
            for pointer in ref['pointers']:
                if not isinstance(pointer, str) or not pointer.startswith('/'):
                    raise ValueError('Use nonempty JSON pointers; whole-file selection is not allowed')
                node = value
                for token in pointer[1:].split('/'):
                    token = token.replace('~1', '/').replace('~0', '~')
                    node = node[int(token)] if isinstance(node, list) else node[token]
                excerpt[pointer] = node
        else:
            start, end = ref['lines']
            lines = raw.decode('utf-8').splitlines()
            if not (isinstance(start, int) and isinstance(end, int) and 1 <= start <= end <= len(lines)):
                raise ValueError(f'Invalid evidence line interval: {path}')
            excerpt = '\n'.join(lines[start - 1:end])
        result['evidence'].append({'path': str(path), 'sha256': digest,
                                   'selection': ref.get('pointers', ref.get('lines')), 'excerpt': excerpt})
    if not result['evidence']:
        raise ValueError('Provide at least one decisive evidence reference')
    encoded = json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'
    if len(encoded.encode('utf-8')) > max_bytes:
        raise ValueError('Packet exceeds byte budget; narrow the evidence selection, do not truncate it')
    return encoded


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('spec', type=Path)
    parser.add_argument('--max-bytes', type=int, default=16000)
    args = parser.parse_args()
    try:
        if args.max_bytes <= 0:
            raise ValueError('max-bytes must be positive')
        print(build_packet(json.loads(args.spec.read_text()), args.spec.resolve().parent, args.max_bytes), end='')
    except (ValueError, KeyError, OSError, IndexError, TypeError) as error:
        parser.exit(2, f'teacher_packet: {error}\n')


if __name__ == '__main__':
    main()
