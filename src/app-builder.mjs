// Toby: builds a book's companion app (one self-contained HTML file) from the same Markdown parts make_book reads.
// The design lives in the template (kept in the team folder, so it can change without a new build); this file only
// turns the Markdown into the data the template shows, and checks it. Ported from the proven make-app.mjs script.
import {readFileSync} from 'node:fs';
import {palette, appRootCSS} from './palettes.mjs';
const FONT_DIR = new URL('./book-fonts/', import.meta.url);
let fontCss = '';
function fonts() {
  if (fontCss) return fontCss;
  const face = (family, file, weight, style) => `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(new URL(file + '.woff2', FONT_DIR)).toString('base64')}) format('woff2')}`;
  fontCss = [...[400, 500, 600, 700, 800].map((w) => face('Outfit', 'outfit-' + w, w, 'normal')),
    face('Source Serif 4', 'source-serif-400', 400, 'normal'), face('Source Serif 4', 'source-serif-600', 600, 'normal'), face('Source Serif 4', 'source-serif-400-italic', 400, 'italic')].join('\n');
  return fontCss;
}
/** The folder key that keeps one edition's saved progress apart from another's: ebooks/<book>/editions/<handle> gives "<book>-<handle>". */
export function appSlug(bookDir) {
  const p = String(bookDir).replace(/\\/g, '/').split('/').filter(Boolean); const i = p.lastIndexOf('editions');
  return i > 0 && i === p.length - 2 ? p[i - 1] + '-' + p[i + 1] : p[p.length - 1] || 'book';
}
/**
 * files: {parts: [markdown...], plan, voice, appJson} (plain text; missing ones are '').
 * Returns {html, check}; check.passed is false when check.problems lists anything.
 */
export function buildApp({files, bookDir, coverDataUrl, template, creator = '', palette: paletteName = 'pine'}) {
  let appJson = {};
  if (files.appJson) { try { appJson = JSON.parse(files.appJson); } catch (e) { throw new Error('app.json could not be read: ' + e.message); } }
  const planLine = (k) => (((files.plan || '') + '\n' + (files.voice || '')).match(new RegExp('^[-*\\s]*' + k + ':\\s*(.+)$', 'mi')) || [])[1];
  const CONFIG = {
    title: appJson.title || planLine('Title') || 'Untitled',
    subtitle: appJson.subtitle || planLine('Subtitle') || '',
    slug: appJson.slug || appSlug(bookDir),
    creator: creator || appJson.author || planLine('Author') || (((files.voice || '').match(/^[-*\s"]*by\s+([^"\n(]+?)["\s]*(\(.*)?$/mi) || [])[1] || ''),
    listStarters: appJson.listStarters || ["Vet's phone number", 'Emergency vet number', 'Poison line number', "Midday helper's phone number"],
    requiredTools: Array.isArray(appJson.requiredTools) ? appJson.requiredTools : ['potty', 'tracker', 'planner', 'list', 'social'],
  };
  for (const k of ['title', 'subtitle', 'creator']) CONFIG[k] = String(CONFIG[k]).trim();
  const parts = files.parts.map((f) => String(f).replace(/\r\n/g, '\n')).join('\n\n');

  // ---------- text helpers ----------
  function curly(s) {
    return s
      .replace(/(^|[\s(\[|>*])"/g, '$1“')
      .replace(/"/g, '”')
      .replace(/(^|[\s(\[])'/g, '$1‘')
      .replace(/'/g, '’');
  }
  const clean = (s) => curly(s.trim());
  const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => clean(c));

  // ---------- split into sections ----------
  const sections = [];
  let cur = null;
  for (const line of parts.split('\n')) {
    const m = line.match(/^## (.+)$/);
    if (m) { cur = { heading: m[1].trim(), lines: [] }; sections.push(cur); }
    else if (cur) cur.lines.push(line);
  }

  const LABELS = {
    'the short version': 'short', 'try tonight': 'try', remember: 'remember', stat: 'stat', steps: 'steps',
    checklist: 'checklist', timeline: 'timeline', before: 'before', after: 'after', quote: 'quote',
    'key idea': 'key', facts: 'facts', 'red flag': 'redflag', 'safety note': 'safety',
  };
  const TOOLS = [
    [/potty log/i, 'potty'], [/try tracker/i, 'tracker'], [/weekly planner/i, 'planner'],
    [/list page/i, 'list'], [/socialising checklist/i, 'social'],
  ];

  function parseBlocks(lines) {
    const blocks = [];
    let i = 0, lastH3 = '';
    const isList = (l) => /^(-|\d+\.)\s+/.test(l);
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if (line.startsWith('### ')) { lastH3 = line.slice(4).trim(); blocks.push({ t: 'h3', text: clean(lastH3) }); i++; continue; }
      if (line.startsWith('>')) {
        const raw = [];
        while (i < lines.length && lines[i].startsWith('>')) { raw.push(lines[i].replace(/^>\s?/, '')); i++; }
        const m = raw[0].match(/^([A-Za-z][A-Za-z '\u2019,.-]*?):\s*(.*)$/);
        let type = m ? LABELS[m[1].trim().toLowerCase()] : null;
        // creator editions add boxes such as "> From Sam's walk: ..."
        if (m && !type && /^from\s+\S/i.test(m[1])) { blocks.push({ t: 'from', title: clean(m[1].trim()), text: clean([m[2], ...raw.slice(1)].join(' ')) }); continue; }
        if (!type) { blocks.push({ t: 'quote', text: clean(raw.join(' ')) }); continue; }
        const head = m[2].trim();
        const rest = raw.slice(1).filter((l) => l.trim());
        const items = rest.filter(isList).map((l) => clean(l.replace(/^(-|\d+\.)\s+/, '')));
        if (type === 'stat') { const [v, ...d] = head.split('|'); blocks.push({ t: 'stat', value: clean(v), text: clean(d.join('|')) }); }
        else if (['remember', 'steps', 'facts'].includes(type)) blocks.push({ t: type, items: items.map((x) => x.replace(/\s*\|\s*/, ' ')) });
        else if (['checklist', 'timeline'].includes(type)) blocks.push({ t: type, title: clean(head), items });
        else blocks.push({ t: type, text: clean(head) });
        continue;
      }
      if (line.trim().startsWith('|')) {
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++; }
        const head = splitRow(rows[0]);
        const body = rows.slice(1).filter((r) => !(/^\s*\|[\s:|-]+\|\s*$/.test(r) && r.includes('-'))).map(splitRow);
        const h0 = head[0].toLowerCase();
        const fillIn = body.length > 0 && body.every((r) => r.slice(1).every((c) => !c));
        if (/^(say this|instead of thinking)/.test(h0)) blocks.push({ t: 'say', head, rows: body });
        else if (h0 === 'time' && head.length === 2) blocks.push({ t: 'clock', rows: body });
        else if (h0 === 'day' && /focus/i.test(head[1] || '')) blocks.push({ t: 'plan', rows: body.map((r) => ({ day: +r[0], focus: r[1], text: r[2] })) });
        else if (fillIn) {
          const tool = (TOOLS.find(([re]) => re.test(lastH3)) || [null, null])[1];
          blocks.push({ t: 'tool', tool, title: clean(lastH3), head, rows: body.map((r) => r[0]) });
        } else blocks.push({ t: 'table', head, rows: body });
        continue;
      }
      if (isList(line)) {
        const ordered = /^\d+\./.test(line); const items = [];
        while (i < lines.length && isList(lines[i])) { items.push(clean(lines[i].replace(/^(-|\d+\.)\s+/, ''))); i++; }
        blocks.push({ t: ordered ? 'ol' : 'ul', items });
        continue;
      }
      blocks.push({ t: 'p', text: clean(line) }); i++;
    }
    return blocks;
  }

  // ---------- build the book model ----------
  const book = { ...CONFIG, chapters: [], sources: [], plan: [], weeks: [], tools: {}, facts: [], stalls: null, whoToCall: null };

  for (const s of sections) {
    if (/^Sources$/i.test(s.heading)) {
      for (const l of s.lines) {
        const m = l.match(/^S(\d+)\.\s+(.*?)\s+(https?:\/\/\S+)\s*$/);
        if (!m) continue;
        const bits = m[2].replace(/\.$/, '').split(/\.\s+/);
        const year = bits.length > 2 ? bits.pop() : '';
        const org = bits.length > 1 ? bits.pop() : '';
        book.sources.push({ n: +m[1], title: clean(bits.join('. ')), org: clean(org), year: clean(year), url: m[3] });
      }
      continue;
    }
    if (/^contents$/i.test(s.heading)) continue; // the app has its own chapter list
    const cm = s.heading.match(/^Chapter (\d+):\s*(.+)$/);
    let ch;
    if (cm) ch = { id: 'ch-' + cm[1], num: +cm[1], title: clean(cm[2]) };
    else {
      // "A note before you start" / "A note from <creator>" / "Last word" / "Last word from <creator>" / anything else
      let id = /^last word/i.test(s.heading) ? 'last-word' : /^a note/i.test(s.heading) ? 'before-you-start' : s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section';
      while (book.chapters.some((c) => c.id === id)) id += '-2';
      ch = { id, num: 0, title: clean(s.heading) };
    }
    const blocks = parseBlocks(s.lines);
    ch.short = (blocks.find((b) => b.t === 'short') || {}).text || '';
    ch.sections = blocks.filter((b) => b.t === 'h3').map((b) => b.text);
    ch.blocks = blocks.filter((b) => b.t !== 'short');
    ch.words = s.lines.join(' ').split(/\s+/).length;
    for (const b of blocks) {
      if (b.t === 'plan') book.plan = b.rows;
      if (b.t === 'timeline') book.weeks = b.items.map((x) => x.replace(/^Week \d+:\s*/, ''));
      if (b.t === 'tool' && b.tool) book.tools[b.tool] = { title: b.title, head: b.head, rows: b.rows, chapter: ch.num };
      if (b.t === 'facts') for (const f of b.items) if (!book.facts.some((x) => x.text === f)) book.facts.push({ text: f, ch: ch.num });
      if (b.t === 'table' && /^what you see/i.test(b.head[0])) book.stalls = { head: b.head, rows: b.rows, chapter: ch.num };
      if (b.t === 'table' && /^problem/i.test(b.head[0])) book.whoToCall = { head: b.head, rows: b.rows, chapter: ch.num };
    }
    book.chapters.push(ch);
  }

  // ---------- self-check (the app's version of book-check.md) ----------
  const all = JSON.stringify(book.chapters) ;
  const cited = new Set([...all.matchAll(/\[S[\d,\sS]+\]/g)].flatMap((m) => [...m[0].matchAll(/\d+/g)].map((x) => +x[0])));
  const known = new Set(book.sources.map((s) => s.n));
  const check = {
    chapters: book.chapters.filter((c) => c.num).length,
    planDays: book.plan.length,
    sources: book.sources.length,
    citedButMissing: [...cited].filter((n) => !known.has(n)),
    neverCited: [...known].filter((n) => !cited.has(n)),
    tools: Object.keys(book.tools),
    facts: book.facts.length,
    sayTables: book.chapters.reduce((n, c) => n + c.blocks.filter((b) => b.t === 'say').length, 0),
    tryTonight: book.chapters.reduce((n, c) => n + c.blocks.filter((b) => b.t === 'try').length, 0),
    creatorGaps: (all.match(/\[Creator:/g) || []).length,
    fromBoxes: book.chapters.reduce((n, c) => n + c.blocks.filter((b) => b.t === 'from').length, 0),
    title: CONFIG.title, author: CONFIG.creator,
    untypedTables: book.chapters.flatMap((c) => c.blocks.filter((b) => b.t === 'tool' && !b.tool).map((b) => c.id + ': ' + b.title)),
    words: book.chapters.reduce((n, c) => n + c.words, 0),
  };
  const problems = [];
  if (CONFIG.title === 'Untitled') problems.push('No title found: add app.json or a "Title:" line in plan.md');
  const ids = book.chapters.map((c) => c.id); if (new Set(ids).size !== ids.length) problems.push('Two sections share an id: ' + ids.join(', '));
  if (check.planDays !== 30) problems.push('Plan table does not have 30 days');
  if (check.citedButMissing.length) problems.push('Cited but not in Sources: ' + check.citedButMissing.join(', '));
  for (const t of CONFIG.requiredTools) if (!check.tools.includes(t)) problems.push('Fill-in table not found: ' + t);
  if (check.untypedTables.length) problems.push('Fill-in table with no app tool: ' + check.untypedTables.join('; '));
  check.passed = problems.length === 0; check.problems = problems;

  if (!template.includes('"__BOOK_DATA__"')) throw new Error('The app template has no "__BOOK_DATA__" marker.');
  const {requiredTools, ...shown} = book;
  // The palette's colours go in a second :root straight after the template's own, so they win; the
  // theme-color meta and the one fixed hover colour follow the palette too.
  const P = palette(paletteName).app;
  const rooted = template.replace(/(:root\{[^}]*\})/, (m) => m + '\n' + appRootCSS(paletteName))
    .replace(/(<meta name="theme-color" content=")#[0-9A-Fa-f]{6}(">)/, (m, a, b) => a + P.deep + b)
    .replace(/(\.btn\.gold:hover\{background:)#[0-9A-Fa-f]{6}(\})/, (m, a, b) => a + P['gold-hover'] + b);
  const html = rooted.replace('/*__FONTS__*/', () => fonts())
    .replace('"__BOOK_DATA__"', () => JSON.stringify(shown).replace(/</g, '\\u003c'))
    .replace(/__COVER__/g, () => coverDataUrl || '')
    .replace(/__TITLE__/g, () => `${CONFIG.title}: the companion app`)
    .replace(/__SHORT__/g, () => CONFIG.title.replace(/"/g, '').slice(0, 24));
  return {html, check};
}
/** Plain instructions for the bot, like make_book's toFix. */
export function appToFix(check) {
  const out = [...check.problems];
  if (check.creatorGaps) out.push(check.creatorGaps + ' "[Creator: ...]" gap(s) are still in the text. That is fine for a sample the creator will fill in; say so in your note.');
  return out;
}
