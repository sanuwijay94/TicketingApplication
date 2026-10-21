#!/usr/bin/env node
/**
 * Requirement drift gate — the control that makes "AI reads only the spec layer" safe.
 *
 * Reading only derived specs trades one failure (reading the WRONG document) for a
 * worse one (reading a confidently STALE document — invisible, because nothing
 * looks broken). This check is what keeps the trade honest: staleness becomes a
 * red build instead of a wrong answer.
 *
 * Five failures:
 *   1. HASH DRIFT     — a spec's `source_hash` != its source's current hash.
 *   2. UNCONVERTED    — a raw .docx with no committed .md twin (invisible to grep).
 *   3. ORPHAN         — a converted requirement no spec consumes (nobody read it).
 *   4. MALFORMED      — a spec missing required frontmatter, or pointing at a
 *                       missing source / a raw .docx instead of the twin.
 *   5. UNACKNOWLEDGED — an ADR declares `Amends spec: SPEC-NNN` but that spec never
 *                       mentions the ADR. This is the BACK-PROPAGATION gate: the
 *                       hash only catches `source changed -> spec stale`. The drift
 *                       that actually bit us ran the other way — ADR-057 §D4 changed
 *                       the behaviour, the code shipped it, and the requirement layer
 *                       stayed wrong for three ADRs with a green build.
 *
 * The hash covers the CONVERTED twin, never the .docx: a Word resave changes the
 * binary without changing the content, and would fail every build for nothing.
 *
 * RUN
 *   node scripts/ci/check-requirement-drift.mjs           # report + exit code
 *   node scripts/ci/check-requirement-drift.mjs --fix-hashes   # restamp specs
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const SPEC_DIR = '.claude/planning/spec';
const SOURCE_ROOTS = ['artifacts preparation references'];
const RAW_EXT = new Set(['.docx']);
const REQUIRED_FIELDS = [
  'id',
  'title',
  'feature',
  'status',
  'source',
  'section',
  'source_hash',
  'derived',
  'owner',
];

/** First 16 hex of the file's SHA-256 — enough to detect change, short enough to read. */
function hashOf(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex').slice(0, 16);
}

/** Minimal frontmatter reader: `key: value` pairs between the leading `---` fences. */
function frontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of text.slice(4, end).split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (m === null) continue;
    fields[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  return fields;
}

function listSpecs(root) {
  const dir = path.join(root, SPEC_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => path.join(SPEC_DIR, f))
    .sort();
}

function listRawSources(root) {
  const out = [];
  for (const sub of SOURCE_ROOTS) {
    const abs = path.join(root, sub);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      const full = path.join(abs, name);
      if (!statSync(full).isFile()) continue;
      if (RAW_EXT.has(path.extname(name).toLowerCase())) out.push(path.join(sub, name));
    }
  }
  return out.sort();
}

function main() {
  const root = process.cwd();
  const fixHashes = process.argv.includes('--fix-hashes');
  const errors = [];
  const warnings = [];
  const consumed = new Set();
  let restamped = 0;

  // ── Specs: required fields, source exists, hash matches ──────────────
  const specs = listSpecs(root);
  for (const rel of specs) {
    const abs = path.join(root, rel);
    const text = readFileSync(abs, 'utf-8');
    const fm = frontmatter(text);
    if (fm === null) {
      errors.push(`MALFORMED  ${rel} — no YAML frontmatter block`);
      continue;
    }
    const missing = REQUIRED_FIELDS.filter((f) => !(f in fm) || fm[f] === '');
    if (missing.length > 0) {
      errors.push(`MALFORMED  ${rel} — missing frontmatter: ${missing.join(', ')}`);
      continue;
    }
    if (/\.(docx|doc|xlsx|xls|pdf|pptx)$/i.test(fm.source)) {
      errors.push(
        `MALFORMED  ${rel} — source points at a RAW document (${fm.source}); ` +
          `it must point at the converted .md twin`,
      );
      continue;
    }
    const srcAbs = path.join(root, fm.source);
    if (!existsSync(srcAbs)) {
      errors.push(`MALFORMED  ${rel} — source not found: ${fm.source}`);
      continue;
    }
    consumed.add(fm.source);

    const actual = hashOf(srcAbs);
    const declared = String(fm.source_hash).replace(/^sha256:/, '');
    if (declared !== actual) {
      if (fixHashes) {
        writeFileSync(
          abs,
          text.replace(
            /^source_hash:.*$/m,
            `source_hash: sha256:${actual}`,
          ),
        );
        restamped += 1;
      } else {
        errors.push(
          `DRIFT      ${rel} — a NEW VERSION of the input arrived since derivation\n` +
            `             (this does NOT mean the spec is wrong — re-read and reconcile)\n` +
            `             source:   ${fm.source}\n` +
            `             declared: sha256:${declared}\n` +
            `             actual:   sha256:${actual}\n` +
            `             → re-derive the spec, then restamp (--fix-hashes)`,
        );
      }
    }
  }

  // ── ADR back-propagation: does the spec acknowledge the amendment? ───
  //
  // An ADR that changes spec-governed behaviour declares, on its own line:
  //     **Amends spec**: SPEC-001, SPEC-004
  // The named spec must then mention that ADR id somewhere in its body — in
  // `Source divergences`, an `R<n>` rule, or Known gaps. Symmetric with the
  // `Superseded by ADR-NNN` convention the ADR layer already uses.
  const adrDir = path.join(root, '.claude/planning/adr');
  const specText = new Map(
    specs.map((rel) => [
      path.basename(rel).match(/^(SPEC-\d+)/)?.[1] ?? path.basename(rel),
      readFileSync(path.join(root, rel), 'utf-8'),
    ]),
  );
  if (existsSync(adrDir)) {
    for (const name of readdirSync(adrDir).filter((f) => f.endsWith('.md')).sort()) {
      const text = readFileSync(path.join(adrDir, name), 'utf-8');
      const decl = text.match(/^\s*(?:\*\*)?Amends spec(?:\*\*)?\s*:\s*(.+)$/m);
      if (decl === null) continue;
      const adrId = name.match(/^(ADR-\d+)/)?.[1] ?? name;
      const claimed = [...decl[1].matchAll(/SPEC-\d+/g)].map((m) => m[0]);
      if (claimed.length === 0) {
        errors.push(`MALFORMED  ${adrId} — 'Amends spec:' names no SPEC-NNN`);
        continue;
      }
      for (const specId of claimed) {
        const body = specText.get(specId);
        if (body === undefined) {
          errors.push(`UNACKNOWLEDGED ${adrId} — amends ${specId}, which does not exist`);
          continue;
        }
        if (!body.includes(adrId)) {
          errors.push(
            `UNACKNOWLEDGED ${adrId} — declares it amends ${specId}, but that spec\n` +
              `             never mentions ${adrId}. A decision changed the required\n` +
              `             behaviour and the spec layer did not follow.\n` +
              `             → record it in ${specId} (a rule, or Source divergences)`,
          );
        }
      }
    }
  }

  // ── Raw sources: converted? consumed? ────────────────────────────────
  for (const raw of listRawSources(root)) {
    const twin = raw.replace(/\.docx$/i, '.md');
    if (!existsSync(path.join(root, twin))) {
      errors.push(
        `UNCONVERTED ${raw} — no .md twin; invisible to search\n` +
          `             → node scripts/convert-requirements.mjs`,
      );
      continue;
    }
    if (!consumed.has(twin)) {
      warnings.push(
        `ORPHAN     ${twin} — converted but no spec consumes it; ` +
          `nobody has derived a governing spec from this requirement`,
      );
    }
  }

  // ── Report ───────────────────────────────────────────────────────────
  for (const w of warnings) console.log(`  WARN  ${w}`);
  for (const e of errors) console.error(`  FAIL  ${e}`);

  if (fixHashes && restamped > 0) {
    console.log(`\n  Restamped ${String(restamped)} spec hash(es).`);
  }
  console.log(
    `\n${String(specs.length)} spec(s) · ${String(errors.length)} error(s) · ` +
      `${String(warnings.length)} warning(s)`,
  );

  if (errors.length > 0) process.exitCode = 1;
}

main();
