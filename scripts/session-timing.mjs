#!/usr/bin/env node
// session-timing.mjs — per-sub-action timing for a Claude Code session.
//
// Reads a session transcript (the JSONL Claude Code writes under
// ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl) and reports:
//   - per-tool wall-clock (main thread + subagent/sidechain internals, expanded)
//   - aggregate time by tool type
//   - per-turn model timing (turn_duration) so tool time vs thinking time is separable
//
// Timing model: a tool's wall-clock = (its tool_result timestamp) − (its tool_use
// timestamp). That gap is tool execution only; model "thinking" between tools lives
// in the per-turn `turn_duration` events, reported separately.
//
// Usage:
//   node scripts/session-timing.mjs                 # newest session for this repo
//   node scripts/session-timing.mjs <session-id>    # a specific session
//   node scripts/session-timing.mjs <path.jsonl>    # an explicit transcript file
//   node scripts/session-timing.mjs --list          # list available sessions
//   node scripts/session-timing.mjs --json          # machine-readable (paste to Claude)
//   node scripts/session-timing.mjs --top 20        # cap the per-call table (default 30)
//
// Feed the --json output back to Claude for analysis of where a session spent its time.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--top' && args[i - 1] !== '--dir');

const AS_JSON = flag('--json');
const TOP = parseInt(opt('--top', '30'), 10);

// --- locate the transcript dir Claude Code uses for this repo ---
// Claude encodes the project cwd by replacing every '/' with '-'.
function projectDir(cwd) {
  return path.join(os.homedir(), '.claude', 'projects', cwd.replace(/\//g, '-'));
}
const dir = opt('--dir', projectDir(process.cwd()));

function listSessions() {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
}

function resolveTarget() {
  const arg = positional[0];
  if (arg) {
    if (arg.endsWith('.jsonl') && fs.existsSync(arg)) return arg; // explicit path
    const byId = path.join(dir, arg.endsWith('.jsonl') ? arg : `${arg}.jsonl`);
    if (fs.existsSync(byId)) return byId;
    console.error(`No transcript found for "${arg}" in ${dir}`);
    process.exit(1);
  }
  const sessions = listSessions();
  if (!sessions.length) {
    console.error(`No .jsonl transcripts in ${dir}. Pass a path explicitly, or --dir <dir>.`);
    process.exit(1);
  }
  return sessions[0].file;
}

if (flag('--list')) {
  const rows = listSessions();
  if (!rows.length) {
    console.error(`No transcripts in ${dir}`);
    process.exit(1);
  }
  console.log(`Sessions in ${dir} (newest first):`);
  for (const r of rows) {
    console.log(`  ${new Date(r.mtime).toISOString()}  ${path.basename(r.file, '.jsonl')}`);
  }
  process.exit(0);
}

// --hooklog [path]: analyze the per-tool-call log written by the tool-log.sh
// Pre/PostToolUse hooks (.claude/session-state/tool-log.jsonl). Each line is
// {"ts","tool","duration_ms","decision","target","session"} — duration_ms is the
// real pre→post execution gap (no idle), and gate hooks add decision:"blocked" lines.
if (flag('--hooklog')) {
  const DEFAULT_LOG = '.claude/session-state/tool-log.jsonl';
  const logPath = opt('--hooklog', DEFAULT_LOG);
  const p = fs.existsSync(logPath) ? logPath : path.resolve(process.cwd(), DEFAULT_LOG);
  if (!fs.existsSync(p)) {
    console.error(`No hook log at ${p}. Enable the tool-log.sh hooks first (see .claude/hooks/tool-log.sh).`);
    process.exit(1);
  }
  const hookCalls = [];
  const blocked = {};
  for (const line of fs.readFileSync(p, 'utf8').trim().split('\n')) {
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    if (!rec || !rec.tool) continue;
    if (rec.decision === 'blocked') { blocked[rec.hook || 'hook'] = (blocked[rec.hook || 'hook'] || 0) + 1; continue; }
    if (typeof rec.duration_ms === 'number') hookCalls.push({ tool: rec.tool, ms: rec.duration_ms, target: rec.target || '' });
  }
  const agg = {};
  for (const c of hookCalls) (agg[c.tool] ||= { tool: c.tool, n: 0, ms: 0 }), (agg[c.tool].n++, (agg[c.tool].ms += c.ms));
  const total = hookCalls.reduce((s, c) => s + c.ms, 0);
  const f = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms');
  if (AS_JSON) {
    console.log(JSON.stringify({ source: 'hooklog', file: p, totalExecMs: total, calls: hookCalls.length, blocked, byTool: Object.values(agg).sort((a, b) => b.ms - a.ms) }, null, 2));
  } else {
    console.log(`Hook log : ${p}`);
    console.log(`Accurate tool execution (pre→post): ${f(total)} across ${hookCalls.length} calls\n`);
    console.log('     time  calls  tool');
    for (const a of Object.values(agg).sort((x, y) => y.ms - x.ms)) {
      console.log(`${f(a.ms).padStart(9)}  ${String(a.n).padStart(5)}  ${a.tool}`);
    }
    const nb = Object.values(blocked).reduce((s, n) => s + n, 0);
    if (nb) console.log(`\nBlocked by gate hooks: ${nb} (${Object.entries(blocked).map(([h, n]) => `${h}: ${n}`).join(', ')})`);
  }
  process.exit(0);
}

const file = resolveTarget();
const raw = fs.readFileSync(file, 'utf8').trim().split('\n');

// --- parse ---
const entries = [];
for (const line of raw) {
  try {
    entries.push(JSON.parse(line));
  } catch {
    /* skip malformed line */
  }
}

// Short, human label for a tool call from its input.
function labelFor(name, input) {
  const i = input || {};
  switch (name) {
    case 'Bash':
      return (i.description || i.command || '').toString().slice(0, 60);
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return (i.file_path || '').toString().replace(process.cwd() + '/', '').slice(0, 60);
    case 'Task':
      return `${i.subagent_type || 'agent'}: ${(i.description || '').toString().slice(0, 40)}`;
    case 'Skill':
      return `/${i.skill || ''}${i.args ? ' ' + String(i.args).slice(0, 30) : ''}`;
    case 'Grep':
      return (i.pattern || '').toString().slice(0, 50);
    case 'Glob':
      return (i.pattern || '').toString().slice(0, 50);
    default:
      return '';
  }
}

// Tools whose duration is human/interactive latency (waiting on the user), not
// system execution — bucketed as 'wait' so they don't pollute tool-time totals.
const WAIT_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode']);

// Pair tool_use -> tool_result by id, diff timestamps. Reusable across the main
// transcript and each subagent transcript.
function extractCalls(items, thread, agentLabel) {
  const uses = new Map();
  const out = [];
  for (const o of items) {
    const content = o.message && o.message.content;
    if (!Array.isArray(content)) continue;
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    for (const b of content) {
      if (b.type === 'tool_use' && ts != null) {
        uses.set(b.id, { name: b.name, label: labelFor(b.name, b.input), start: ts });
      } else if (b.type === 'tool_result' && ts != null) {
        const u = uses.get(b.tool_use_id);
        if (u) {
          const thr = WAIT_TOOLS.has(u.name) ? 'wait' : thread;
          out.push({ tool: u.name, label: u.label, ms: ts - u.start, thread: thr, agent: agentLabel || null, startTs: u.start });
        }
      }
    }
  }
  return out;
}

const turns = []; // {ms}
let sessionId = null;
let branch = null;
for (const o of entries) {
  sessionId = sessionId || o.sessionId || o.session_id || null;
  branch = branch || o.gitBranch || null;
  if (o.type === 'system' && o.subtype === 'turn_duration' && o.durationMs != null) {
    turns.push({ ms: o.durationMs });
  }
}

const calls = extractCalls(entries, 'main', null);

// Subagent transcripts live beside the main file, in
// <dir>/<session-basename>/subagents/agent-*.jsonl (+ .meta.json linking to the
// parent Task via toolUseId). Expand each and attribute it to its agent.
const subDir = path.join(path.dirname(file), path.basename(file, '.jsonl'), 'subagents');
const subagents = []; // {agent, depth, n, ms}
if (fs.existsSync(subDir)) {
  for (const f of fs.readdirSync(subDir).filter((x) => x.endsWith('.jsonl'))) {
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(subDir, f.replace(/\.jsonl$/, '.meta.json')), 'utf8'));
    } catch {
      /* meta optional */
    }
    const label = `${meta.agentType || 'agent'}: ${(meta.description || '').slice(0, 40)}`;
    const items = [];
    for (const line of fs.readFileSync(path.join(subDir, f), 'utf8').trim().split('\n')) {
      try {
        items.push(JSON.parse(line));
      } catch {
        /* skip */
      }
    }
    const sc = extractCalls(items, 'subagent', label);
    calls.push(...sc);
    subagents.push({ agent: label, depth: meta.spawnDepth || 1, n: sc.length, ms: sc.reduce((s, c) => s + c.ms, 0) });
  }
}
subagents.sort((a, b) => b.ms - a.ms);

// --- aggregate ---
const byType = {};
for (const c of calls) {
  const k = `${c.thread}:${c.tool}`;
  (byType[k] ||= { thread: c.thread, tool: c.tool, n: 0, ms: 0 });
  byType[k].n += 1;
  byType[k].ms += c.ms;
}
const aggregates = Object.values(byType).sort((a, b) => b.ms - a.ms);

const sumWhere = (pred) => calls.filter(pred).reduce((s, c) => s + c.ms, 0);
const mainToolMs = sumWhere((c) => c.thread === 'main');
const subToolMs = sumWhere((c) => c.thread === 'subagent');
const waitMs = sumWhere((c) => c.thread === 'wait'); // human/interactive latency
const totalToolMs = mainToolMs + subToolMs; // execution only, excludes wait
const totalTurnMs = turns.reduce((s, t) => s + t.ms, 0);
const thinkingMs = Math.max(0, totalTurnMs - totalToolMs);

// A tool call whose gap exceeds the single longest turn is almost certainly
// inflated by idle/queue time (waiting for the result to be recorded), not real
// execution — flag it so the report doesn't mislead. Tell: totalToolMs > turnWall.
const maxTurnMs = turns.reduce((m, t) => Math.max(m, t.ms), 0);
for (const c of calls) c.suspect = c.thread !== 'wait' && maxTurnMs > 0 && c.ms > maxTurnMs;
const suspectMs = calls.filter((c) => c.suspect).reduce((s, c) => s + c.ms, 0);
const timingReliable = totalToolMs <= totalTurnMs;

const fmt = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms');

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        session: sessionId || path.basename(file, '.jsonl'),
        branch,
        file,
        turns: turns.map((t, i) => ({ turn: i + 1, ms: t.ms })),
        subagents,
        aggregatesByTool: aggregates,
        topCalls: [...calls].sort((a, b) => b.ms - a.ms).slice(0, TOP),
        totals: {
          toolMs: totalToolMs,
          mainToolMs,
          subagentToolMs: subToolMs,
          waitMs,
          turnWallMs: totalTurnMs,
          approxThinkingMs: thinkingMs,
          suspectIdleMs: suspectMs,
          timingReliable,
          toolCalls: calls.length,
          turnCount: turns.length,
        },
      },
      null,
      2
    )
  );
  process.exit(0);
}

// --- human report ---
console.log(`Session : ${sessionId || path.basename(file, '.jsonl')}`);
console.log(`Branch  : ${branch || '?'}`);
console.log(`File    : ${file}`);
console.log(
  `Totals  : ${calls.length} tool calls · ${turns.length} turns · ` +
    `tool exec ${fmt(totalToolMs)} (main ${fmt(mainToolMs)}, subagent ${fmt(subToolMs)}) · ` +
    `turn wall ${fmt(totalTurnMs)} · ~thinking ${fmt(thinkingMs)} · ` +
    `human-wait ${fmt(waitMs)}`
);
if (!timingReliable) {
  console.log(
    `\n⚠  tool exec (${fmt(totalToolMs)}) > turn wall (${fmt(totalTurnMs)}) — tool gaps are inflated by ` +
      `idle/queue time. Trust the per-turn (thinking) column; ⚠-marked tool rows are likely idle, not execution.`
  );
}

console.log(`\n=== Slowest tool calls (top ${TOP}) ===`);
console.log('     time  thread     tool          detail');
for (const c of [...calls].sort((a, b) => b.ms - a.ms).slice(0, TOP)) {
  const detail = c.agent ? `${c.label}  [${c.agent}]` : c.label;
  const mark = c.suspect ? ' ⚠' : '  ';
  console.log(`${fmt(c.ms).padStart(9)}${mark} ${c.thread.padEnd(9)}  ${c.tool.padEnd(12)}  ${detail}`);
}

if (subagents.length) {
  console.log(`\n=== Subagents (expanded from <session>/subagents/*.jsonl) ===`);
  console.log('     time  calls  agent');
  for (const s of subagents) {
    console.log(`${fmt(s.ms).padStart(9)}  ${String(s.n).padStart(5)}  ${s.agent}`);
  }
}

console.log(`\n=== Aggregate by tool ===`);
console.log('     time  calls  thread     tool');
for (const a of aggregates) {
  console.log(`${fmt(a.ms).padStart(9)}  ${String(a.n).padStart(5)}  ${a.thread.padEnd(9)}  ${a.tool}`);
}

console.log(`\n=== Per-turn model wall-clock (turn_duration) ===`);
turns.forEach((t, i) => console.log(`  turn ${String(i + 1).padStart(3)}: ${fmt(t.ms)}`));

console.log(
  `\nNote: tool time = tool_use→tool_result gap (execution only). ` +
    `Thinking ≈ turn wall − tool time. Run with --json to feed Claude.`
);
