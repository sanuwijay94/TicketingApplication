#!/bin/bash
# PreToolUse hook (Edit|Write|MultiEdit): keep credentials out of the diff.
#
# Scans the content about to be written (Write.content, Edit.new_string, every MultiEdit
# new_string) for credential shapes and blocks (exit 2) before the bytes reach disk. This is the
# deterministic layer behind boundaries.md "never commit secrets": a session that never writes a
# secret cannot leak one. (Playbook, Stage 3 — build-phase hooks "keep credentials out of the diff".)
#
# Skipped: *.md, .env.example, *.sample, *.example, and any file containing a `secret-ok: <reason>`
# line (test fixtures with deliberately fake keys). Patterns are high-precision on purpose — a
# noisy gate gets disabled; tune in the PATTERNS block, not by lowering the bar.
#
# Cost: one jq to extract the content (~15 ms) + a couple of greps. ~25 ms.

input=$(cat)
FILE=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
. "${BASH_SOURCE[0]%/*}/lib/winpath.sh"; posix_path FILE   # Windows (local patch)
[[ -z "$FILE" ]] && exit 0
case "$FILE" in
    *.md|*/.env.example|.env.example|*.sample|*.example) exit 0 ;;
esac

CONTENT=$(printf '%s' "$input" | jq -r '
  .tool_input.content // .tool_input.new_string //
  ([.tool_input.edits[]?.new_string] | join("\n")) // empty')
CONTENT="${CONTENT//$'\r'/}"   # Windows jq emits CRLF (local patch)
[[ -z "$CONTENT" ]] && exit 0

# Explicit opt-out marker in the new content or the existing file (fixtures with fake keys)
if grep -qiE 'secret-ok:' <<<"$CONTENT" 2>/dev/null || { [[ -f "$FILE" ]] && grep -qiE 'secret-ok:' "$FILE" 2>/dev/null; }; then exit 0; fi

# --- PATTERNS (high-precision) ------------------------------------------------
# Known credential shapes: any hit blocks.
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                                      # AWS access key id
  '-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY'   # private key material
  'sk-ant-[A-Za-z0-9_-]{20,}'                              # Anthropic API key
  'sk-[A-Za-z0-9]{32,}'                                    # OpenAI-style secret key
  'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}'       # GitHub tokens
  'gh[ousr]_[A-Za-z0-9]{36}'                               # GitHub OAuth/user/server/refresh
  'xox[baprs]-[A-Za-z0-9-]{10,}'                           # Slack tokens
  'AIza[0-9A-Za-z_-]{35}'                                  # Google API key
)
RE=$(IFS='|'; printf '%s' "${PATTERNS[*]}")
EXCLUDE='process\.env|os\.environ|getenv|\$\{|<[A-Z_]+>|your[_-]?(api|key|secret|token)|xxx+|example|placeholder|changeme|dummy'
HIT=$(grep -nE "$RE" <<<"$CONTENT" 2>/dev/null | grep -vE "$EXCLUDE" | head -3)

# Literal assigned secret: `password = "…"`, `api_key: '…'`. Blocks only when the quoted value is
# >= 12 chars AND contains a digit — identifiers like tokenType = "refresh_token_rotation" pass.
if [[ -z "$HIT" ]]; then
    Q="[\"']"
    V="[^\"'[:space:]]+"
    GENERIC="(api[_-]?key|secret|password|passwd|token)[A-Za-z_]*[[:space:]]*[:=][[:space:]]*${Q}${V}${Q}"
    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        val=$(sed -E "s/^[0-9]+:.*[:=][[:space:]]*${Q}(${V})${Q}.*\$/\1/" <<<"$line")
        if (( ${#val} >= 12 )) && [[ "$val" =~ [0-9] ]]; then HIT="$line"; break; fi
    done < <(grep -nE "$GENERIC" <<<"$CONTENT" 2>/dev/null | grep -vE "$EXCLUDE" | head -5)
fi
[[ -z "$HIT" ]] && exit 0

cat >&2 <<MSG
⛔ Possible credential in content for \`$FILE\`

$(sed -E 's/^([0-9]+):(.{0,60}).*/  line \1: \2…/' <<<"$HIT")

Secrets never go in source (boundaries.md). Fix one of:
  1. Read it from the environment (process.env.X / os.environ) and document the variable in .env.example
  2. Move it to the CI secret store / your secrets manager
  3. If this is a deliberately fake fixture value, add a line: // secret-ok: <reason>
MSG
TOOL=$(printf '%s' "$input" | jq -r '.tool_name // ""' | tr -d '\r')
mkdir -p .claude/session-state 2>/dev/null && printf '{"ts":%s,"tool":"%s","duration_ms":null,"decision":"blocked","hook":"%s","target":"%s"}\n' \
  "$(date +%s)000" "$TOOL" "secrets-gate" "$FILE" >> .claude/session-state/tool-log.jsonl 2>/dev/null
exit 2
