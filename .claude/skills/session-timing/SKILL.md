---
allowed-tools: Bash(node:*), Read
description: Profile where a Claude Code session spent its time — runs scripts/session-timing.mjs and turns the numbers into a plain-English report with recommendations.
argument-hint: '[session-id | --list | latest]'
---

# /session-timing

Run the timing analyzer over a session transcript and produce a report on where the time went. The script only *reads* timings Claude Code already logged — nothing needs to be set up before a session.

## Target
$ARGUMENTS

- empty or `latest` → the newest session for this repo
- a session id → that specific session
- `--list` → just list available sessions and stop

## Steps

1. **If `--list`:** run `node scripts/session-timing.mjs --list` and show the output. Stop.

1b. **`--hooklog`:** `node scripts/session-timing.mjs --hooklog` reads `.claude/session-state/tool-log.jsonl` (written by `.claude/hooks/tool-log.sh`) for exact pre→post execution time per tool and the count of actions blocked by gate hooks. Use it when the transcript-based estimate looks off.

2. **Otherwise run the analyzer in JSON mode** so you get structured data to reason over:
   ```bash
   node scripts/session-timing.mjs <session-id-or-empty> --json --top 25
   ```
   (Pass the session id through if one was given; omit it for the newest session.)

3. **Parse the JSON** and write the report below. Use the `totals`, `turns`, `subagents`, `aggregatesByTool`, and `topCalls` fields.

## Report format

```markdown
## Session timing — <session id> (<branch>)

**Wall-clock split:** thinking ~<Xs> · tool-exec <Ys> (main <..> / subagent <..>) · human-wait <Zs>
**Scale:** <N> turns · <M> tool calls

### Where the time actually went
<2–4 sentences. Lead with the dominant bucket. If thinking ≫ tool-exec, say so — the lever is
fewer/leaner turns, not faster tools. Call out human-wait separately (it is not system cost).>

### Slowest turns (model thinking)
| Turn | Time |
|------|------|
<top 3–5 turns by turn_duration>

### Slowest tool calls
| Time | Thread | Tool | Detail |
|------|--------|------|--------|
<top 5–8 from topCalls, excluding `wait` thread>

### Aggregate by tool
<one line per tool type from aggregatesByTool, execution threads only>

### Subagents (if any)
<agent → time/calls from subagents[]; note if a Task dominated>

### Read of it
- <bottleneck 1 — e.g. "one 20-min turn = a large context / long reasoning chain">
- <bottleneck 2 — e.g. "repeated /test runs", "graph reloads", "redundant reads">
- <actionable recommendation, tied to the framework where relevant (e.g. lighter lane in /implement)>
```

## Notes (state these when relevant)
- **Tool-exec** = `tool_use → tool_result` gap (real execution wall-clock). **Thinking** = `turn wall − tool-exec` (a close estimate, not exact).
- **human-wait** (`AskUserQuestion`/`ExitPlanMode`) is time waiting on the user — never count it as slowness.
- Running this *inside* a live session only sees tool calls made so far; run it after a flow completes for the full picture.
- To profile one flow (e.g. `/implement`): run the flow, then `/session-timing` (or paste `--json` output for deeper analysis).
