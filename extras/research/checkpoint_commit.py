#!/usr/bin/env python3
"""Owner-only recoverable checkpoint + manifest commit. Never writes RUN state."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def atomic(path, raw):
    fd, name = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(raw)
            out.flush()
            os.fsync(out.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def finish(root, plan):
    cp, manifest = root/'RESEARCH_CHECKPOINT.json', root/'CHECKPOINT_MANIFEST.json'
    new_cp, new_manifest = encoded(plan['checkpoint']), encoded(plan['manifest'])
    for path, expected, new in ((cp, plan['old_checkpoint_sha256'], new_cp),
                                (manifest, plan['old_manifest_sha256'], new_manifest)):
        if sha(path.read_bytes()) not in (expected, sha(new)):
            raise ValueError('Concurrent change; owner must reconcile, transaction retained')
    for path, expected in plan['artifacts'].items():
        if sha(Path(path).read_bytes()) != expected:
            raise ValueError('Evidence changed; transaction retained')
    atomic(cp, new_cp)
    atomic(manifest, new_manifest)
    if cp.read_bytes() != new_cp or manifest.read_bytes() != new_manifest:
        raise ValueError('Concurrent change during commit; transaction retained')
    (root/'.checkpoint-transaction.json').unlink()


def publish(root, proposed, checkpoint_sha, manifest_sha, artifacts=(), recover=False):
    root = Path(root).resolve()
    lock, journal = root/'.checkpoint-writer.lock', root/'.checkpoint-transaction.json'
    # Cooperative lock: callers must be the sole research writer. A stale lock is not proof of death.
    lock.mkdir()
    try:
        if recover:
            plan = json.loads(journal.read_text())
            finish(root, plan)
            return
        if journal.exists():
            raise ValueError('Incomplete transaction; inspect before --recover')
        cp, mf = root/'RESEARCH_CHECKPOINT.json', root/'CHECKPOINT_MANIFEST.json'
        old_cp, old_mf = cp.read_bytes(), mf.read_bytes()
        if sha(old_cp) != checkpoint_sha or sha(old_mf) != manifest_sha:
            raise ValueError('Stale expected hash; no writes performed')
        old = json.loads(old_cp)
        if not isinstance(proposed, dict) or not old.get('run_id') or proposed.get('run_id') != old['run_id']:
            raise ValueError('Explicit unchanged run_id required')
        manifest = json.loads(old_mf)
        sources = {}
        for name in artifacts:
            path = Path(name).resolve()
            if not path.is_relative_to(root) or path in (cp, mf, journal):
                raise ValueError('Artifact must be a distinct file inside checkpoint directory')
            sources[str(path)] = sha(path.read_bytes())
        # Update explicit absolute aliases; relative bases must be reviewed by the owner.
        for key in list(manifest):
            candidate = Path(key)
            if not candidate.is_absolute():
                if candidate.name in {cp.name, *(Path(name).name for name in sources)}:
                    raise ValueError('Relative manifest alias requires explicit normalization before commit')
                continue
            if candidate.resolve() == cp:
                manifest[key] = sha(encoded(proposed))
            elif str(candidate.resolve()) in sources:
                manifest[key] = sources[str(candidate.resolve())]
        manifest[str(cp)] = sha(encoded(proposed))
        manifest.update(sources)
        plan = {'checkpoint': proposed, 'manifest': manifest, 'artifacts': sources,
                'old_checkpoint_sha256': checkpoint_sha, 'old_manifest_sha256': manifest_sha}
        atomic(journal, encoded(plan))
        finish(root, plan)
    finally:
        lock.rmdir()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('directory', type=Path)
    p.add_argument('--proposed', type=Path)
    p.add_argument('--expected-checkpoint-sha256')
    p.add_argument('--expected-manifest-sha256')
    p.add_argument('--artifact', action='append', default=[])
    p.add_argument('--recover', action='store_true')
    a = p.parse_args()
    try:
        proposed = json.loads(a.proposed.read_text()) if a.proposed else None
        publish(a.directory, proposed, a.expected_checkpoint_sha256, a.expected_manifest_sha256, a.artifact, a.recover)
        print('{"committed":true}')
    except (OSError, ValueError, KeyError, TypeError) as error:
        p.exit(2, f'checkpoint_commit: {error}\n')


if __name__ == '__main__':
    main()
