// Toby: checks a creator edition against the base book it was made from. Two questions, answered by counting:
// 1. Voice: was the running text really rewritten, in every chapter, or is it the base book with a new cover?
// 2. Safety: did every number, source tag, table and chapter survive the rewrite, with nothing new slipped in?
const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).toLowerCase().replace(/\[s[\d,\ss]+\]/g, ' ').replace(/[^a-z0-9%' ]+/g, ' ').split(' ').filter(Boolean);
/** Share of words two lines have in common, in order (0 to 1). */
export function sameness(a, b) {
  const x = words(a), y = words(b); if (!x.length || !y.length) return 0;
  let prev = new Uint16Array(y.length + 1), cur = new Uint16Array(y.length + 1);
  for (let i = 1; i <= x.length; i++) { for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); [prev, cur] = [cur, prev]; }
  return 2 * prev[y.length] / (x.length + y.length);
}
const tagsIn = (s) => [...s.matchAll(/\[S[\d,\sS]+\]/g)].flatMap((m) => [...m[0].matchAll(/\d+/g)].map((n) => 'S' + n[0]));
const numbersIn = (s) => [...s.replace(/\[S[\d,\sS]+\]/g, ' ').replace(/^\s*(>\s*)?\d+\.\s/, ' ').matchAll(/\d+(?:[.,]\d+)*%?/g)].map((m) => m[0].replace(/,/g, ''));
const count = (list) => { const m = new Map(); for (const v of list) m.set(v, (m.get(v) || 0) + 1); return m; };
/** Split Markdown parts into sections ("## ..."), each with its lines sorted by kind. */
export function sections(parts) {
  const out = []; let cur = null, inFacts = false;
  for (const raw of parts.join('\n\n').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim(); const h = line.match(/^## (.+)$/);
    if (h) { const c = h[1].match(/^Chapter (\d+):/); cur = { heading: h[1].trim(), key: c ? 'Chapter ' + c[1] : /^sources$/i.test(h[1]) ? 'Sources' : /^last word/i.test(h[1]) ? 'Last word' : /^a note/i.test(h[1]) ? 'Note' : /^contents$/i.test(h[1]) ? 'Contents' : h[1].trim(), chapter: c ? +c[1] : 0, text: [], boxes: [], lists: [], tables: [], facts: [], labels: [], all: [] }; out.push(cur); inFacts = false; continue; }
    if (!cur || !line) { if (!line) inFacts = false; continue; }
    cur.all.push(line);
    if (line.startsWith('|')) { if (!/^\|[\s:|-]+\|$/.test(line)) { const last = cur.tables[cur.tables.length - 1]; if (last && last.open) last.rows.push(line); else cur.tables.push({ head: norm(line).toLowerCase(), rows: [], open: true }); } continue; }
    for (const t of cur.tables) t.open = false;
    if (line.startsWith('>')) {
      const body = line.replace(/^>\s?/, ''); const label = body.match(/^([A-Za-z][A-Za-z '’,.-]*?):/);
      if (label && !/^[-\d]/.test(body)) { inFacts = /^facts$/i.test(label[1].trim()); cur.labels.push(/^from\s/i.test(label[1]) ? 'From' : label[1].trim().toLowerCase()); }
      if (inFacts) { if (/^-\s/.test(body)) cur.facts.push(body); } else if (body && !/^from\s/i.test(body)) cur.boxes.push(body);
      continue;
    }
    inFacts = false;
    if (line.startsWith('#')) continue;
    if (/^!\[[^\]]*\]\(/.test(line)) continue;   // a picture line is shared with the base book, not text to rewrite
    if (/^(-|\d+\.)\s/.test(line)) cur.lists.push(line); else if (!/^\[Creator:[^\]]*\]$/.test(line)) cur.text.push(line);
  }
  return out;
}
const SAME = 0.8; // a base line counts as "still the base book" when an edition line shares 80% or more of its words
function rewritten(baseLines, editionLines) {
  let changed = 0;
  for (const b of baseLines) { let best = 0; for (const e of editionLines) { if (norm(e) === norm(b)) { best = 1; break; } const s = sameness(b, e); if (s > best) best = s; if (best >= SAME) break; } if (best < SAME) changed++; }
  return changed;
}
export const EDITION_RULES = Object.freeze({ textOverall: 0.75, textPerChapter: 0.6, boxesOverall: 0.5 });
/** base and edition: {parts: [markdown...]}; sources: text of sources.md (numbers found there may appear in new facts). */
export function checkEdition({ base, edition, sources = '', rules = EDITION_RULES }) {
  const B = sections(base.parts), E = sections(edition.parts), toFix = [], chapters = [];
  const find = (key) => E.find((s) => s.key === key);
  const baseNumbers = new Set([...base.parts, sources].flatMap((p) => p.split('\n').flatMap(numbersIn)));
  let textBase = 0, textChanged = 0, boxBase = 0, boxChanged = 0;
  for (const b of B) {
    if (b.key === 'Contents') continue;
    const e = find(b.key === 'Note' ? 'Note' : b.key);
    if (!e) { toFix.push(`"${b.heading}" is missing from the edition. Every chapter and section of the base book must be there, with the same chapter number.`); continue; }
    if (b.key === 'Sources') { const lost = b.all.filter((l) => !e.all.some((x) => norm(x) === norm(l))).length; if (lost) toFix.push(`The Sources list must be copied exactly: ${lost} line(s) are changed or missing.`); continue; }
    // safety: source tags, numbers, tables, boxes
    const bt = count(b.all.flatMap(tagsIn)), et = count(e.all.flatMap(tagsIn));
    const lostTags = [...bt].filter(([t, n]) => (et.get(t) || 0) < n).map(([t, n]) => `${t} (${n - (et.get(t) || 0)})`);
    if (lostTags.length) toFix.push(`${b.key}: source tags lost: ${lostTags.join(', ')}. Every fact keeps its tag.`);
    const bn = count(b.all.flatMap(numbersIn)), en = count(e.all.flatMap(numbersIn));
    const lostNumbers = [...bn].filter(([v, n]) => (en.get(v) || 0) < n).map(([v]) => v);
    if (lostNumbers.length) toFix.push(`${b.key}: numbers from the base book are missing or changed: ${lostNumbers.slice(0, 12).join(', ')}. Keep every number exactly, written the same way.`);
    const newNumbers = [...en.keys()].filter((v) => !bn.has(v) && !baseNumbers.has(v));
    if (newNumbers.length) toFix.push(`${b.key}: numbers that are not in the base book or sources.md: ${newNumbers.slice(0, 12).join(', ')}. Never add a new figure.`);
    if (e.tables.length !== b.tables.length) toFix.push(`${b.key}: has ${e.tables.length} table(s), the base book has ${b.tables.length}. Keep every table.`);
    else b.tables.forEach((t, i) => { if (e.tables[i].rows.length !== t.rows.length) toFix.push(`${b.key}: table ${i + 1} has ${e.tables[i].rows.length} rows, the base book has ${t.rows.length}.`); if (/^\|\s*(say this|day|time)\b/.test(t.head) && e.tables[i].head !== t.head) toFix.push(`${b.key}: the heading row of table ${i + 1} must stay exactly "${t.head}".`); });
    const bl = count(b.labels), el = count(e.labels);
    const lostBoxes = [...bl].filter(([l, n]) => (el.get(l) || 0) < n).map(([l]) => l);
    if (lostBoxes.length) toFix.push(`${b.key}: boxes missing: ${lostBoxes.join(', ')}. Keep every box, with its label spelled exactly.`);
    if (b.facts.length && e.facts.length < b.facts.length) toFix.push(`${b.key}: the Facts block has ${e.facts.length} facts, the base book has ${b.facts.length}.`);
    // voice
    const t = rewritten(b.text, e.text), x = rewritten(b.boxes, e.boxes);
    textBase += b.text.length; textChanged += t; boxBase += b.boxes.length; boxChanged += x;
    const share = b.text.length ? t / b.text.length : 1;
    chapters.push({ section: b.key, paragraphs: b.text.length, rewritten: t, share: Math.round(share * 100) });
    if (b.chapter && b.text.length >= 4 && share < rules.textPerChapter) toFix.push(`${b.key}: only ${t} of ${b.text.length} paragraphs are rewritten (${Math.round(share * 100)}%). Rewrite at least ${Math.round(rules.textPerChapter * 100)}% of every chapter's paragraphs in the creator's voice: new sentences, the same facts.`);
  }
  const extra = E.filter((e) => e.chapter && !B.some((b) => b.key === e.key)).map((e) => e.heading);
  if (extra.length) toFix.push(`Chapters that are not in the base book: ${extra.join('; ')}.`);
  const textShare = textBase ? textChanged / textBase : 0, boxShare = boxBase ? boxChanged / boxBase : 0;
  if (textShare < rules.textOverall) toFix.unshift(`Only ${Math.round(textShare * 100)}% of the book's paragraphs are rewritten (${textChanged} of ${textBase}). At least ${Math.round(rules.textOverall * 100)}% must be: this is still the base book. A paragraph counts as rewritten when fewer than 80% of its words match the base paragraph.`);
  if (boxShare < rules.boxesOverall) toFix.push(`Only ${Math.round(boxShare * 100)}% of the box texts (The short version, Try tonight, Remember and the rest) are rewritten (${boxChanged} of ${boxBase}). At least ${Math.round(rules.boxesOverall * 100)}% must be.`);
  const whole = edition.parts.join('\n');
  if (/[—–]/.test(whole)) toFix.push('The edition has em or en dashes. Remove them.');
  const fromLines = whole.split('\n').filter((l) => /^>\s*From\s/i.test(l.trim()));
  const emptyFrom = fromLines.filter((l) => /^>\s*From[^:]*:\s*\[Creator:[^\]]*\]\s*$/i.test(l.trim())).length;
  if (fromLines.length && emptyFrom > fromLines.length / 2) toFix.push(`${emptyFrom} of ${fromLines.length} "From ..." boxes hold nothing but a gap for the creator. Start each with one true line built from their own public posts, then the gap.`);
  const report = { textShare: Math.round(textShare * 100), textChanged, textBase, boxShare: Math.round(boxShare * 100), boxChanged, boxBase, creatorGaps: (whole.match(/\[Creator:/g) || []).length, fromBoxes: fromLines.length, emptyFromBoxes: emptyFrom, chapters };
  return { passed: toFix.length === 0, toFix, report };
}
