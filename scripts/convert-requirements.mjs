#!/usr/bin/env node
/**
 * Requirement source converter — raw `.docx` → committed `.md` twin.
 *
 * WHY THIS EXISTS
 * ---------------
 * Authoritative requirement documents that ship as `.docx` are invisible to grep,
 * cost a conversion step to read, and are therefore skipped. Measured cost of one
 * such skip: ~2.2h of rework. This script removes the friction permanently by
 * committing a markdown twin beside every raw source.
 *
 * WHY NOT `textutil`
 * ------------------
 * `textutil -convert html` works and preserves tables, but flattens EVERY
 * paragraph to `<p class="p1">` — heading levels are lost. Section anchors are
 * load-bearing here (a derived spec cites `section:` in its frontmatter), so this
 * parses `word/document.xml` directly, where `w:pStyle` carries the real
 * `Heading1..6` levels.
 *
 * SCOPE (honesty)
 * ---------------
 * `.docx` only, read with a dependency-free zip reader so it works on Windows as
 * well as POSIX. `.html` and `.xlsx` sources are reported as unsupported rather
 * than half-converted — see the summary output. Conversion preserves headings,
 * paragraphs, tables, and bold runs; it does NOT preserve comments, tracked
 * changes, or embedded images. Where those carry meaning the raw file remains
 * authoritative (`.claude/rules/requirement-sources.md`).
 *
 * IDEMPOTENT
 * ----------
 * Re-running rewrites the twin from the raw source. Byte-identical output is left
 * untouched so the mtime (and any drift hash) is stable.
 *
 * RUN
 * ---
 *   node scripts/convert-requirements.mjs            # convert all configured roots
 *   node scripts/convert-requirements.mjs --check    # exit 1 if any twin is missing/stale
 *   node scripts/convert-requirements.mjs <file.docx>
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

/** Directories scanned for raw requirement sources (repo-relative). */
const SOURCE_ROOTS = ['artifacts preparation references'];

/** Extensions we can faithfully convert. Anything else is reported, not guessed at. */
const SUPPORTED = new Set(['.docx']);
const KNOWN_UNSUPPORTED = new Set(['.html', '.xlsx', '.xls', '.pdf', '.doc', '.pptx']);

// ── XML helpers ────────────────────────────────────────────────────────────

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

/** Decode the five XML entities; numeric refs are passed through as-is. */
function decodeXml(s) {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m]);
}

/** Escape the markdown characters that would otherwise change rendering. */
function escapeMd(s) {
  return s.replace(/([|\\])/g, '\\$1');
}

/**
 * Slice the top-level block elements out of `<w:body>`. Paragraphs inside a table
 * belong to that table, so this scans sequentially and consumes whole `<w:tbl>`
 * blocks (depth-counted for the rare nested table) rather than regexing `<w:p>`
 * globally.
 */
function topLevelBlocks(bodyXml) {
  const blocks = [];
  let i = 0;
  while (i < bodyXml.length) {
    const pIdx = bodyXml.indexOf('<w:p', i);
    const tIdx = bodyXml.indexOf('<w:tbl', i);
    // Reject `<w:pPr>`/`<w:tblPr>` style false starts: a real block tag is
    // followed by '>' or whitespace or '/'.
    const isTag = (idx, name) =>
      idx !== -1 && /[\s/>]/.test(bodyXml[idx + name.length] ?? '');
    const pOk = isTag(pIdx, '<w:p');
    const tOk = isTag(tIdx, '<w:tbl');
    if (!pOk && !tOk) break;

    const takeParagraph = pOk && (!tOk || pIdx < tIdx);
    if (takeParagraph) {
      // Self-closing empty paragraph.
      const selfClose = bodyXml.startsWith('<w:p/>', pIdx);
      if (selfClose) {
        i = pIdx + '<w:p/>'.length;
        continue;
      }
      const end = bodyXml.indexOf('</w:p>', pIdx);
      if (end === -1) break;
      blocks.push({ kind: 'p', xml: bodyXml.slice(pIdx, end + '</w:p>'.length) });
      i = end + '</w:p>'.length;
    } else {
      // Depth-count nested tables.
      let depth = 0;
      let j = tIdx;
      let end = -1;
      while (j < bodyXml.length) {
        const open = bodyXml.indexOf('<w:tbl', j);
        const close = bodyXml.indexOf('</w:tbl>', j);
        if (close === -1) break;
        if (open !== -1 && open < close && /[\s/>]/.test(bodyXml[open + 6] ?? '')) {
          depth += 1;
          j = open + 6;
        } else {
          depth -= 1;
          j = close + '</w:tbl>'.length;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end === -1) break;
      blocks.push({ kind: 'tbl', xml: bodyXml.slice(tIdx, end) });
      i = end;
    }
  }
  return blocks;
}

/** Concatenate a paragraph's runs, wrapping bold runs in `**`. */
function paragraphText(pXml) {
  const runs = pXml.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) ?? [];
  let out = '';
  for (const run of runs) {
    const texts = run.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [];
    let text = texts
      .map((t) => decodeXml(t.replace(/<w:t(?:\s[^>]*)?>/, '').replace(/<\/w:t>$/, '')))
      .join('');
    if (text === '') {
      // A run may carry only a tab or break.
      if (/<w:tab\/?>/.test(run)) text = ' ';
      else if (/<w:br\/?>/.test(run)) text = ' ';
      else continue;
    }
    const bold = /<w:rPr>[\s\S]*?<w:b\/?>/.test(run);
    out += bold ? `**${text}**` : text;
  }
  // Collapse the `**a****b**` seam produced by adjacent bold runs.
  return out.replace(/\*\*\*\*/g, '').trim();
}

/** Heading level from `w:pStyle`, or 0 for body text. */
function headingLevel(pXml) {
  const m = pXml.match(/<w:pStyle w:val="Heading(\d)"\/?>/);
  return m ? Number(m[1]) : 0;
}

/** Render a `<w:tbl>` as a markdown table; first row becomes the header. */
function tableToMarkdown(tblXml) {
  const rows = tblXml.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) ?? [];
  const grid = rows.map((row) => {
    const cells = row.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) ?? [];
    return cells.map((cell) => {
      const paras = cell.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
      // Multi-paragraph cells join with <br> so the row stays on one markdown line.
      return escapeMd(paras.map(paragraphText).filter(Boolean).join('<br>'));
    });
  });
  if (grid.length === 0) return '';
  const width = Math.max(...grid.map((r) => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill('')];
  const [head, ...body] = grid;
  const lines = [
    `| ${pad(head).join(' | ')} |`,
    `| ${Array(width).fill('---').join(' | ')} |`,
    ...body.map((r) => `| ${pad(r).join(' | ')} |`),
  ];
  return lines.join('\n');
}

/**
 * Read one entry out of a ZIP archive (a `.docx` IS a zip) without shelling out
 * and without a dependency.
 *
 * This previously ran `unzip -p`, which is **not present on Windows** — and
 * session timing shows this team runs Windows. Rather than add a dependency or a
 * platform branch, walk the archive directly: locate the End of Central Directory,
 * scan its entries for the wanted name, then inflate that entry's data.
 *
 * Handles the two methods a `.docx` ever uses — stored (0) and deflate (8).
 * ZIP64 archives (>4 GB, >65535 entries) are not handled; a requirement document
 * is never that large, and the failure is a clear throw rather than bad output.
 */
function readZipEntry(absPath, wantedName) {
  const buf = readFileSync(absPath);

  // End of Central Directory: signature 0x06054b50, within the last 64 KB.
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error(`${path.basename(absPath)}: not a zip (no EOCD record)`);

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16); // central directory offset

  for (let n = 0; n < entryCount; n += 1) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) {
      throw new Error(`${path.basename(absPath)}: corrupt central directory`);
    }
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf-8', ptr + 46, ptr + 46 + nameLen);

    if (name === wantedName) {
      // The local header repeats the name/extra lengths — and its extra field can
      // differ from the central one, so the data offset must come from here.
      if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error(`${path.basename(absPath)}: corrupt local header for ${name}`);
      }
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compressedSize);
      if (method === 0) return data.toString('utf-8');
      if (method === 8) return inflateRawSync(data).toString('utf-8');
      throw new Error(`${path.basename(absPath)}: unsupported zip method ${String(method)}`);
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${path.basename(absPath)}: no ${wantedName} entry`);
}

/** Convert one `.docx` to markdown text. */
function docxToMarkdown(absPath) {
  const xml = readZipEntry(absPath, 'word/document.xml');
  const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (bodyMatch === null) throw new Error('no <w:body> in word/document.xml');

  const out = [];
  for (const block of topLevelBlocks(bodyMatch[1])) {
    if (block.kind === 'tbl') {
      const md = tableToMarkdown(block.xml);
      if (md) out.push(md);
      continue;
    }
    const text = paragraphText(block.xml);
    if (text === '') continue;
    const level = headingLevel(block.xml);
    out.push(level > 0 ? `${'#'.repeat(level)} ${text}` : text);
  }
  return `${out.join('\n\n')}\n`;
}

/** The generated-file banner, so nobody hand-edits a twin. */
function banner(relSource) {
  return [
    '<!--',
    '  GENERATED FILE — do not edit by hand.',
    `  Source of record: ${relSource}`,
    '  Regenerate: node scripts/convert-requirements.mjs',
    '  Conversion preserves headings, paragraphs, tables and bold runs. It does NOT',
    '  preserve comments, tracked changes or embedded images — where those carry',
    '  meaning, the raw source remains authoritative.',
    '-->',
    '',
  ].join('\n');
}

// ── Driver ─────────────────────────────────────────────────────────────────

function findSources(repoRoot) {
  const found = [];
  for (const root of SOURCE_ROOTS) {
    const abs = path.join(repoRoot, root);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      const full = path.join(abs, name);
      if (!statSync(full).isFile()) continue;
      const ext = path.extname(name).toLowerCase();
      if (SUPPORTED.has(ext) || KNOWN_UNSUPPORTED.has(ext)) {
        found.push({ abs: full, rel: path.join(root, name), ext });
      }
    }
  }
  return found.sort((a, b) => a.rel.localeCompare(b.rel));
}

function main() {
  const repoRoot = process.cwd();
  const argv = process.argv.slice(2);
  const checkOnly = argv.includes('--check');
  const explicit = argv.filter((a) => !a.startsWith('--'));

  const sources =
    explicit.length > 0
      ? explicit.map((p) => ({
          abs: path.resolve(repoRoot, p),
          rel: path.relative(repoRoot, path.resolve(repoRoot, p)),
          ext: path.extname(p).toLowerCase(),
        }))
      : findSources(repoRoot);

  const converted = [];
  const unchanged = [];
  const skipped = [];
  const stale = [];
  const curated = [];

  for (const src of sources) {
    if (!SUPPORTED.has(src.ext)) {
      skipped.push(src);
      continue;
    }
    const twin = src.abs.replace(/\.docx$/i, '.md');
    const relTwin = path.relative(repoRoot, twin);
    let md;
    try {
      md = banner(src.rel) + docxToMarkdown(src.abs);
    } catch (err) {
      console.error(`  FAIL  ${src.rel} — ${err.message}`);
      process.exitCode = 1;
      continue;
    }
    const existing = existsSync(twin) ? readFileSync(twin, 'utf-8') : null;
    if (existing === md) {
      unchanged.push(relTwin);
      continue;
    }
    // NEVER clobber a hand-curated twin. Only a file this script generated (it
    // carries the banner) or a file that does not exist yet may be written. A
    // hand-written twin is usually BETTER than the machine conversion — the
    // curated `Ticketing Application Requirement.md` has real heading levels the converter
    // cannot recover, because that source styles its headings directly rather
    // than with `Heading1..6`.
    if (existing !== null && !existing.startsWith('<!--\n  GENERATED FILE')) {
      curated.push(relTwin);
      continue;
    }
    if (checkOnly) {
      stale.push(relTwin);
      continue;
    }
    writeFileSync(twin, md);
    converted.push(relTwin);
  }

  for (const c of converted) console.log(`  WROTE  ${c}`);
  for (const u of unchanged) console.log(`  OK     ${u}`);
  for (const s of stale) console.log(`  STALE  ${s}`);
  for (const c of curated) {
    console.log(`  KEEP   ${c} — hand-curated twin, not overwritten`);
  }
  for (const s of skipped) {
    console.log(`  SKIP   ${s.rel} — ${s.ext} conversion unsupported; read or convert by hand`);
  }

  console.log(
    `\n${String(converted.length)} written · ${String(unchanged.length)} up to date · ` +
      `${String(curated.length)} curated (kept) · ${String(stale.length)} stale · ` +
      `${String(skipped.length)} unsupported`,
  );

  if (checkOnly && stale.length > 0) {
    console.error('\nRun: node scripts/convert-requirements.mjs');
    process.exitCode = 1;
  }
}

main();
