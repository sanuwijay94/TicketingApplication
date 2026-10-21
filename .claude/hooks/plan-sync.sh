#!/bin/bash
# PostToolUse hook (Edit|Write): keep the committed plan and the implementation in sync.
#
# /implement commits the approved plan as .claude/planning/plan/PLAN-NNN-<slug>.md with
# `status: living` and `branch: <git branch>` before the first code edit. The plan's
# *Files that change* table is exhaustive by rule; a file edited that is not in it is drift.
# This hook surfaces the drift at the moment it happens — a WARNING, not a block — so the plan
# is amended in the same commit (Departures from plan) rather than discovered in /review.
# (Playbook, Stage 3: "When implementation departs from the plan, update plan.md in the same
# commit. Consider using a hook to enforce synchronization between the two.")
#
# Cheap by design: exits before reading stdin unless some plan is `status: living`; one grep for
# the branch; one grep for the path. ~5 ms idle, ~20 ms when a living plan matches the branch (no jq, no git subprocess).

PLAN_DIR=".claude/planning/plan"
[[ -d "$PLAN_DIR" ]] || exit 0
# Any living plan at all? (single grep over small files; the common case exits here)
LIVING=$(grep -ls '^status: *living' "$PLAN_DIR"/PLAN-*.md 2>/dev/null) || exit 0
[[ -z "$LIVING" ]] && exit 0

# Branch name straight from .git/HEAD (no git subprocess — this is the hot path)
ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
. "${BASH_SOURCE[0]%/*}/lib/winpath.sh"; posix_path ROOT   # Windows (local patch)
GITDIR="$ROOT/.git"; [[ -f "$GITDIR" ]] && GITDIR=$(sed -n 's/^gitdir: //p' "$GITDIR")   # worktree
read -r HEADREF < "$GITDIR/HEAD" 2>/dev/null || exit 0
BRANCH="${HEADREF#ref: refs/heads/}"
[[ "$BRANCH" == "$HEADREF" ]] && exit 0   # detached HEAD

# The plan for this branch (first match wins)
PLAN=""
for f in $LIVING; do
    if grep -qE "^branch: *${BRANCH//\//\\/}( |$|#)" "$f" 2>/dev/null; then PLAN="$f"; break; fi
done
[[ -z "$PLAN" ]] && exit 0

input=$(cat)
# Pull file_path without jq (bash regex; file_path never contains a quote in practice)
[[ "$input" =~ \"file_path\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]] || exit 0
FILE="${BASH_REMATCH[1]}"
posix_path FILE   # Windows (local patch)

# Normalise to a repo-relative path
REL="${FILE#"$ROOT"/}"

# Editing the plan itself, or the plan dir, is always fine
[[ "$REL" == "$PLAN" || "$REL" == "$PLAN_DIR"/* ]] && exit 0

# Listed in the plan? (match the path as a table cell: `path` ) — also accept a parent dir listed with a trailing /
if grep -qF "\`$REL\`" "$PLAN" 2>/dev/null; then exit 0; fi
DIR="$REL"
while [[ "$DIR" == */* ]]; do
    DIR="${DIR%/*}"
    grep -qF "\`$DIR/\`" "$PLAN" 2>/dev/null && exit 0
done

PLAN_ID="${PLAN##*/}"; PLAN_ID="${PLAN_ID%%-[!0-9]*}"    # PLAN-003-widgets.md → PLAN-003
cat >&2 <<MSG
⚠ plan-sync: \`$REL\` is not in $PLAN_ID — amend the plan in this commit (Departures from plan) or revert

  plan: $PLAN
  The *Files that change* table is exhaustive by rule; a file edited outside it is drift that
  /review will flag. Either add the row (with one line under *Departures from plan* saying why)
  or undo the edit.
MSG
exit 0
