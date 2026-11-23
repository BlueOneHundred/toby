// Toby build 36: the automatic package check.
// Claude checked every creator package by hand on 18 Nov 2026 and found faults the bots' own checks missed
// (a "From" box quote that was not the creator's words, UK spelling in a US book, a caption that promised a
// recipe the book does not hold, an email naming a chapter that holds none of the creator's boxes, quotes over
// 8 words). Every one of those checks is a rule, so they live here. The pipeline runs this after each step and
// a bot can run it with check_package. Pure functions on file text, plus one loader that reads the team folder.
import {readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';

export const CAROUSEL_LINE = "Here are 2 examples of what the launch carousels could look like, and if you like them, we'd make a launch reel together from your own clips.";
// Family words. Alone they are often about the reader ("Kids shouldn't eat raw dough"), so they only ask for a look.
export const FAMILY = /\b(kids?|kiddos?|child|children|toddlers?|daughters?|sons?|husband|hubby|wife|babies|baby|grandkids?|little helpers?|little ones)\b/i;
// Her own family, in her voice or ours ("my kids", "our toddler", "her husband"): always a fix.
export const KEEP_OUT = /\b(my|our|her|his|their)\s+(?:two\s+|2\s+|little\s+|sweet\s+)?(kids?|kiddos?|child|children|toddlers?|daughters?|sons?|husband|hubby|wife|babies|baby|grandkids?|family|little helpers?|little ones|boys|girls)\b/i;
// UK spellings that slip into US books. Whole words, any case.
export const UK_WORDS = /\b(colours?|coloured|colourful|flavours?|flavoured|flavourful|favourites?|centres?|centred|fibres?|litres?|millilitres?|mould|mouldy|grey|labelling|labelled|yoghurt|metres?|chillis?|chillies|honours?|neighbours?|behaviours?|aluminium|programme|cosy|savoury|(?:recogn|organ|real|apolog|caramel|steril|minim|maxim|personal)is(?:e|ed|es|ing))\b/gi;

export const norm = s => String(s || '').toLowerCase()
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ').trim();
// Letters, digits and apostrophes only, so "Another day - another" matches "another day, another".
export const bare = s => norm(s).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
const quotes = s => [...String(s).matchAll(/["“]([^"“”\n]{2,300})["”]/g)].map(m => m[1].trim());
const mentions = s => [...String(s).matchAll(/(^|[^\w.])@([a-z0-9_.]{2,30})/gi)].map(m => m[2].replace(/\.$/, '').toLowerCase());
const ukWords = s => [...new Set([...String(s).matchAll(UK_WORDS)].map(m => m[0].toLowerCase()))];

// The creator's own words: captions, bio and real follower comments in creators/voice/<handle>.md.
export function voiceText(voice) { return bare(voice); }
export function captionCount(voice) {
  return new Set([...String(voice).matchAll(/https:\/\/www\.instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/g)].map(m => m[1])).size;
}
// Brand accounts the creator tags in captions: their names must stay out of the package.
export function taggedBrands(voice, handle) {
  return [...new Set(mentions(voice))].filter(m => m !== handle.toLowerCase() && !/blueonehundred/.test(m));
}
const brandNames = (voice, handle) => taggedBrands(voice, handle).map(b => b.replace(/^thereal/, '').replace(/[._]+/g, ' ').trim()).filter(n => n.length >= 5);
// "US" when the voice file places the creator in the USA; "" when unknown or elsewhere (no spelling check).
export function spellingFor(voice) { return /\b(USA|United States|U\.S\.A?\.)\b/.test(String(voice).slice(0, 4000)) ? 'US' : ''; }

const outsideSources = md => { const i = md.search(/^##\s+Sources\b/m); return i < 0 ? md : md.slice(0, i); };
const boxText = line => line.replace(/^>\s*From [^:]{1,60}:\s*/, '').replace(/\[Creator:[^\]]*\]/g, '').trim();

// Chapters ("## Chapter N: ...") and the "From <name>'s <place>" boxes inside each.
export function editionBoxes(parts) {
  const boxes = []; let chapter = 0;
  for (const line of String(parts).split('\n')) {
    const h = line.match(/^##\s+Chapter\s+(\d+)\b/i);
    if (h) chapter = Number(h[1]); else if (/^##\s+/.test(line)) chapter = 0;
    if (/^>\s*From [^:]{1,60}:/.test(line)) boxes.push({chapter, line, text: boxText(line)});
  }
  return boxes;
}

function add(report, scope, level, owner, message) { report.items.push({scope, level, owner, message}); }
function scanFamily(report, scope, owner, where, text) {
  const own = text.match(KEEP_OUT), fam = text.match(FAMILY);
  if (own) add(report, scope, 'fail', owner, `${where} mentions "${own[0]}": keep the creator's family out.`);
  else if (fam) add(report, scope, 'warn', owner, `${where} says "${fam[0]}": make sure it is not about her family.`);
}

export function checkEditionText(report, {parts, voice, handle, spelling}) {
  const v = voiceText(voice), boxes = editionBoxes(parts), text = outsideSources(parts);
  if (boxes.length < 10) add(report, 'edition', 'fail', 'Edition Writer', `Only ${boxes.length} "From" boxes (at least 10 needed, one a chapter).`);
  for (const b of boxes) {
    if (!b.text) add(report, 'edition', 'fail', 'Edition Writer', `Chapter ${b.chapter}: a "From" box holds only a gap.`);
    for (const q of quotes(b.text)) if (words(q) >= 3 && !v.includes(bare(q))) add(report, 'edition', 'fail', 'Edition Writer', `Chapter ${b.chapter} "From" box quotes words that are not in her voice file: "${q}". Quote her exactly or say it in your own words.`);
    scanFamily(report, 'edition', 'Edition Writer', `Chapter ${b.chapter} "From" box`, b.text);
  }
  for (const line of text.split('\n')) {
    if (/^>\s*From /.test(line)) continue;
    const own = line.match(KEEP_OUT);
    if (own) add(report, 'edition', 'fail', 'Edition Writer', `"${own[0]}": keep the creator's family out of the book. Line: ${line.slice(0, 140)}`);
  }
  for (const m of new Set(mentions(text))) if (m !== handle.toLowerCase()) add(report, 'edition', 'fail', 'Edition Writer', `The book tags @${m}: no other accounts or brands.`);
  for (const n of brandNames(voice, handle)) if (bare(text).includes(n)) add(report, 'edition', 'fail', 'Edition Writer', `The book names "${n}", a brand she tags: leave brand names out.`);
  if (spelling === 'US') for (const w of ukWords(text)) add(report, 'edition', 'fail', 'Edition Writer', `UK spelling "${w}" in a US creator's book: use the US spelling.`);
  return boxes;
}

export function captionsForCreator(captions) {
  const a = captions.search(/^##\s+Captions for\b/m), b = captions.search(/^##\s+Notes\b/m);
  return a < 0 ? captions : captions.slice(a, b > a ? b : undefined);
}

export function checkCarouselText(report, {carousels, captions, handle, voice, spelling}) {
  if (carousels.length !== 2) add(report, 'carousels', 'fail', 'Marketing Kit', `Found ${carousels.length} carousel folders with slides.json (2 needed).`);
  const brands = brandNames(voice, handle);
  const scan = (where, text) => {
    scanFamily(report, 'carousels', 'Marketing Kit', where, text);
    for (const m of new Set(mentions(text))) if (m !== handle.toLowerCase()) add(report, 'carousels', 'fail', 'Marketing Kit', `${where} tags @${m}: no other accounts or brands.`);
    for (const n of brands) if (bare(text).includes(n)) add(report, 'carousels', 'fail', 'Marketing Kit', `${where} names "${n}", a brand she tags.`);
    if (spelling === 'US') for (const w of ukWords(text)) add(report, 'carousels', 'fail', 'Marketing Kit', `${where}: UK spelling "${w}".`);
  };
  for (const c of carousels) {
    let slides; try { slides = JSON.parse(c.json).slides || []; } catch { add(report, 'carousels', 'fail', 'Marketing Kit', `${c.name}/slides.json does not read as JSON.`); continue; }
    scan(`Carousel ${c.name}`, slides.map(s => ['kicker', 'title', 'body', 'source', 'label', 'cta'].map(k => s[k] || '').concat(s.bullets || []).join('\n')).join('\n'));
    if (!slides.some(s => s.type === 'cover')) add(report, 'carousels', 'fail', 'Marketing Kit', `Carousel ${c.name} has no cover slide.`);
    if (!c.passed) add(report, 'carousels', 'fail', 'Marketing Kit', `Carousel ${c.name}: carousel-check.md does not say "Result: PASSED".`);
  }
  if (!captions) { add(report, 'carousels', 'fail', 'Marketing Kit', 'carousel/captions.md is missing.'); return; }
  const mine = captionsForCreator(captions), blocks = mine.split(/^###\s+/m).slice(1);
  scan('Captions', mine);
  if (blocks.length < 2) add(report, 'carousels', 'fail', 'Marketing Kit', `captions.md has ${blocks.length} caption(s) under "## Captions for <name>" with a "### " heading each (2 needed).`);
  for (const b of blocks) {
    const name = b.split('\n')[0].slice(0, 60);
    if (!/paid partnership/i.test(b)) add(report, 'carousels', 'fail', 'Marketing Kit', `Caption "${name}" has no "Paid partnership" disclosure.`);
    if (/comment\s+["“]/i.test(b)) add(report, 'carousels', 'fail', 'Marketing Kit', `Caption "${name}" asks followers to comment a keyword for a recipe: the book holds none of her recipes.`);
  }
}

// The creator's newest full email in a send sheet: a "### ... @handle ..." section with an "**Email 1" in it
// (sections that only give a sign-off do not count).
const EMAIL_1 = /\*\*Email 1\b(?!\s+sign-off)/;
export function emailSection(sheet, handle) {
  const lines = String(sheet).split('\n'); let found = null;
  for (let i = 0; i < lines.length; i++) {
    if (!/^###\s/.test(lines[i]) || !lines[i].toLowerCase().includes('@' + handle.toLowerCase())) continue;
    let j = i + 1; while (j < lines.length && !/^#{2,3}\s/.test(lines[j])) j++;
    const body = lines.slice(i, j).join('\n'); if (EMAIL_1.test(body)) found = body;
  }
  if (!found) return null;
  const start = found.search(EMAIL_1), rest = found.slice(start), nl = rest.indexOf('\n');
  const body = rest.slice(nl + 1), end = body.search(/\n\*\*(?:Follow-up|Why)/);
  return {section: found, email: (end < 0 ? body : body.slice(0, end)).trim()};
}

export function checkEmailText(report, {sheet, handle, voice, appLink, title, boxes, spelling}) {
  const found = sheet && emailSection(sheet, handle);
  if (!found) { add(report, 'email', 'fail', 'Outreach Writer', `No email draft for @${handle} with a full "Email 1" in the send sheets.`); return; }
  const {email} = found, v = voiceText(voice);
  if (appLink && !email.includes(appLink)) add(report, 'email', 'fail', 'Outreach Writer', `Email 1 does not carry her app link ${appLink}.`);
  if (!norm(email).includes(norm(CAROUSEL_LINE))) add(report, 'email', 'fail', 'Outreach Writer', "Email 1 does not carry Tavin's carousel line word for word.");
  // Build 48: every creator email comes from Dan <dan@blueonehundred.com> (Tavin, 23 Nov).
  const spoken = email.split('\n').filter(l => !/^\s*\(.*template footer.*\)\s*$/i.test(l) && !/^\s*\*Note:.*\*\s*$/i.test(l)).join('\n');
  if (/\bTavin\b/.test(spoken)) add(report, 'email', 'fail', 'Outreach Writer', 'Email 1 says "Tavin": every creator email is from Dan ("I\'m Dan", signed "Dan").');
  else if (!/\bDan\b/.test(spoken)) add(report, 'email', 'fail', 'Outreach Writer', 'Email 1 is not signed "Dan".');
  if (/hello@blueonehundred\.com/i.test(email)) add(report, 'email', 'fail', 'Outreach Writer', 'Email 1 names hello@blueonehundred.com: creator emails come from dan@blueonehundred.com.');
  if (/POSTAL ADDRESS/i.test(email)) add(report, 'email', 'fail', 'Outreach Writer', "Email 1 still has a postal address placeholder: Tavin's template footer carries the contact details (D3 closed).");
  if (/\bgrew from\b/i.test(email)) add(report, 'email', 'fail', 'Outreach Writer', 'Email 1 says a chapter "grew from" her posts: say only which chapter holds her own box.');
  scanFamily(report, 'email', 'Outreach Writer', 'Email 1', email);
  for (const m of new Set(mentions(email))) if (m !== handle.toLowerCase()) add(report, 'email', 'fail', 'Outreach Writer', `Email 1 tags @${m}.`);
  for (const n of brandNames(voice, handle)) if (bare(email).includes(n)) add(report, 'email', 'fail', 'Outreach Writer', `Email 1 names "${n}", a brand she tags.`);
  if (spelling === 'US') for (const w of ukWords(email)) add(report, 'email', 'fail', 'Outreach Writer', `Email 1: UK spelling "${w}".`);
  for (const q of quotes(email)) {
    if (title && bare(q) === bare(title)) continue;
    if (words(q) > 8) add(report, 'email', 'fail', 'Outreach Writer', `Quote over 8 words in Email 1: "${q}".`);
    if (words(q) >= 2 && !v.includes(bare(q))) add(report, 'email', 'fail', 'Outreach Writer', `Email 1 quotes words that are not in her voice file: "${q}".`);
  }
  const withBoxes = new Set((boxes || []).map(b => b.chapter));
  for (const m of email.matchAll(/\bChapters?\s+(\d+)(?:\s+and\s+(\d+))?/gi)) for (const n of [m[1], m[2]].filter(Boolean).map(Number))
    if (!withBoxes.has(n)) add(report, 'email', 'fail', 'Outreach Writer', `Email 1 names Chapter ${n}, but none of her "From" boxes is in it.`);
  if (/\brecipes?\b/i.test(email)) add(report, 'email', 'warn', 'Outreach Writer', 'Email 1 says "recipe": make sure it does not suggest the book holds her own recipes.');
}

const money = s => Number(String(s).replace(/[$,\s]/g, ''));
export function checkBreakdownText(report, {html}) {
  if (!html) { add(report, 'breakdown', 'fail', 'Outreach Writer', 'The breakdown HTML is missing.'); return; }
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
  const f = t.match(/Buyers \(([\d,]+) followers x ([\d.]+)%, ([\d.]+)%, ([\d.]+)%/i), price = t.match(/buyers x \$(\d+)/i);
  if (!f || !price) { add(report, 'breakdown', 'fail', 'Outreach Writer', 'Could not read the followers, rates or price in the breakdown table.'); return; }
  const row = label => { const m = t.match(new RegExp(label + '[^$\\d]*?(?:\\([^)]*\\))?\\s*\\$?([\\d,]+)\\s+\\$?([\\d,]+)\\s+\\$?([\\d,]+)', 'i')); return m ? m.slice(1, 4).map(money) : null; };
  const followers = money(f[1]), rates = f.slice(2, 5).map(Number), p = Number(price[1]);
  const buyers = rates.map(r => Math.floor(followers * r / 100)), sales = buyers.map(b => b * p);
  const fees = sales.map((s, i) => Math.round(s * 0.06 + 0.3 * buyers[i])), left = sales.map((s, i) => s - fees[i]), share = left.map(l => Math.round(l * 0.6));
  for (const [label, want] of Object.entries({'Buyers': buyers, 'Sales': sales, 'Less estimated fees': fees, 'Left after fees': left, 'Your 60%': share})) {
    const got = row(label.replace('%', '\\%'));
    if (!got) { add(report, 'breakdown', 'fail', 'Outreach Writer', `Breakdown row "${label}" is missing or unreadable.`); continue; }
    got.forEach((g, i) => { if (Math.abs(g - want[i]) > 1) add(report, 'breakdown', 'fail', 'Outreach Writer', `Breakdown "${label}" ${['Low', 'Middle', 'High'][i]} shows ${g}; the arithmetic gives ${want[i]}.`); });
  }
  if (!/estimate, not a forecast/i.test(t)) add(report, 'breakdown', 'fail', 'Outreach Writer', 'The breakdown is not labelled "estimate, not a forecast".');
}

export function checkVoiceText(report, {voice}) {
  if (!voice) { add(report, 'voice', 'fail', 'Creator Partnerships', 'The voice file is missing.'); return; }
  const n = captionCount(voice);
  if (n < 20) add(report, 'voice', 'fail', 'Creator Partnerships', `The voice file links only ${n} posts (20 or more of her own captions needed).`);
}

export function formatReport(report, {handle, scopes, when = new Date()}) {
  const fails = report.items.filter(i => i.level === 'fail'), warns = report.items.filter(i => i.level === 'warn');
  const out = [`# Package check: @${handle}`, '', `- Checked: ${when.toISOString().slice(0, 16).replace('T', ' ')} UTC`, `- Result: ${fails.length ? `NEEDS FIXES (${fails.length})` : 'PASSED'}`, `- Parts checked: ${scopes.join(', ')}`, ''];
  for (const scope of scopes) {
    const mine = report.items.filter(i => i.scope === scope);
    out.push(`## ${scope[0].toUpperCase() + scope.slice(1)}`, mine.length ? mine.map(i => `- ${i.level === 'fail' ? 'FIX' : 'Look'} (${i.owner}): ${i.message}`).join('\n') : '- Nothing found.', '');
  }
  out.push('## To fix', fails.length ? fails.map(i => `- ${i.owner}: ${i.message}`).join('\n') : 'Nothing.', '');
  if (warns.length) out.push('Lines marked "Look" do not stop the package; Tavin sees them in the review.', '');
  return out.join('\n');
}

const readMaybe = async path => { try { return await readFile(path, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return ''; throw e; } };
const listMaybe = async path => { try { return await readdir(path, {withFileTypes: true}); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } };

export const ALL_SCOPES = ['voice', 'edition', 'carousels', 'email', 'breakdown'];
export const validHandle = h => /^[a-z0-9_.]{2,30}$/i.test(h), validBase = b => /^[a-z0-9-]{2,60}$/i.test(b || '');
// Read a creator's package from the team folder and check the chosen parts.
export async function runPackageCheck(root, {handle, base, scopes = ALL_SCOPES, when}) {
  handle = String(handle || '').replace(/^@/, '').trim(); base = String(base || '').trim().replace(/\\/g, '/').replace(/^(\.\/)?(Income\/)?ebooks\//i, '').replace(/\/+$/, '');
  if (!validHandle(handle) || !validBase(base)) throw new Error('Give the creator handle and the base book folder name, for example handle "jane__doughh", base "sourdough-at-home".');
  scopes = ALL_SCOPES.filter(s => scopes.includes(s));
  const ed = join(root, 'ebooks', base, 'editions', handle), report = {items: []};
  const voice = await readMaybe(join(root, 'creators', 'voice', handle + '.md')), spelling = spellingFor(voice);
  const parts = await Promise.all(['part-a.md', 'part-b.md', 'part-c.md'].map(p => readMaybe(join(ed, p)))).then(a => a.join('\n'));
  let boxes = editionBoxes(parts);
  if (scopes.includes('voice')) checkVoiceText(report, {voice});
  if (scopes.includes('edition')) {
    if (!parts.trim()) add(report, 'edition', 'fail', 'Edition Writer', 'Her edition parts are missing.');
    else boxes = checkEditionText(report, {parts, voice, handle, spelling});
  }
  if (scopes.includes('carousels')) {
    const carousels = [];
    for (const e of await listMaybe(join(ed, 'carousel'))) {
      if (!e.isDirectory() || e.name.startsWith('_')) continue;
      const json = await readMaybe(join(ed, 'carousel', e.name, 'slides.json')); if (!json) continue;
      carousels.push({name: e.name, json, passed: /Result:\s*PASSED/.test(await readMaybe(join(ed, 'carousel', e.name, 'carousel-check.md')))});
    }
    checkCarouselText(report, {carousels, captions: await readMaybe(join(ed, 'carousel', 'captions.md')), handle, voice, spelling});
  }
  if (scopes.includes('email')) {
    const sheets = (await listMaybe(join(root, 'outreach'))).filter(e => /^send-sheet-\d{4}-\d{2}-\d{2}\.md$/.test(e.name)).map(e => e.name).sort().reverse();
    let sheet = ''; for (const s of sheets) { const t = await readMaybe(join(root, 'outreach', s)); if (emailSection(t, handle)) { sheet = t; break; } }
    const link = (await readMaybe(join(ed, 'app', 'app-link.md'))).match(/https:\/\/\S+/)?.[0] || '';
    const title = (await readMaybe(join(ed, 'book-check.md'))).match(/^# Book check:\s*(.+)$/m)?.[1].trim() || '';
    checkEmailText(report, {sheet, handle, voice, appLink: link, title, boxes, spelling});
  }
  if (scopes.includes('breakdown')) checkBreakdownText(report, {html: await readMaybe(join(root, 'outreach', `breakdown-${handle}.html`))});
  return {passed: !report.items.some(i => i.level === 'fail'), items: report.items, markdown: formatReport(report, {handle, scopes, when}), path: join('ebooks', base, 'editions', handle, 'package-check.md')};
}

export async function fileTime(path) { try { return (await stat(path)).mtimeMs; } catch { return 0; } }
