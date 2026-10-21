#!/bin/sh
# tool-log.sh — one JSON line per tool call, for run artifacts and /session-timing.
#
# Wired as PreToolUse ($1=pre) and PostToolUse ($1=post). Appends to
#   .claude/session-state/tool-log.jsonl
# a record per completed tool call:
#   {"ts":<epoch_ms>,"tool":"Edit","duration_ms":123,"decision":"allow",
#    "target":"<file_path | first 80 chars of command | "">","session":"<id>"}
#
# Gate hooks (contract-first-gate.sh, test-protection-gate.sh) append their own line with
# "decision":"blocked" when they refuse an action, so the log is also the audit trail of every
# allow/block decision — the per-run evidence an unattended run uploads as an artifact
# (sukitha/ai-factory, run-agent.sh).
#
# Duration = PostToolUse time − the PreToolUse time stored per session in
# .claude/session-state/.tool-start.<session>. Tool calls issued in parallel within one turn
# share a start file, so their durations are approximate; sequential calls are exact.
#
# One perl process per event (portable millis + field extraction) — ~10 ms. To disable, remove
# the tool-log.sh entries from .claude/settings*.json.

EVENT="${1:-post}"
DIR="${TL_DIR:-.claude/session-state}"
mkdir -p "$DIR" 2>/dev/null

cat | TL_EVENT="$EVENT" TL_DIR="$DIR" perl -MTime::HiRes -0777 -ne '
  my $now  = int(Time::HiRes::time()*1000);
  my ($tool) = /"tool_name"\s*:\s*"([^"]*)"/;
  my ($sess) = /"session_id"\s*:\s*"([^"]*)"/;
  $tool //= ""; $sess //= "unknown";
  my $start = "$ENV{TL_DIR}/.tool-start.$sess";
  if ($ENV{TL_EVENT} eq "pre") {
    if (open(my $f, ">", $start)) { print $f $now; close $f; }
    exit 0;
  }
  my $dur = "";
  if (open(my $f, "<", $start)) { my $t0 = <$f>; close $f; $dur = $now - $t0 if defined $t0 && $t0 =~ /^\d+$/; }
  my ($target) = /"file_path"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  ($target)    = /"command"\s*:\s*"((?:[^"\\]|\\.)*)"/ unless defined $target;
  $target //= ""; $target = substr($target, 0, 80); $target =~ s/[\\"]/ /g;
  open(my $o, ">>", "$ENV{TL_DIR}/tool-log.jsonl") or exit 0;
  printf $o "{\"ts\":%d,\"tool\":\"%s\",\"duration_ms\":%s,\"decision\":\"allow\",\"target\":\"%s\",\"session\":\"%s\"}\n",
    $now, $tool, ($dur eq "" ? "null" : $dur), $target, $sess;
  close $o;
'
exit 0
