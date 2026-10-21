#!/bin/bash
# Stop hook: Remind about uncommitted changes
#
# Runs after each Claude response. Shows a reminder if there are
# uncommitted changes to encourage regular commits.
# Silent if working tree is clean.

set -e

staged=$(git diff --cached --quiet 2>/dev/null && echo "false" || echo "true")
unstaged=$(git diff --quiet 2>/dev/null && echo "false" || echo "true")

if [[ "$staged" == "false" && "$unstaged" == "false" ]]; then
    exit 0
fi

echo ""
echo "--- Git Status ---"

if [[ "$staged" == "true" ]]; then
    staged_count=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
    echo "Staged: $staged_count file(s) ready to commit. Run /commit when ready."
fi

if [[ "$unstaged" == "true" ]]; then
    unstaged_count=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')
    echo "Unstaged: $unstaged_count file(s) modified."
fi

exit 0
