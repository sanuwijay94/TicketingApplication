#!/bin/bash
# PostToolUse hook: warn if console.log() is left in application source.
#   server/**/*.js          — use the `debug` logger instead (see server/bin/www)
#   clientApp/src/**/*.ts   — remove it before committing
# Skips node_modules, specs, and server/populateDB.js (a CLI seed script that prints by design).
# Retargeted for TicketingApplication (local patch); the harness original checked src/**/*.ts only.

set -e

input=$(cat)
FILE=$(echo "$input" | jq -r '.tool_input.file_path // empty')
. "${BASH_SOURCE[0]%/*}/lib/winpath.sh"; posix_path FILE   # Windows (local patch)

[[ -z "$FILE" ]] && exit 0
[[ "$FILE" =~ /node_modules/ ]] && exit 0

if [[ "$FILE" =~ /server/.*\.js$ ]] && [[ ! "$FILE" =~ /server/populateDB\.js$ ]]; then
    FIX="use the debug logger: require('debug')('project:<area>'), as in server/bin/www"
elif [[ "$FILE" =~ /clientApp/src/.*\.ts$ ]] && [[ ! "$FILE" =~ \.spec\.ts$ ]]; then
    FIX="remove it before committing"
else
    exit 0
fi

if [[ -f "$FILE" ]] && grep -qE '\bconsole\.log\(' "$FILE" 2>/dev/null; then
    echo "⚠️  console.log() found in $FILE — $FIX"
fi

exit 0
