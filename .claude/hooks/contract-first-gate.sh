#!/bin/bash
# PostToolUse hook (Edit|Write): enforce the contract-first workflow.
#
# An API handler or a frontend API-client module must consume the shared contract
# from ../models/. If one is written/edited without referencing it, the
# contract was not created first — block and route the author back to the contract step.
#
# Escape hatch: add a line containing `contract-exempt: <reason>` to the file
# (e.g. an anti-corruption proxy that talks to a third-party API rather than one
# of this project's own contract endpoints).
#
# ── ADAPT FOR YOUR STACK ──────────────────────────────────────────────────────
# The two regexes below encode where handlers and API clients live. Change them
# to match your layout, then verify by editing one of each and watching the hook.
# Keep this hook cheap — it runs on EVERY edit.
# See .claude/rules/api-contracts.md

set -e

input=$(cat)
FILE=$(echo "$input" | jq -r '.tool_input.file_path // empty')
. "${BASH_SOURCE[0]%/*}/lib/winpath.sh"; posix_path FILE   # Windows (local patch)

[[ -z "$FILE" ]] && exit 0

# --- What is guarded (adapt these two patterns) -------------------------------
HANDLER_RE='/server/.*(controller|handler|route)s?/.*\.(js|ts)$'
FE_API_RE='/clientApp/.*/api/.*\.(js|ts)$'
TEST_RE='\.(spec|test)\.'

IS_HANDLER=false
IS_FE_API=false
if [[ "$FILE" =~ $HANDLER_RE ]] && [[ ! "$FILE" =~ $TEST_RE ]]; then
    IS_HANDLER=true
elif [[ "$FILE" =~ $FE_API_RE ]] && [[ ! "$FILE" =~ $TEST_RE ]]; then
    IS_FE_API=true
fi

if [[ "$IS_HANDLER" == false ]] && [[ "$IS_FE_API" == false ]]; then
    exit 0
fi

# File should exist post-write; if not, nothing to check.
[[ ! -f "$FILE" ]] && exit 0

# Compliant: consumes the shared contract, or carries an explicit exemption.
grep -q "../models/" "$FILE" 2>/dev/null && exit 0
grep -qi "contract-exempt:" "$FILE" 2>/dev/null && exit 0

if [[ "$IS_HANDLER" == true ]]; then
    KIND="API handler"
else
    KIND="frontend API client"
fi

# Exit 2: surface stderr to Claude so it self-corrects instead of proceeding.
cat >&2 <<EOF
⛔ Contract-first violation: $KIND

  $FILE

does not consume the shared contract from \`../models/\`.

Per .claude/rules/api-contracts.md, the contract MUST exist BEFORE FE/BE code:
  • handlers validate the request and parse the response against the shared schema
  • frontend API clients derive their request/response types from that same schema

Fix one of:
  1. Define the contract in server/models first, then import it here.
  2. Import the existing schema from ../models/.
  3. If this endpoint is an anti-corruption proxy to a third-party API (not one of
     this project's contract endpoints), add a line: // contract-exempt: <reason>
EOF
# Audit: record the block in the tool log (see tool-log.sh) — cheap, block path only.
mkdir -p .claude/session-state 2>/dev/null && printf '{"ts":%s,"tool":"%s","duration_ms":null,"decision":"blocked","hook":"%s","target":"%s"}\n' \
  "$(date +%s)000" "$(echo "$input" | jq -r '.tool_name // ""' | tr -d '\r')" "contract-first-gate" "$FILE" >> .claude/session-state/tool-log.jsonl 2>/dev/null

exit 2
