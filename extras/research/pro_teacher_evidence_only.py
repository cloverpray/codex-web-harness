#!/usr/bin/env python3
"""Enforce the evidence-only teacher boundary using native hook role metadata."""
import json
import sys

request = json.load(sys.stdin)
if request.get('agent_type') == 'pro_teacher':
    print(json.dumps({'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'Pro teacher is evidence-only. Return the assessment using the supplied packet; ask the main executor for the smallest missing excerpt. Tool execution, experiments, mutations, and delegation are disabled for this role.'
    }}))
else:
    print('{}')
