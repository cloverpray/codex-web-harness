#!/usr/bin/env python3
"""Native teacher boundary. No model calls, experiments or task-state writes."""
import json
import os
from pathlib import Path
import sys


def deny_reason(request, home=None):
    home = Path(home or os.environ.get('CODEX_HOME', Path.home() / '.codex'))
    try:
        protected = set(json.loads((home / 'hooks/teacher-protected-handles.json').read_text()))
    except FileNotFoundError:
        protected = set()
    actor = request.get('session_id')
    if request.get('agent_type') == 'pro_teacher' or actor in protected:
        return 'Pro teacher is evidence-only. Return the assessment from the supplied packet; give missing evidence requests to the main executor. No tools or delegation.'
    name = request.get('tool_name', '')
    args = request.get('tool_input', {})
    if not isinstance(args, dict):
        return None
    def is_tool(suffix):
        return name == suffix or name.endswith('__' + suffix) or name.endswith('.' + suffix)
    if is_tool('exec_command') or is_tool('write_stdin'):
        try:
            web_sessions = set(json.loads((home / 'hooks/web-bounded-output-handles.json').read_text()))
        except FileNotFoundError:
            web_sessions = set()
        limit = args.get('max_output_tokens')
        if actor in web_sessions and isinstance(limit, (int, float)) and limit > 8000:
            return 'Web output exceeds 8000 tokens. Save full output to an artifact; return selected keys or short excerpts. Narrow truncated searches instead of increasing output.'
    if is_tool('spawn_agent'):
        teacher = args.get('agent_type') == 'pro_teacher'
        pro = args.get('model') == 'chatgpt-web/pro'
        full = args.get('fork_context') is True or args.get('fork_turns') == 'all'
        if (teacher or pro) and full:
            return 'Teacher/Pro model overrides cannot use a full-history fork. Keep pro_teacher and send an isolated compact packet; do not omit the role after an error.'
        if pro and not args.get('agent_type'):
            return 'Web Pro subagents need an explicit configured role. Keep pro_teacher for consultation; do not fall back to a generic model override.'
        if teacher:
            if args.get('fork_context') is not False and args.get('fork_turns') != 'none':
                return 'pro_teacher needs explicit fork_context=false or fork_turns=none.'
            if 'model' in args or 'reasoning_effort' in args:
                return 'pro_teacher owns model/effort. Do not override them or fall back on role/thread-limit failure.'
            if not isinstance(args.get('message'), str) or len(args['message'].encode()) > 16000:
                return 'Select a complete evidence packet within 16000 UTF-8 bytes. Do not truncate evidence or inherit full history.'
    cancellation = is_tool('interrupt_agent') or is_tool('close_agent') or (is_tool('send_input') and args.get('interrupt') is True)
    if cancellation:
        target = args.get('target', args.get('agent_id', args.get('id', '')))
        if not isinstance(target, str):
            return None
        teacher = target in protected
        completed = False
        # Exact UUID filenames only; never interpret a tool argument as a path/glob.
        import re
        if re.fullmatch(r'[0-9a-f-]{36}', target):
            for path in (home / 'sessions').glob('*/*/*/rollout-*-' + target + '.jsonl'):
                with path.open('rb') as f:
                    first = json.loads(f.readline())['payload']
                    source = first.get('source', {})
                    source = source if isinstance(source, dict) else {}
                    role = source.get('subagent', {}).get('thread_spawn', {}).get('agent_role')
                    teacher = teacher or role == 'pro_teacher'
                    f.seek(max(0, path.stat().st_size - 131072))
                    lines = f.read().splitlines()
                for line in lines[1:]:
                    try:
                        payload = json.loads(line).get('payload', {})
                    except (ValueError, TypeError):
                        continue
                    if payload.get('type') == 'task_started': completed = False
                    if payload.get('type') in ('task_complete', 'turn_aborted'): completed = True
        if teacher and not (is_tool('close_agent') and completed):
            return 'Do not cancel or close a pending evidence-only teacher to shorten a wait. timeout means pending. Keep the handle, do independent work or hand off. Explicit user cancellation can use the native UI. Completed teacher handles may be closed after saving their result.'
    return None


def main():
    request = json.load(sys.stdin)
    reason = deny_reason(request)
    print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny', 'permissionDecisionReason': reason}} if reason else {}))


if __name__ == '__main__':
    main()
