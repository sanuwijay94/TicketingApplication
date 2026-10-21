#!/bin/bash
# PreCompact hook: Save git state before context compaction
#
# Saves current git status and diff to .claude/session-state/
# so work-in-progress is preserved even if context is lost.
#
# Manual cleanup: rm -rf .claude/session-state/*

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
STATE_DIR=".claude/session-state"

mkdir -p "$STATE_DIR"

git status --short > "$STATE_DIR/git-status-$TIMESTAMP.txt" 2>/dev/null || true

{
    echo "=== Staged changes ==="
    git diff --cached --stat 2>/dev/null || true
    echo ""
    echo "=== Unstaged changes ==="
    git diff --stat 2>/dev/null || true
} > "$STATE_DIR/git-diff-$TIMESTAMP.txt"

echo "Session state saved to $STATE_DIR (timestamp: $TIMESTAMP)"

exit 0
