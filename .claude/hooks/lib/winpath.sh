# Windows path normalisation for the harness hooks — local patch for TicketingApplication,
# not part of agent-harness-v2.
#
# Claude Code on Windows sends tool paths as `D:\\dir\\file` (JSON-escaped) or `D:\dir\file`,
# and the Windows build of jq ends every output line with \r. The hooks match on `/`-separated
# paths relative to the repo root, so without this they silently never match on Windows.
#
#   posix_path VAR    # rewrites $VAR in place: strips \r, `\` → `/`, `D:/x` → `/d/x`
#
# Pure bash, no subprocess — the gates run on every edit. A no-op for macOS/Linux paths.
# `install.sh --force` leaves this file alone but reverts the hooks that source it; re-add the
# `posix_path` lines after a harness update (see CLAUDE.md § Harness).

posix_path() {
    local p="${!1}"
    p="${p%$'\r'}"
    p="${p//\\\\//}"
    p="${p//\\//}"
    if [[ "$p" =~ ^([A-Za-z]):(/.*)?$ ]]; then
        p="/${BASH_REMATCH[1],,}${BASH_REMATCH[2]}"
    fi
    printf -v "$1" '%s' "$p"
}
