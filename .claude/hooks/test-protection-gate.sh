#!/bin/bash
# PreToolUse hook (Edit|Write): protect the feedback loop during a fix.
#
# While /fix is in progress — marker file .claude/session-state/fix-mode exists — the agent
# may not edit test files. The failing test written in /fix Phase 2 is the proof that the bug
# is gone; an agent that can rewrite the test can make any fix "pass". The rule in
# .claude/rules/testing.md says never weaken a test; this hook makes it deterministic.
#
# Lifecycle of the marker (owned by /fix):
#   created  — Phase 2, after the failing test is committed
#   removed  — Phase 5, when the fix is reported done
# Escape hatch: the engineer removes the marker explicitly (rm .claude/session-state/fix-mode)
# and says why — never the agent on its own.
#
# Cheap by design: the marker check is a single stat and runs before stdin is parsed, so the
# common case (no fix in progress) costs ~5 ms. See SDLC.md § Hooks.

MARKER=".claude/session-state/fix-mode"
[[ -f "$MARKER" ]] || exit 0

input=$(cat)
FILE=$(echo "$input" | jq -r '.tool_input.file_path // empty')
. "${BASH_SOURCE[0]%/*}/lib/winpath.sh"; posix_path FILE   # Windows (local patch)
[[ -z "$FILE" ]] && exit 0

# --- What counts as a test file (adapt to your layout) -----------------------
# any path segment named test/ tests/ __tests__/ ; or a *.spec.* / *.test.* filename
if [[ "$FILE" =~ (^|/)(test|tests|__tests__)/ ]] || [[ "$FILE" =~ \.(spec|test)\.[^/]+$ ]]; then
    cat >&2 <<MSG
⛔ Fix mode: test files are locked while a /fix is in progress

  $FILE

The failing test from /fix Phase 2 is the proof the bug is gone. Fix the code, not the test.

If the test itself is wrong (asserts the wrong thing, wrong fixture), STOP and tell the
engineer exactly what is wrong with it. Only the engineer may unlock:
  rm $MARKER      # then re-run; record the reason in the /fix report
MSG
    # Audit: record the block in the tool log (see tool-log.sh) — cheap, block path only.
    mkdir -p .claude/session-state 2>/dev/null && printf '{"ts":%s,"tool":"%s","duration_ms":null,"decision":"blocked","hook":"%s","target":"%s"}\n' \
      "$(date +%s)000" "$(echo "$input" | jq -r '.tool_name // ""' | tr -d '\r')" "test-protection-gate" "$FILE" >> .claude/session-state/tool-log.jsonl 2>/dev/null

    exit 2
fi

exit 0
