// Toby build 36: package runs. One request ("make a package for @handle") runs the whole creator package:
// the app messages each bot in turn, waits for its reply, checks its files (the bot's own check files plus the
// automatic package check), and only then starts the next bot. A failed step gets one fix run with the reasons;
// a second failure stops the run and says why on the board. The last step writes a review page for Tavin.
// Before build 36 Tavin pressed Run for every bot and Claude checked every file in between (18 Nov 2026).
import {readFile,writeFile,rename,mkdir,stat,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {runPackageCheck,validHandle,validBase,CAROUSEL_LINE} from './package-check.mjs';
import {CreatorLog} from './creator-log.mjs';
import {TYPE_NAMES} from './book-types.mjs';
import {ExtraWorkdays, isWorkday} from './workdays.mjs';
import {splitDecisions, parseStanding, DEFAULT_STANDING, STANDING_FILE} from './decisions-archive.mjs';
import {atomicWrite} from './storage-safety.mjs';
import {AUTO_PICK, chooseCreators, askedHandles, bookRequest, pickReport, minutes} from './auto-pick.mjs';

export const PIPELINE_BOTS = ['Creator Partnerships', 'Creative Studio', 'Edition Writer', 'App Builder', 'Art Director', 'Marketing Kit', 'Visual Check', 'Outreach Writer'];
// The steps. Saved to pipeline/steps.json in the team folder the first time, so they can change without a build.
export const DEFAULT_STEPS = {
  version: 1,
  steps: [
    {id: 'voice', bot: 'Creator Partnerships', task: "make her voice file (20 or more of her own captions, copied exactly, with links and dates; her bio line; display name, country, contact) and save any clean photos",
      gates: [{file: 'creators/voice/{handle}.md'}, {check: ['voice']}]},
    {id: 'look', bot: 'Creative Studio', task: 'write her look file (same palette as the base book; her photo as the sample cover only if it passes at book size)',
      gates: [{file: 'creators/look/{handle}.md', contains: ['Palette:', 'Cover photo:']}]},
    {id: 'edition', bot: 'Edition Writer', task: 'write her edition and make her book (edition check and book check must PASS)',
      gates: [{file: '{edition}/edition-check.md', contains: ['Result: PASSED']}, {file: '{edition}/book-check.md', contains: ['Result: PASSED']}, {check: ['edition']}]},
    {id: 'app', bot: 'App Builder', task: 'build and publish her app',
      gates: [{file: '{edition}/app/app-check.md', contains: ['Result: PASSED']}, {file: '{edition}/app/app-link.md', contains: ['Live when checked: yes']}, {phone: '{edition}/app/index.html'}]},
    {id: 'plan', bot: 'Art Director', task: 'plan her 2 carousels on her own themes',
      gates: [{file: '{edition}/carousel/plan.md'}]},
    {id: 'carousels', bot: 'Marketing Kit', task: 'make her 2 carousels and captions.md', retry: ['Art Director', 'Marketing Kit'],
      gates: [{carousels: 2}, {file: '{edition}/carousel/captions.md'}, {check: ['carousels']}]},
    {id: 'visual', bot: 'Visual Check', task: "check both of her carousels, every slide's words against its photo", retry: ['Marketing Kit', 'Visual Check'],
      gates: [{file: '{edition}/carousel/check.md', contains: ['Both carousels PASSED']}, {check: ['carousels']}]},
    {id: 'email', bot: 'Outreach Writer', task: 'write her pitch draft', contact: 'email',
      gates: [{file: 'outreach/breakdown-{handle}.html'}, {check: ['email', 'breakdown']}]},
    {id: 'dm', bot: 'Outreach Writer', task: 'write her Instagram DM draft', contact: 'dm',
      gates: [{sheet: '@{handle}'}]},
    {id: 'review', review: true}
  ]
};

// Toby build 43: book runs. One request ("make a base book for <niche>") runs the whole new base book: Ebook Builder
// writes it, Art Director plans the pictures, Creative Studio makes them, Visual Check checks them (redos go back to
// Creative Studio), Ebook Builder rebuilds with the pictures and App Builder makes the showcase app. Each step is
// checked like a package step. When the book is ready and a creator was named, that creator's package run starts by
// itself. Before build 43 Tavin messaged each bot in turn and Claude checked every file in between (19 and 20 Nov).
export const BOOK_BOTS = ['Ebook Builder', 'Art Director', 'Creative Studio', 'Visual Check', 'App Builder'];
export const BOOK_STEPS = {
  version: 2,
  steps: [
    {id: 'book', bot: 'Ebook Builder', fixes: 2, task: 'write the new base book ebooks/{base}: plan.md first with the line "Type: {type}", then research, sources.md, part-a.md, part-b.md and part-c.md, then make_book with a PDF (book check must PASS). No pictures yet: Art Director plans them next',
      gates: [{file: 'ebooks/{base}/plan.md', contains: ['Type: {type}'], lacks: ['(please confirm)']}, {file: 'ebooks/{base}/part-c.md'}, {file: 'ebooks/{base}/book-check.md', contains: ['Result: PASSED', 'Book type: {type}']}, {file: 'ebooks/{base}/book.pdf'}]},
    {id: 'pictures-plan', bot: 'Art Director', task: 'plan the pictures for the base book ebooks/{base}: the cover prompt and every photo in ebooks/{base}/pictures.md, and the picture lines in part-a.md, part-b.md and part-c.md. This message is Tavin\'s go for the pictures, so write no "do not start" or "hold" line: Creative Studio makes them straight after you',
      gates: [{file: 'ebooks/{base}/pictures.md', fresh: 'run'}, {pictureLines: true}]},
    {id: 'pictures', bot: 'Creative Studio', task: 'make the cover and every picture listed in ebooks/{base}/pictures.md, saved at the paths it gives. This message is Tavin\'s go (cap $3.50 for this book, inside your daily and monthly limits)',
      gates: [{pictures: true, fresh: 'run'}]},
    {id: 'picture-check', bot: 'Visual Check', fixes: 2, task: 'check the cover and every picture of ebooks/{base} against pictures.md and write ebooks/{base}/images/check.md',
      retry: ['Creative Studio', 'Visual Check'],
      fixNote: {'Creative Studio': 'Make every open line under "## Redo requests (Visual Check)" in ebooks/{base}/plan.md, at the paths given. This message is Tavin\'s go for the redos.', 'Visual Check': 'Check again every picture Creative Studio has just remade, and update ebooks/{base}/images/check.md (the "All pictures PASSED" line only when every picture passes).'},
      gates: [{file: 'ebooks/{base}/images/check.md', contains: ['All pictures PASSED'], fresh: 'run'}]},
    // Build 44: only when Visual Check left open "Caption changes (Visual Check)" lines in pictures.md.
    {id: 'captions', bot: 'Art Director', when: {openCaptionChanges: true}, task: 'make every open line under "## Caption changes (Visual Check)" in ebooks/{base}/pictures.md: change the caption or alt text in the picture line of the part file it names (the picture line only, Visual Check\'s true wording word for word) and the same entry in the shot list, then mark each of those lines "- DONE (Art Director, <date>)". This message is Tavin\'s go. Ebook Builder rebuilds the book straight after you',
      gates: [{captionsDone: true}]},
    {id: 'rebuild', bot: 'Ebook Builder', task: 'rebuild ebooks/{base} with the cover and the checked pictures (make_book with a PDF, same settings; book check must PASS with 0 pictures missing)',
      gates: [{file: 'ebooks/{base}/book-check.md', contains: ['Result: PASSED', 'missing: 0'], lacks: ['Pictures placed: 0,']}, {file: 'ebooks/{base}/book.pdf'}]},
    {id: 'showcase', bot: 'App Builder', task: 'build and publish the showcase app for the base book ebooks/{base} (folder ebooks/{base}/app, no creator in it)',
      gates: [{file: 'ebooks/{base}/app/app-check.md', contains: ['Result: PASSED', 'Book type: {type}']}, {file: 'ebooks/{base}/app/app-link.md', contains: ['Live when checked: yes']}, {phone: 'ebooks/{base}/app/index.html'}]},
    {id: 'ready', review: true}
  ]
};

// Build 45: a checker's verdict counts only when it starts its own line ("Both carousels PASSED, <date>",
// "**All pictures PASSED (37)**" or "- All pictures PASSED ..."). The words inside a sentence such as
// 'Not "Both carousels PASSED" yet.' are not a pass (21 Nov 2026: a slide that had failed was passed this way).
// Keyed on the phrase, so it also holds for the steps.json already saved in the team folder.
export const VERDICTS = ['Both carousels PASSED', 'All pictures PASSED'];
export function hasVerdict(text, phrase) {
  return String(text || '').split('\n').some(line => line.replace(/^[\s>*_#-]+/, '').startsWith(phrase));
}

// Build 44: open lines under "## Caption changes (Visual Check)" in a base book's pictures.md (not marked "- DONE").
export function openCaptionChanges(text) {
  const out = []; let inside = false;
  for (const line of String(text || '').split('\n')) {
    if (/^##\s/.test(line)) { inside = /^##\s+Caption changes \(Visual Check\)\s*$/i.test(line); continue; }
    if (inside && /^\s*-\s+\S/.test(line) && !/^\s*-\s*DONE\b/i.test(line)) out.push(line.trim());
  }
  return out;
}
const pad = n => String(n).padStart(2, '0');
export const localDate = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const localTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// Build 39: "ebooks/sourdough-at-home" or "ebooks\\sourdough-at-home\\" means the same book as "sourdough-at-home".
export const baseName = b => String(b || '').trim().replace(/\\/g, '/').replace(/^(\.\/)?(Income\/)?ebooks\//i, '').replace(/\/+$/, '');
export const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
export const isBook = run => run?.kind === 'book';
export const runKey = run => isBook(run) ? 'book-' + run.base : run.handle;
export const runLabel = run => isBook(run) ? `book run ebooks/${run.base}` : `@${run.handle}`;
const oneLine = s => String(s || '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// The decided line that tells every bot what the run is. Appended once when the run starts.
export function decisionLine({n, handle, base, contact, notes, when, by = ''}) {
  const how = contact === 'dm'
    ? "an Instagram DM draft (under 140 words) with Tavin's carousel line word for word; the breakdown on request"
    : `an EMAIL draft only, with the breakdown PDF and both carousels attached and Tavin's carousel line word for word ("${CAROUSEL_LINE}")`;
  return `${localDate(when)} I${n} | for: ${PIPELINE_BOTS.join(', ')} | instruction: PACKAGE RUN for @${handle} on base book ${base} (${by === 'auto' ? `picked by the Toby app's daily auto-pick under Tavin's standing rule, ${localTime(when)}` : `Tavin, through Toby, ${localTime(when)}`}). Toby's app runs the steps in order and messages each of you when it is your turn ("Package run for @${handle} ..."); do only that creator's step when that message comes, and nothing for @${handle} without it. Package runs may overlap with other creators: I41 does not apply to them. Steps ("her" means the creator: use the pronoun from the voice file): (1) Creator Partnerships: creators/voice/${handle}.md with 20 or more of her OWN captions copied exactly (full text, post link, date), her bio line word for word, display name, country and contact, her themes and real follower questions; clean photos only in creators/photos/${handle}/ (no face, no children, no text, no address, no logos). (2) Creative Studio: creators/look/${handle}.md, the base book's palette (I18); her photo as the sample cover only if it passes at book size. (3) Edition Writer: her edition (spelling for her country; From boxes only from her real captions, quotes copied exactly; sign with her handle), then make_book; edition and book checks PASS. (4) App Builder: her app. (5) Art Director: 2 carousel topics on HER themes, not ones used for an earlier creator on this base book; keep panel cover titles to 2 lines. (6) Marketing Kit: both carousels, and captions.md with "## Captions for <her name>", one "### " heading per caption, "Paid partnership" first, no "comment X for the recipe". (7) Visual Check: both carousels, every slide's words against its photo. (8) Outreach Writer: ${how}; quotes of hers 8 words or fewer, copied exactly from her voice file; name only chapters that hold her From boxes; never "grew from"; never suggest the book holds her recipes; when fixing, write the whole Email 1 again. Keep her family (children, partner) and the brands she tags out of every file. Every step is checked automatically (pipeline/${handle}/package-check.md); a failed step gets one fix run, then the run stops for Tavin. Drafts only (I11), no reel (I36), no send day (D7), no postal address (D3).${notes ? ' Tavin\'s notes: ' + notes.replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 1000) : ''} | status: decided | ${localTime(when)}\n`;
}
export function bookDecisionLine({n, base, niche, topic, type, title, handle, contact, notes, when}) {
  const after = handle
    ? `When the book is ready (every step passed), the app starts the package run for @${handle} on ebooks/${base} by itself (pitch by ${contact === 'dm' ? 'Instagram DM' : 'email'}), and that run ends with Tavin's review as usual.`
    : 'When the book is ready the app tells Tavin; no package run starts by itself.';
  return `${localDate(when)} I${n} | for: ${BOOK_BOTS.join(', ')}, Toby | instruction: BOOK RUN, NEW BASE BOOK ebooks/${base} (Tavin, through Toby, ${localTime(when)}). Niche: ${oneLine(niche)}. Topic (Tavin's words): "${oneLine(topic)}". ${title ? `Working title: ${oneLine(title)} (Tavin can rename). ` : ''}Type for ebooks/${base}: ${type} (plan.md carries "Type: ${type}"; templates/book-types/${type}.md wins over the general rules; the niche is in templates/book-types/niches.md). Toby's app runs the steps in order and messages each of you when it is your turn ("Book run for ebooks/${base} ..."). That message is Tavin's go for your step: nobody writes or waits for another go line. Do nothing for ebooks/${base} without that message, apart from your usual checks. Steps: (1) Ebook Builder: plan.md first, then research, sources.md, parts A, B and C, then make_book with a PDF; book check PASSED. (2) Art Director: the cover prompt and every picture in pictures.md, and the picture lines in the parts. (3) Creative Studio: the cover and every picture (cap $3.50 for this book, inside the daily and monthly limits). (4) Visual Check: every picture; redo requests go back to Creative Studio, then Visual Check checks again. (5) Ebook Builder: rebuild with the pictures; book check PASSED, 0 missing. (6) App Builder: the showcase app in ebooks/${base}/app. The base book is a generic demo: no creator's name, captions, photos or brands. Nothing that needs a licensed trade (electrical wiring, gas, plumbing): those get a note to use a qualified person and no steps; a Safety note wherever tools, ladders, fumes or heat come in; no money, legal or health advice. Every step is checked automatically (pipeline/book-${base}/status.md); a failed step gets one fix run (two for the book and the pictures), then the run stops for Tavin. ${after} Drafts only (I11), nothing sent.${notes ? ' Tavin\'s notes: ' + oneLine(notes).slice(0, 1200) : ''} | status: decided | ${localTime(when)}\n`;
}
export function nextInstruction(decisions) {
  let max = 0; for (const m of String(decisions).matchAll(/^\d{4}-\d{2}-\d{2} I(\d+) \|/gm)) max = Math.max(max, Number(m[1]));
  return max + 1;
}
export const secondTryMessage = date => `Second try for today's creators (from the Toby app): there is no finished creators/${date}.md yet (no "Status: done" line). Do today's creator search again now, using your rules and the decisions file, with the READY-BOOK TOP-UP FIRST (creators who fit a ready base book), then today's niches if your step budget allows, until the day lists 4 creators. Keep anything already in creators/${date}.md and add to it; save after every niche; end the file with "Status: done". Don't ask questions.`;
export function stepMessage({run, step, steps}) {
  const list = steps.filter(s => !s.review);
  if (isBook(run)) return `Book run for ebooks/${run.base} (new base book, niche ${run.niche}, Type: ${run.type}), step ${list.indexOf(step) + 1} of ${list.length}: ${fill(step.task, runVars(run))}. Use your rules and the decisions file (I${run.decision}). In a book run this message is Tavin's go for your step: do not wait for a go line. Don't ask questions. When you finish, the app checks your files automatically.`;
  return `Package run for @${run.handle}, step ${list.indexOf(step) + 1} of ${list.length}: ${step.task}. Do this for @${run.handle} only (base book ${run.base}), using your rules and the decisions file (I${run.decision}). Don't ask questions. When you finish, the app checks your files automatically.`;
}
// Build 45: what each bot does in a package fix run after Visual Check fails a carousel (the steps.json saved in the
// team folder has no fixNote, so these are the defaults).
export const PACKAGE_FIX_NOTES = {visual: {
  'Marketing Kit': 'Visual Check failed a slide. Make every open line under "## Word changes (Visual Check)" in {edition}/carousel/captions.md (and any slide change in {edition}/carousel/check.md), then remake only the carousel it names with make_carousel.',
  'Visual Check': 'Check again the carousel Marketing Kit has just remade, and update {edition}/carousel/check.md: write the line "Both carousels PASSED, <date> <time>" on its own line only when every slide of both carousels passes.'}};
// Build 46: when the app check finds a fill-in table it cannot read, the cause is a heading in the edition, so the
// fix run goes to Edition Writer first, then App Builder rebuilds (on 22 Nov the fix went to App Builder alone, which
// could only rebuild the same thing).
export function packageRetry(step, reasons) {
  if (step.retry) return step.retry;
  if (step.id === 'app' && reasons.some(r => /Fill-in table/i.test(r))) return ['Edition Writer', 'App Builder'];
  return [step.bot];
}
PACKAGE_FIX_NOTES.app = {
  'Edition Writer': "App Builder's app check could not read a fill-in table in her edition (named below). Compare that table's ### heading in your part file with the same heading in the base book (ebooks/{base}/part-*.md) and change only that heading so the words match (her spelling is fine), then run make_book again; edition-check.md and book-check.md must both say \"Result: PASSED\".",
  'App Builder': 'Edition Writer has just fixed the heading the app check named. Rebuild and publish her app; app-check.md must say "Result: PASSED" and app-link.md must be written.'};
export function fixMessage({run, step, bot, reasons}) {
  const intro = bot === step.bot ? `your ${step.id} step did not pass the automatic check` : `${step.bot}'s ${step.id} step did not pass the automatic check, and it needs your part fixed first`;
  if (isBook(run)) { const note = step.fixNote?.[bot] ? ' ' + fill(step.fixNote[bot], runVars(run)) : '';
    return `Book run for ebooks/${run.base}: ${intro}.${note} Fix exactly these, change nothing else, and run your checks again.${note ? '' : ' This message is Tavin\'s go.'} Don't ask questions.\n${reasons.slice(0, 12).map(r => '- ' + r).join('\n')}\nThe run's status is in pipeline/book-${run.base}/status.md.`; }
  const pnote = step.fixNote?.[bot] || PACKAGE_FIX_NOTES[step.id]?.[bot]; const pn = pnote ? ' ' + fill(pnote, runVars(run)) : '';
  return `Package run for @${run.handle}: ${intro}.${pn} Fix exactly these, change nothing else, and run your checks again. Don't ask questions.\n${reasons.slice(0, 12).map(r => '- ' + r).join('\n')}\nThe full check is in pipeline/${run.handle}/package-check.md.`;
}

export const runVars = run => ({handle: run.handle || '', base: run.base, type: run.type || '', edition: `ebooks/${run.base}/editions/${run.handle || ''}`});

export class Pipelines {
  constructor({directory, teamRoot, teamFolder, service, busy, checkApp, now = Date.now, onChange = () => {}}) {
    Object.assign(this, {directory, teamRoot, teamFolder, service, busy, checkApp, now, onChange});
    this.runs = []; this.auto = {}; this.archive = {}; this.ticking = false; this.closed = false; this.persist = Promise.resolve();
    // Build 38: the creator progress log (creators/creators-log.csv and .html). Never allowed to break a run.
    this.log = new CreatorLog({teamRoot, teamFolder, now});
    this.workdays = new ExtraWorkdays(teamRoot, now);
  }
  logged(promise) { return Promise.resolve(promise).catch(() => {}); }
  file() { return join(this.directory, 'pipelines.json'); }
  async init() {
    try { const data = JSON.parse(await readFile(this.file(), 'utf8')); if (Array.isArray(data.runs)) this.runs = data.runs; if (data.auto && typeof data.auto === 'object') this.auto = data.auto; if (data.archive && typeof data.archive === 'object') this.archive = data.archive; } catch (e) { if (e.code !== 'ENOENT') throw new Error('Could not read saved package runs.'); }
    return this;
  }
  async save() {
    const body = JSON.stringify({version: 1, runs: this.runs.slice(-50), auto: this.auto, archive: this.archive}, null, 1);
    const write = async () => { await mkdir(this.directory, {recursive: true}); const tmp = this.file() + '.' + randomUUID(); await writeFile(tmp, body); await rename(tmp, this.file()); };
    this.persist = this.persist.then(write, write); await this.persist; this.onChange();
  }
  async steps(kind = 'package') {
    const name = kind === 'book' ? 'book-steps.json' : 'steps.json', standard = kind === 'book' ? BOOK_STEPS : DEFAULT_STEPS, path = join(this.teamRoot, 'pipeline', name);
    try { const data = JSON.parse(await readFile(path, 'utf8'));
      // Build 44: an older saved copy of the standard book steps is replaced by the new standard (kept as a backup).
      if (kind === 'book' && Number(data.version || 1) < standard.version) { await this.teamFolder.write(null, `pipeline/book-steps.v${Number(data.version || 1)}.json`, JSON.stringify(data, null, 1)); }
      else if (Array.isArray(data.steps) && data.steps.length) return data.steps; } catch (e) { if (e.code !== 'ENOENT') throw new Error(`pipeline/${name} does not read as JSON. Fix it or delete it to get the standard steps back.`); }
    await this.teamFolder.write(null, `pipeline/${name}`, JSON.stringify(standard, null, 1));
    return standard.steps;
  }
  stepsFor(run, all) { return all.filter(s => !s.contact || s.contact === run.contact); }
  async runSteps(run) { return this.stepsFor(run, await this.steps(isBook(run) ? 'book' : 'package')); }
  vars(run) { return runVars(run); }
  find(handle) { handle = String(handle || '').replace(/^@/, '').trim().toLowerCase(); return [...this.runs].reverse().find(r => !isBook(r) && r.handle.toLowerCase() === handle); }
  findBook(base) { base = baseName(base).toLowerCase(); return [...this.runs].reverse().find(r => isBook(r) && r.base.toLowerCase() === base); }
  snapshot() { return structuredClone(this.runs); }

  async start({handle, base, contact = 'email', notes = '', by = ''}) {
    handle = String(handle || '').replace(/^@/, '').trim(); base = baseName(base);
    if (!validHandle(handle)) throw new Error('Give the creator\'s Instagram handle, for example "wildflourhillbakes".');
    if (!validBase(base)) throw new Error('Give the base book\'s folder name in ebooks/, for example "sourdough-at-home".');
    if (!['email', 'dm'].includes(contact)) throw new Error('contact must be "email" or "dm".');
    try { await stat(join(this.teamRoot, 'ebooks', base, 'part-a.md')); } catch { throw new Error(`No base book at ebooks/${base}/ (part-a.md not found).`); }
    const open = this.find(handle); if (open && ['running', 'review'].includes(open.status)) throw new Error(`@${handle} already has a package run (${open.status}). Use package_status, or stop_package first.`);
    const steps = await this.steps();
    for (const s of steps) if (s.bot && !this.botConversation(s.bot)) throw new Error(`No chat found for the bot "${s.bot}". Open that bot once in Toby, then try again.`);
    const when = this.now(), month = localDate(when).slice(0, 7), decisions = `board/decisions-${month}.md`;
    let text = ''; try { text = await readFile(join(this.teamRoot, decisions), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const n = nextInstruction(text + '\n' + await this.archived(decisions));
    await this.teamFolder.append(decisions, (text && !text.endsWith('\n') ? '\n' : '') + decisionLine({n, handle, base, contact, notes, when, by}));
    const run = {id: randomUUID(), handle, base, contact, notes, decision: n, status: 'running', startedAt: when, step: 0, attempt: 0, queue: [], history: [], ...(by ? {by} : {})};
    this.runs.push(run); await this.save(); await this.writeStatus(run, by === 'auto' ? `Picked by the daily auto-pick (decided line I${n}).` : `Started by Tavin through Toby (decided line I${n}).`);
    await this.logged(this.log.started(run));
    return structuredClone(run);
  }
  // Build 43: a book run for a new base book. The type must be one of the book types; Toby asks Tavin when the niche
  // is not on templates/book-types/niches.md, and the app adds the niche there itself.
  async startBook({base, niche, topic, type, title = '', handle = '', contact = 'email', notes = ''}) {
    base = baseName(base); handle = String(handle || '').replace(/^@/, '').trim(); type = String(type || '').trim().toLowerCase();
    if (!validBase(base)) throw new Error('Give the new base book a folder name for ebooks/, in small letters and dashes, for example "van-build".');
    if (!oneLine(niche)) throw new Error('Give the niche, for example "DIY van build".');
    if (!oneLine(topic)) throw new Error('Give the topic in Tavin\'s words: what the book helps the reader do.');
    if (!TYPE_NAMES.includes(type)) throw new Error(`Give the book type: one of ${TYPE_NAMES.join(', ')}. If the niche is not on templates/book-types/niches.md, ask Tavin which type first; never guess.`);
    if (handle && !validHandle(handle)) throw new Error('Give the creator\'s Instagram handle, for example "wildflourhillbakes", or leave it out.');
    if (!['email', 'dm'].includes(contact)) throw new Error('contact must be "email" or "dm".');
    const open = this.findBook(base); if (open && open.status === 'running') throw new Error(`ebooks/${base} already has a book run going. Use package_status, or stop_book_run first.`);
    if (handle) { const pkg = this.find(handle); if (pkg && ['running', 'review'].includes(pkg.status)) throw new Error(`@${handle} already has a package run (${pkg.status}).`); }
    const read = async p => { try { return await readFile(join(this.teamRoot, p), 'utf8'); } catch { return ''; } };
    if (/All pictures PASSED/.test(await read(`ebooks/${base}/images/check.md`)) && /Live when checked: yes/.test(await read(`ebooks/${base}/app/app-link.md`)))
      throw new Error(`ebooks/${base} is already a finished base book (pictures passed, showcase app live).${handle ? ' Start the package run with start_package instead.' : ''}`);
    const bots = [...BOOK_BOTS, ...(handle ? (await this.steps()).map(s => s.bot).filter(Boolean) : [])];
    for (const b of new Set(bots)) if (!this.botConversation(b)) throw new Error(`No chat found for the bot "${b}". Open that bot once in Toby, then try again.`);
    await this.steps('book');
    await this.addNiche(oneLine(niche), type);
    const when = this.now(), decisions = `board/decisions-${localDate(when).slice(0, 7)}.md`;
    const text = await read(decisions), n = nextInstruction(text + '\n' + await this.archived(decisions));
    await this.teamFolder.append(decisions, (text && !text.endsWith('\n') ? '\n' : '') + bookDecisionLine({n, base, niche, topic, type, title, handle, contact, notes, when}));
    const run = {id: randomUUID(), kind: 'book', base, niche: oneLine(niche), topic: oneLine(topic), type, title: oneLine(title), handle, contact, notes, decision: n, status: 'running', startedAt: when, step: 0, attempt: 0, queue: [], history: []};
    this.runs.push(run); await this.save(); await this.writeStatus(run, `Started by Tavin through Toby (decided line I${n}).`);
    await this.runLine(`book run ebooks/${base} started (${run.niche}, Type: ${type}${handle ? `; @${handle}'s package run follows by itself` : ''}; I${n})`);
    return structuredClone(run);
  }
  // Adds "| <niche> | <type> |" to the table in templates/book-types/niches.md when the niche is not there yet.
  async addNiche(niche, type) {
    const path = 'templates/book-types/niches.md'; let text; try { text = await readFile(join(this.teamRoot, path), 'utf8'); } catch { return false; }
    const lines = text.split('\n'), rows = lines.map((l, i) => [l, i]).filter(([l]) => /^\|.*\|\s*$/.test(l) && !/^\|\s*-/.test(l));
    if (rows.some(([l]) => l.split('|')[1]?.trim().toLowerCase() === niche.toLowerCase())) return false;
    if (rows.length < 2) return false;
    lines.splice(rows.at(-1)[1] + 1, 0, `| ${niche} | ${type} |`);
    await this.teamFolder.write(null, path, lines.join('\n')); return true;
  }
  async stopBook(base, reason = 'Stopped by Tavin.') {
    const run = this.findBook(base); if (!run || run.status !== 'running') throw new Error(`No book run going for ebooks/${baseName(base)}.`);
    run.status = 'stopped'; run.reason = reason; run.finishedAt = this.now(); run.queue = []; delete run.current;
    await this.save(); await this.writeStatus(run, reason); await this.runLine(`book run ebooks/${run.base} stopped by Tavin`); return structuredClone(run);
  }
  async stop(handle, reason = 'Stopped by Tavin.') {
    const run = this.find(handle); if (!run || !['running', 'review'].includes(run.status)) throw new Error(`No open package run for @${String(handle).replace(/^@/, '')}.`);
    run.status = 'stopped'; run.reason = reason; run.finishedAt = this.now(); run.queue = []; delete run.current;
    await this.save(); await this.writeStatus(run, reason); await this.logged(this.log.stopped(run, reason)); return structuredClone(run);
  }
  // Build 46: carry on a stopped package run after its cause was fixed. Steps whose files already pass the automatic
  // check (fixed or done by hand) are marked passed without a message; the first step that does not pass is run
  // again as normal. A run Tavin already approved by a decided line is marked approved.
  async resume(handle) {
    const run = this.find(handle); if (!run || run.status !== 'stopped') throw new Error(`@${String(handle).replace(/^@/, '')} has no stopped package run to resume.`);
    const all = await this.runSteps(run), since = run.stepStartedAt || run.startedAt, done = [];
    Object.assign(run, {status: 'running', reason: '', attempt: 0, queue: [], messages: []}); delete run.current; delete run.finishedAt;
    while (all[run.step] && !all[run.step].review) {
      const step = all[run.step];
      if ((await this.gates(run, step, since)).length) break;
      run.history.push({step: step.id, passed: true, resumed: true, at: this.now()}); done.push(step.id); run.step++;
    }
    run.stepStartedAt = this.now(); await this.save();
    const next = all[run.step];
    await this.runLine(`@${run.handle} package run resumed by Tavin${done.length ? `; already passing: ${done.join(', ')}` : ''}; next: ${next?.review ? 'review' : `step "${next.id}" (${next.bot})`}`);
    if (next?.review && await this.approvedBefore(run)) {
      await this.writeReview(run); run.status = 'approved'; run.finishedAt = this.now(); await this.save();
      await this.writeStatus(run, 'Resumed: every step passes, and Tavin had already approved it.'); await this.logged(this.log.approved(run));
      return structuredClone(run);
    }
    await this.writeStatus(run, `Resumed by Tavin${done.length ? ' (already passing: ' + done.join(', ') + ')' : ''}.`);
    if (next?.review) await this.toReview(run, all);
    return structuredClone(run);
  }
  async approvedBefore(run) {
    const month = localDate(this.now()).slice(0, 7), start = localDate(run.startedAt || 0).slice(0, 7);
    let text = ''; for (const m of new Set([start, month])) { try { text += await readFile(join(this.teamRoot, `board/decisions-${m}.md`), 'utf8'); } catch {} }
    return new RegExp(`APPROVED @${run.handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'s package[^\n]*package run I${run.decision}\\b`, 'i').test(text);
  }
  async approve(handle, note = '') {
    const found = this.find(handle); if (found?.status === 'stopped') throw new Error(`@${found.handle}'s package run is stopped. Use resume_package first: it checks the finished steps and opens the review page.`);
    const run = found; if (!run || run.status !== 'review') throw new Error(`@${String(handle).replace(/^@/, '')} has no package waiting for review.`);
    const when = this.now(), decisions = `board/decisions-${localDate(when).slice(0, 7)}.md`;
    let text = ''; try { text = await readFile(join(this.teamRoot, decisions), 'utf8'); } catch {}
    const n = nextInstruction(text + '\n' + await this.archived(decisions));
    await this.teamFolder.append(decisions, `${localDate(when)} I${n} | for: Outreach Writer, Toby | instruction: Tavin APPROVED @${run.handle}'s package at ${localTime(when)} (package run I${run.decision}): both carousels and the ${run.contact === 'dm' ? 'DM' : 'email'} draft as they are. Drafts only (I11): Tavin sends.${note ? ' Note: ' + note.replace(/\|/g, '/').slice(0, 500) : ''} | status: decided | ${localTime(when)}\n`);
    run.status = 'approved'; run.finishedAt = when; await this.save(); await this.writeStatus(run, `Approved by Tavin (I${n}).`); await this.runLine(`@${run.handle} package approved by Tavin`);
    await this.logged(this.log.approved(run));
    return structuredClone(run);
  }

  botConversation(name) {
    const bot = this.service.state.bots.find(b => b.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!bot) return null;
    return this.service.state.conversations.filter(c => c.botId === bot.id && !c.parentThreadId && c.kind !== 'group').sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  }
  async deliver(run, bot, message) {
    const c = this.botConversation(bot); if (!c) throw new Error(`No chat found for the bot "${bot}".`);
    if (this.busy(c)) return false;
    const runId = randomUUID(), at = this.now();
    run.current = {bot, conversationId: c.id, runId, at, message: message.slice(0, 200)}; await this.save();
    await this.service._deliver(c, message, [], {scheduled: {id: isBook(run) ? 'book-' + run.base : 'package-' + run.handle, runId, title: isBook(run) ? `Book run ${run.base}: ${bot}` : `Package @${run.handle}: ${bot}`, scheduledFor: at}});
    return true;
  }
  // The bot's reply to the step message: 'waiting', 'done' or 'failed'.
  replyState(run) {
    const c = this.service.state.conversations.find(c => c.id === run.current.conversationId);
    if (!c) return 'failed';
    const index = c.messages.findIndex(m => m.sourceScheduleRunId === run.current.runId);
    if (index < 0) return this.now() - run.current.at > 120000 ? 'lost' : 'waiting';
    if (this.busy(c)) return 'waiting';
    const end = c.messages.findIndex((m, i) => i > index && m.role === 'user');
    const replies = c.messages.slice(index + 1, end < 0 ? undefined : end).filter(m => m.role === 'assistant');
    if (!replies.length) return 'waiting';
    if (replies.some(m => ['error', 'cancelled'].includes(m.status))) return 'failed';
    // A bot waiting for an approval or an answer is not finished: Tavin sees it in that chat.
    return replies.every(m => m.status === 'complete') ? 'done' : 'waiting';
  }

  async gates(run, step, since) {
    const v = this.vars(run), reasons = [], root = this.teamRoot, stepFresh = since - 300000, runFresh = (run.startedAt || since) - 300000;
    const mtime = async p => { try { return (await stat(join(root, p))).mtimeMs; } catch { return 0; } };
    const read = async p => { try { return await readFile(join(root, p), 'utf8'); } catch { return ''; } };
    for (const g of step.gates || []) {
      // "fresh": "run" counts work done since the run started (a bot's own scheduled run may do its part early).
      const fresh = g.fresh === 'run' ? runFresh : stepFresh;
      if (g.file) {
        const p = fill(g.file, v), t = await mtime(p);
        if (!t) { reasons.push(`${p} was not written.`); continue; }
        if (t < fresh && g.fresh !== false) { reasons.push(`${p} was not updated in this run.`); continue; }
        const text = await read(p);
        for (const c0 of g.lacks || []) { const c = fill(c0, v); if (text.includes(c)) reasons.push(`${p} still says "${c}".`); }
        for (const c0 of g.contains || []) { const c = fill(c0, v); if (VERDICTS.includes(c) ? hasVerdict(text, c) : text.includes(c)) continue; const fix = text.match(/## To fix\n([\s\S]*?)(\n## |$)/)?.[1].trim(); const fails = fix ? [] : text.split('\n').filter(l => /\|\s*FAIL\s*\|/.test(l)).slice(0, 6).map(l => l.replace(/\s+/g, ' ').trim().slice(0, 160));
          reasons.push(`${p} does not say "${c}".${fix ? ' Its own list: ' + fix.replace(/\s+/g, ' ').slice(0, 400) : ''}${fails.length ? ' Its FAIL rows: ' + fails.join(' ; ') : ''}`); }
      }
      if (g.captionsDone) {
        const open = openCaptionChanges(await read(`ebooks/${v.base}/pictures.md`));
        if (open.length) reasons.push(`${open.length} line${open.length > 1 ? 's' : ''} under "## Caption changes (Visual Check)" in ebooks/${v.base}/pictures.md ${open.length > 1 ? 'are' : 'is'} not marked "- DONE": ${open.slice(0, 4).map(l => l.slice(0, 120)).join(' / ')}`);
      }
      if (g.pictureLines) {
        const parts = await Promise.all(['a', 'b', 'c'].map(x => read(`ebooks/${v.base}/part-${x}.md`)));
        if (!parts.some(t => /!\[[^\]]*\]\(images\//.test(t))) reasons.push(`No picture lines ("![...](images/...)") in ebooks/${v.base}/part-a.md, part-b.md or part-c.md.`);
      }
      if (g.pictures) {
        const list = await read(`ebooks/${v.base}/pictures.md`);
        const want = [...new Set([`ebooks/${v.base}/cover.png`, ...[...list.matchAll(/(?:^|[\s|(])(images\/[\w.\/-]+\.(?:jpe?g|png|webp))/gim)].map(m => `ebooks/${v.base}/${m[1]}`)])];
        const missing = [], stale = [];
        for (const f of want) { const t = await mtime(f); if (!t) missing.push(f); else if (t < fresh) stale.push(f); }
        if (want.length < 2) reasons.push(`ebooks/${v.base}/pictures.md lists no pictures (images/<name>.jpg).`);
        if (missing.length) reasons.push(`${missing.length} of ${want.length} pictures are not made yet: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' and more' : ''}.`);
        if (stale.length) reasons.push(`${stale.length} pictures are older than this run: ${stale.slice(0, 5).join(', ')}.`);
      }
      if (g.carousels) {
        const dir = join(fill('{edition}', v), 'carousel'); let names = [];
        try { names = (await readdir(join(root, dir), {withFileTypes: true})).filter(e => e.isDirectory() && !e.name.startsWith('_')).map(e => e.name); } catch {}
        let passed = 0;
        for (const n of names) { const t = await read(join(dir, n, 'carousel-check.md')); if (/Result:\s*PASSED/.test(t)) passed++; else if (t) reasons.push(`${dir}/${n}/carousel-check.md does not say "Result: PASSED". ${(t.match(/## To fix\n([\s\S]*?)(\n## |$)/)?.[1] || '').replace(/\s+/g, ' ').slice(0, 300)}`); }
        if (passed < g.carousels) reasons.push(`${passed} of ${g.carousels} carousels passed make_carousel.`);
      }
      if (g.sheet) {
        const want = fill(g.sheet, v).toLowerCase(), name = `outreach/send-sheet-${localDate(this.now())}.md`;
        const names = [...new Set([localDate(Math.max(0, fresh)), localDate(this.now())])].map(d => `outreach/send-sheet-${d}.md`);
        let found = false; for (const n of names) if ((await mtime(n)) >= fresh && (await read(n)).toLowerCase().includes(want)) found = true;
        if (!found) reasons.push(`Today's send sheet (${name}) has no new draft for ${want}.`);
      }
      if (g.check) {
        const result = await runPackageCheck(root, {handle: run.handle, base: run.base, scopes: g.check});
        await this.teamFolder.write(null, `pipeline/${run.handle}/package-check.md`, result.markdown);
        for (const i of result.items) if (i.level === 'fail') reasons.push(`${i.owner}: ${i.message}`);
      }
      if (g.phone) {
        if (!this.checkApp) continue;
        const p = fill(g.phone, v), result = await this.checkApp(p).catch(e => ({passed: false, problems: ['The phone check could not run: ' + e.message]}));
        await this.teamFolder.write(null, `pipeline/${runKey(run)}/phone-check.md`, `# Phone check: ${runLabel(run)}\n\n- Checked: ${localDate(this.now())} ${localTime(this.now())}\n- File: ${p}\n- Result: ${result.passed ? 'PASSED' : 'NEEDS FIXES'}\n${(result.notes || []).map(n => '- ' + n).join('\n')}\n\n## To fix\n${(result.problems || []).map(n => '- ' + n).join('\n') || 'Nothing.'}\n`);
        for (const pr of result.problems || []) reasons.push(`App at phone size: ${pr}`);
      }
    }
    return reasons;
  }

  async tick() {
    if (this.ticking || this.closed) return; this.ticking = true;
    try { await this.logged(this.log.tick()); await this.logged(this.mail?.tick()); await this.logged(this.watchCreators()); await this.logged(this.autoPick()); await this.logged(this.archiveDecisions());
      for (const run of this.runs.filter(r => r.status === 'running')) await this.advance(run).catch(async e => { await this.fail(run, (isBook(run) ? 'The book run' : 'The package run') + ' hit an error: ' + e.message); }); }
    finally { this.ticking = false; }
  }
  async advance(run) {
    const all = await this.runSteps(run), step = all[run.step];
    if (!step) return this.fail(run, 'The steps list ended without a review step.');
    if (step.review) return isBook(run) ? this.bookReady(run) : this.toReview(run, all);
    if (!run.current && !run.queue.length && step.when?.openCaptionChanges) {
      const open = openCaptionChanges(await readFile(join(this.teamRoot, fill('ebooks/{base}/pictures.md', this.vars(run))), 'utf8').catch(() => ''));
      if (!open.length) { run.history.push({step: step.id, skipped: true, at: this.now()}); run.step++; run.attempt = 0; await this.save(); await this.writeStatus(run, `Step "${step.id}" not needed (no open caption changes).`); return this.advance(run); }
    }
    if (!run.current) {
      if (!run.queue.length) { run.queue = [step.bot]; run.messages = [stepMessage({run, step, steps: all})]; run.stepStartedAt = this.now(); }
      const bot = run.queue[0], message = run.messages[0];
      if (await this.deliver(run, bot, message)) await this.writeStatus(run, `${bot} is working on step "${step.id}"${run.attempt ? ' (fix run)' : ''}.`);
      return;
    }
    const state = this.replyState(run);
    if (state === 'waiting') return;
    if (state === 'lost') { delete run.current; await this.save(); return; }
    const finished = run.current.bot; run.history.push({step: step.id, bot: finished, at: run.current.at, finishedAt: this.now(), state}); delete run.current;
    run.queue.shift(); run.messages.shift();
    if (state === 'failed' && !run.queue.length) return this.retryOrStop(run, step, all, [`${finished}'s run ended with an error or was stopped before it finished.`]);
    if (run.queue.length) { await this.save(); return; }
    const reasons = await this.gates(run, step, run.stepStartedAt);
    if (!reasons.length) {
      run.history.push({step: step.id, passed: true, at: this.now()});
      run.step++; run.attempt = 0; run.queue = []; run.messages = []; await this.save();
      await this.runLine(`${runLabel(run)} step "${step.id}" (${step.bot}) passed the automatic check`);
      await this.writeStatus(run, `Step "${step.id}" passed.`);
      if (isBook(run)) return;
      const next = all[run.step], link = step.id === 'app' ? await readFile(join(this.teamRoot, fill('{edition}/app/app-link.md', this.vars(run))), 'utf8').then(t => t.match(/https:\/\/\S+/)?.[0] || '', () => '') : '';
      await this.logged(this.log.stepPassed(run, step.id, next && !next.review ? `${next.bot}: ${next.task}` : '', link));
      return;
    }
    return this.retryOrStop(run, step, all, reasons);
  }
  async retryOrStop(run, step, all, reasons) {
    run.history.push({step: step.id, passed: false, at: this.now(), reasons: reasons.slice(0, 12)});
    const fixes = Math.max(0, Math.min(3, Number(step.fixes ?? 1) || 0));
    if (run.attempt >= fixes) return this.fail(run, `Step "${step.id}" (${step.bot}) still did not pass after ${fixes === 1 ? 'one fix run' : fixes + ' fix runs'}:\n${reasons.slice(0, 12).map(r => '- ' + r).join('\n')}`);
    run.attempt++;
    const bots = packageRetry(step, reasons);
    run.queue = [...bots]; run.messages = bots.map(bot => fixMessage({run, step, bot, reasons})); run.stepStartedAt = this.now();
    await this.save(); await this.writeStatus(run, `Step "${step.id}" did not pass; ${fixes === 1 ? 'one fix run' : `fix run ${run.attempt} of ${fixes}`} started (${bots.join(', then ')}).`);
    await this.runLine(`${runLabel(run)} step "${step.id}" did not pass; fix run started`, reasons.slice(0, 3).join(' / '));
  }
  async fail(run, reason) {
    run.status = 'stopped'; run.reason = reason; run.finishedAt = this.now(); run.queue = []; delete run.current;
    await this.save(); await this.writeStatus(run, reason); if (!isBook(run)) await this.logged(this.log.stopped(run, reason));
    await this.runLine(isBook(run) ? `book run ebooks/${run.base} stopped; needs a look` : `@${run.handle} package run stopped; needs a look`, reason.split('\n').slice(0, 3).join(' '));
  }
  async toReview(run, all) {
    await this.writeReview(run);
    run.status = 'review'; run.readyAt = this.now(); await this.save();
    await this.writeStatus(run, `Ready for Tavin: open pipeline/${run.handle}/review.html, then tell Toby "approve @${run.handle}" or what to change.`);
    await this.runLine(`@${run.handle} package READY for Tavin's review (pipeline/${run.handle}/review.html)`);
  }
  // Build 43: the base book is ready. Start the named creator's package run by itself.
  async bookReady(run) {
    const read = async p => { try { return await readFile(join(this.teamRoot, p), 'utf8'); } catch { return ''; } };
    run.status = 'done'; run.finishedAt = this.now(); run.appLink = (await read(`ebooks/${run.base}/app/app-link.md`)).match(/https:\/\/\S+/)?.[0] || ''; await this.save();
    await this.runLine(`book run ebooks/${run.base} READY: book, pictures and showcase app all passed (${run.appLink || 'no app link found'})`);
    if (!run.handle) { await this.writeStatus(run, 'The base book is ready. No creator was named, so no package run starts by itself.'); return; }
    try {
      const pkg = await this.start({handle: run.handle, base: run.base, contact: run.contact, notes: run.notes});
      run.package = {decision: pkg.decision}; await this.save();
      await this.writeStatus(run, `The base book is ready. @${run.handle}'s package run started by itself (I${pkg.decision}): see pipeline/${run.handle}/status.md.`);
      await this.runLine(`@${run.handle} package run started by itself after book run ebooks/${run.base} (I${pkg.decision})`);
    } catch (e) {
      run.package = {error: e.message}; await this.save();
      await this.writeStatus(run, `The base book is ready, but @${run.handle}'s package run could not start: ${e.message}`);
      await this.runLine(`@${run.handle} package run did not start after book run ebooks/${run.base}`, e.message);
    }
  }
  // Build 40: never a day without creators. On a workday (build 44: or an extra workday) from 08:15, if Creator Partnerships has no finished
  // creators/<date>.md (last line "Status: done") and is not working, the app asks it once for a second try,
  // ready-book creators first. 19 Nov: the 07:00 search hit its run limit and saved nothing.
  async watchCreators() {
    const t = this.now(); if (this.lastWatch && t - this.lastWatch < 60000) return; this.lastWatch = t;
    const d = new Date(t), hm = d.getHours() * 60 + d.getMinutes();
    if (!isWorkday(t, await this.workdays.get()) || hm < 8 * 60 + 15 || hm > 17 * 60) return;
    const date = localDate(t), marker = `pipeline/second-try-${date}.md`;
    try { await stat(join(this.teamRoot, marker)); return; } catch {}
    let names = []; try { names = (await readdir(join(this.teamRoot, 'creators'))).filter(n => n.startsWith(date) && n.endsWith('.md')); } catch {}
    for (const n of names) { try { if (/Status:\s*done/i.test(await readFile(join(this.teamRoot, 'creators', n), 'utf8'))) return; } catch {} }
    const c = this.botConversation('Creator Partnerships'); if (!c || this.busy(c) || c.messages.some(m => m.status === 'streaming')) return;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    // Wait for the 07:00 run itself (Toby may have been opened late) until 10:00.
    if (hm < 10 * 60 && !c.messages.some(m => m.role === 'user' && Number(m.createdAt) >= start)) return;
    const message = secondTryMessage(date);
    await this.teamFolder.write(null, marker, `# Second try for creators, ${date}\n\n- Asked at ${localTime(t)}: no finished creators/${date}.md (no "Status: done") and Creator Partnerships was not working.\n\n## For Toby\nCreator Partnerships' first search today did not finish; the app asked it for a second try at ${localTime(t)}. Tell Tavin in the brief if creators/${date}.md still has no "Status: done".\n`);
    await this.service._deliver(c, message, [], {scheduled: {id: 'creator-second-try', runId: randomUUID(), title: 'Second try: today\'s creators', scheduledFor: t}});
    await this.runLine(`no finished creators/${date}.md by ${localTime(t)}; asked Creator Partnerships for a second try (ready-book creators first)`);
  }
  // Build 44: the archived part of a decisions file (board/archive/decisions-<month>.md), for numbering.
  async archived(decisions) { try { return await readFile(join(this.teamRoot, decisions.replace(/^board\//, 'board/archive/')), 'utf8'); } catch { return ''; } }
  // Build 44: nightly decisions archiving (src/decisions-archive.mjs). From 21:00, once a day, when the file is over 50 KB.
  async archiveDecisions({force = false} = {}) {
    const t = this.now(), date = localDate(t), month = date.slice(0, 7), path = `board/decisions-${month}.md`;
    if (!force) { if (new Date(t).getHours() < 21 || this.archive.date === date) return null; }
    let size = 0; try { size = (await stat(join(this.teamRoot, path))).size; } catch { return null; }
    if (!force && size < 50000) { this.archive = {date, skipped: `${Math.round(size / 1024)} KB`}; await this.save(); return null; }
    let standingText = ''; try { standingText = await readFile(join(this.teamRoot, STANDING_FILE), 'utf8'); } catch { standingText = `# Standing rules\n\nThese decided lines never move to the archive. Add a number here (or "[standing]" on the line itself) to keep a rule in the live file.\n\nStanding: ${DEFAULT_STANDING.join(', ')}\n`; await this.teamFolder.write(null, STANDING_FILE, standingText); }
    const result = await this.teamFolder.serialize(null, async () => {
      const live = await this.teamFolder.target(null, path, true), arch = await this.teamFolder.target(null, `board/archive/decisions-${month}.md`, true);
      const text = await readFile(live, 'utf8'), archiveText = await readFile(arch, 'utf8').catch(() => '');
      const out = splitDecisions({text, archiveText, today: date, month, standing: parseStanding(standingText)});
      if (!out.moved && text.startsWith('> Archive note')) return out;
      await mkdir(join(this.teamRoot, 'board', 'archive'), {recursive: true});
      if (out.moved) await atomicWrite(arch, out.archive);
      await atomicWrite(live, out.live); return out;
    });
    this.archive = {date, moved: result.moved, before: size}; await this.save();
    const after = (await stat(join(this.teamRoot, path))).size;
    await this.runLine(`decisions archive: ${result.moved} finished lines older than 7 days moved to board/archive/decisions-${month}.md; ${path} ${Math.round(size / 1024)} KB to ${Math.round(after / 1024)} KB (next numbers D${result.max.D + 1}, I${result.max.I + 1})`);
    return {...result, before: size, after};
  }
  // Build 44: the daily auto-pick (src/auto-pick.mjs).
  async autoSettings() {
    const path = 'pipeline/auto-pick.json';
    try { const data = JSON.parse(await readFile(join(this.teamRoot, path), 'utf8')); return {...AUTO_PICK, ...data}; }
    catch (e) { if (e.code !== 'ENOENT') return {...AUTO_PICK, enabled: false, broken: true}; }
    await this.teamFolder.write(null, path, JSON.stringify(AUTO_PICK, null, 1)); return {...AUTO_PICK};
  }
  async readyBases() {
    const read = async p => { try { return await readFile(join(this.teamRoot, p), 'utf8'); } catch { return ''; } };
    let names = []; try { names = (await readdir(join(this.teamRoot, 'ebooks'), {withFileTypes: true})).filter(e => e.isDirectory() && !/^[_.]/.test(e.name)).map(e => e.name); } catch {}
    const out = [];
    for (const n of names) if (/All pictures PASSED/.test(await read(`ebooks/${n}/images/check.md`)) && /Live when checked: yes/.test(await read(`ebooks/${n}/app/app-link.md`))) out.push(n);
    return out.sort((a, b) => b.length - a.length); // longest first, so "sourdough-at-home-2" wins over "sourdough-at-home"
  }
  async autoPick() {
    const t = this.now(), date = localDate(t), d = new Date(t), hm = d.getHours() * 60 + d.getMinutes();
    if (this.lastAuto && t - this.lastAuto < 60000) return; this.lastAuto = t;
    if (this.auto.date === date && this.auto.book && !this.auto.book.sent) return this.sendBook();
    if (this.auto.date === date) return;
    const s = await this.autoSettings();
    if (!s.enabled || !isWorkday(t, await this.workdays.get()) || hm < minutes(s.after) || hm > minutes(s.latest)) return;
    // Wait for Creator Partnerships' finished file for today, until waitUntil.
    let done = false, names = []; try { names = (await readdir(join(this.teamRoot, 'creators'))).filter(n => n.startsWith(date) && n.endsWith('.md')); } catch {}
    for (const n of names) { try { if (/Status:\s*done/i.test(await readFile(join(this.teamRoot, 'creators', n), 'utf8'))) done = true; } catch {} }
    const cp = this.botConversation('Creator Partnerships');
    if (!done && hm < minutes(s.waitUntil)) return;
    if (!done && cp && (this.busy(cp) || cp.messages.some(m => m.status === 'streaming')) && hm < minutes(s.latest)) return;
    await this.log.scanFound().catch(() => {});
    const rows = await this.log.read().catch(() => []);
    const month = date.slice(0, 7), read = async p => { try { return await readFile(join(this.teamRoot, p), 'utf8'); } catch { return ''; } };
    const decisions = (await read(`board/decisions-${month}.md`)) + '\n' + (await read(`board/archive/decisions-${month}.md`));
    const busy = new Set(this.runs.filter(r => ['running', 'review', 'approved'].includes(r.status) && r.handle).map(r => r.handle.toLowerCase()));
    const bookToday = this.runs.some(r => isBook(r) && (r.status === 'running' || localDate(r.startedAt) === date));
    const pick = chooseCreators({rows, today: date, readyBases: await this.readyBases(), asked: askedHandles(decisions), busy, settings: s, newBookAllowed: !bookToday});
    this.auto = {date, at: t, picks: pick.packages.map(c => c.handle), book: pick.book ? {handle: pick.book.handle, contact: pick.book.contact, message: bookRequest({c: pick.book, date, time: localTime(t)}), sent: false} : null};
    await this.save();
    const started = [];
    for (const c of pick.packages) {
      try { const run = await this.start({handle: c.handle, base: c.base, contact: c.contact, by: 'auto', notes: `Auto-pick ${date}: fits the ready base book ${c.base}; score ${c.score}.`}); started.push({handle: c.handle, base: c.base, contact: c.contact, decision: run.decision}); }
      catch (e) { started.push({handle: c.handle, base: c.base, contact: c.contact, error: e.message}); }
    }
    this.auto.note = {started, skipped: pick.skipped, candidates: pick.candidates}; await this.save();
    if (this.auto.book) await this.sendBook(); else await this.writePick();
    const n = started.filter(x => !x.error).length + (pick.book ? 1 : 0);
    await this.runLine(n ? `auto-pick: ${started.filter(x => !x.error).map(x => `@${x.handle} (package run on ${x.base})`).concat(pick.book ? [`@${pick.book.handle} (new base book first, asked Toby to start it)`] : []).join(', ')}; details in pipeline/auto-pick-${date}.md` : `auto-pick: no creator could be picked today (pipeline/auto-pick-${date}.md)`,
      started.some(x => x.error) ? started.filter(x => x.error).map(x => `@${x.handle}: ${x.error}`).join(' / ') : 'none');
  }
  async sendBook() {
    const b = this.auto.book, toby = this.botConversation('Toby');
    if (!b || b.sent) return;
    if (!toby) { b.sent = true; b.state = 'NOT started: no chat found for Toby'; await this.save(); return this.writePick(); }
    if (this.busy(toby) || toby.messages.some(m => m.status === 'streaming')) { if (!b.waiting) { b.waiting = true; await this.save(); await this.writePick(); } return; }
    await this.service._deliver(toby, b.message, [], {scheduled: {id: 'auto-pick-book', runId: randomUUID(), title: `Auto-pick: new base book for @${b.handle}`, scheduledFor: this.now()}});
    b.sent = true; b.state = `asked Toby at ${localTime(this.now())} to start the book run (see his reply and pipeline/status.md)`; await this.save(); await this.writePick();
  }
  async writePick() {
    const t = this.auto.at || this.now(), n = this.auto.note || {started: [], skipped: [], candidates: 0};
    const book = this.auto.book ? {handle: this.auto.book.handle, state: this.auto.book.state || (this.auto.book.waiting ? 'waiting: Toby is busy; the app asks him as soon as he is free' : 'waiting')} : null;
    const picks = [...n.started.filter(x => !x.error).map(x => '@' + x.handle), ...(book ? ['@' + book.handle + ' (new base book)'] : [])].join(', ') || 'nobody';
    await this.teamFolder.write(null, `pipeline/auto-pick-${localDate(t)}.md`, pickReport({date: localDate(t), time: localTime(t), picks, skipped: n.skipped, candidates: n.candidates, started: n.started, book}));
  }
  async runLine(done, problems = 'none') {
    const t = this.now();
    await this.teamFolder.append(`board/runs-${localDate(t)}.md`, `${localTime(t)} | Package runs | done: ${done} | cost: $0.00 | problems: ${String(problems).replace(/\n/g, ' ').slice(0, 400)}\n`).catch(() => {});
  }
  async writeStatus(run, line) {
    if (isBook(run)) return this.writeBookStatus(run, line);
    const t = this.now(), all = this.stepsFor(run, await this.steps());
    const steps = all.map((s, i) => `| ${i + 1} | ${s.review ? 'Tavin reviews' : s.bot} | ${s.id} | ${i < run.step ? 'passed' : i === run.step ? (run.status === 'running' ? (run.attempt ? 'fix run' : 'working') : run.status) : 'waiting'} |`).join('\n');
    const body = `# Package run: @${run.handle}\n\n- Base book: ${run.base}\n- Pitch by: ${run.contact === 'dm' ? 'Instagram DM' : 'email'}\n- Decided line: I${run.decision}\n- Status: ${run.status}\n- Updated: ${localDate(t)} ${localTime(t)}\n- Latest: ${line}\n\n| # | Who | Step | State |\n|---|---|---|---|\n${steps}\n${run.reason ? `\n## Why it stopped\n${run.reason}\n` : ''}\n## For Toby\n${run.status === 'review' ? `Ask Tavin to open pipeline/${run.handle}/review.html and approve or ask for changes.` : run.status === 'stopped' ? 'The run stopped: tell Tavin why (above) in the brief, with one plain fix.' : 'nothing'}\n`;
    await this.teamFolder.write(null, `pipeline/${run.handle}/status.md`, body);
    await this.writeAllStatus(t);
  }
  async writeBookStatus(run, line) {
    const t = this.now(), all = await this.runSteps(run);
    const steps = all.map((s, i) => `| ${i + 1} | ${s.review ? (run.handle ? `The app starts @${run.handle}'s package run` : 'Ready') : s.bot} | ${s.id} | ${i < run.step ? 'passed' : i === run.step ? (run.status === 'running' ? (run.attempt ? `fix run ${run.attempt}` : 'working') : run.status) : 'waiting'} |`).join('\n');
    const forToby = run.status === 'stopped' ? 'The book run stopped: tell Tavin why (above) in the brief, with one plain fix.' : run.status === 'done' ? `The base book ebooks/${run.base} is ready${run.appLink ? ` (showcase app ${run.appLink})` : ''}.${run.handle ? (run.package?.error ? ` @${run.handle}'s package run could not start: ${run.package.error}` : ` @${run.handle}'s package run started by itself.`) : ''}` : 'nothing';
    const body = `# Book run: ebooks/${run.base}\n\n- Niche: ${run.niche}\n- Type: ${run.type}\n- Topic: ${run.topic}\n${run.handle ? `- Then: package run for @${run.handle} (${run.contact === 'dm' ? 'Instagram DM' : 'email'})\n` : ''}- Decided line: I${run.decision}\n- Status: ${run.status}\n- Updated: ${localDate(t)} ${localTime(t)}\n- Latest: ${line}\n\n| # | Who | Step | State |\n|---|---|---|---|\n${steps}\n${run.reason ? `\n## Why it stopped\n${run.reason}\n` : ''}\n## For Toby\n${forToby}\n`;
    await this.teamFolder.write(null, `pipeline/book-${run.base}/status.md`, body);
    await this.writeAllStatus(t);
  }
  async writeAllStatus(t) {
    const pkgSteps = await this.steps(), bookSteps = this.runs.some(isBook) ? await this.steps('book') : [];
    const lines = this.runs.slice(-20).reverse().map(r => isBook(r)
      ? `| book: ${r.base}${r.handle ? ` (for @${r.handle})` : ''} | ${r.base} | ${r.status} | ${r.status === 'running' ? (bookSteps[r.step]?.id || '') : ''} | pipeline/book-${r.base}/status.md |`
      : `| @${r.handle} | ${r.base} | ${r.status} | ${r.status === 'running' ? (this.stepsFor(r, pkgSteps)[r.step]?.id || '') : ''} | pipeline/${r.handle}/status.md |`).join('\n');
    await this.teamFolder.write(null, 'pipeline/status.md', `# Package runs\n\nUpdated ${localDate(t)} ${localTime(t)}.\n\n| Creator | Base book | Status | Step now | Details |\n|---|---|---|---|---|\n${lines}\n\n## For Toby\n${this.runs.some(r => r.status === 'review') ? 'Packages are waiting for Tavin\'s review (status "review").' : ''}${this.runs.some(r => r.status === 'stopped' && this.now() - (r.finishedAt || 0) < 86400000) ? ' A run stopped in the last day: see its status file.' : ''}${this.runs.some(r => isBook(r) && r.status === 'running') ? ' A book run is going: see its status file.' : ''}\n`);
  }
  async writeReview(run) {
    const v = this.vars(run), root = this.teamRoot, ed = v.edition, rel = p => '../../' + p;
    const read = async p => { try { return await readFile(join(root, p), 'utf8'); } catch { return ''; } };
    const link = (await read(`${ed}/app/app-link.md`)).match(/https:\/\/\S+/)?.[0] || '', baseLink = (await read(`ebooks/${run.base}/app/app-link.md`)).match(/https:\/\/\S+/)?.[0] || '';
    const title = (await read(`${ed}/book-check.md`)).match(/^# Book check:\s*(.+)$/m)?.[1] || run.handle;
    let carousels = []; try { carousels = (await readdir(join(root, ed, 'carousel'), {withFileTypes: true})).filter(e => e.isDirectory() && !e.name.startsWith('_')).map(e => e.name); } catch {}
    const captions = await read(`${ed}/carousel/captions.md`), cap = captions.slice(Math.max(0, captions.search(/^##\s+Captions for/m)), captions.search(/^##\s+Notes/m) > 0 ? captions.search(/^##\s+Notes/m) : undefined);
    const {emailSection} = await import('./package-check.mjs');
    let draft = ''; try { const sheets = (await readdir(join(root, 'outreach'))).filter(n => /^send-sheet-\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().reverse(); for (const s of sheets) { const t = await read('outreach/' + s); const e = emailSection(t, run.handle); if (e) { draft = e.section; break; } if (run.contact === 'dm' && t.includes('@' + run.handle)) { const i = t.indexOf('@' + run.handle); draft = t.slice(Math.max(0, t.lastIndexOf('\n### ', i)), t.indexOf('\n## ', i) > 0 ? t.indexOf('\n## ', i) : undefined); break; } } } catch {}
    const check = await read(`pipeline/${run.handle}/package-check.md`), looks = check.split('\n').filter(l => l.startsWith('- Look'));
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Review: ${escapeHtml(title)} for @${escapeHtml(run.handle)}</title><style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:18px;line-height:1.5;color:#2b211c;margin:0;background:#f7f1ec}
main{max-width:1500px;margin:0 auto;padding:32px 40px 80px}h1{font-size:34px;margin:0 0 6px}h2{font-size:24px;margin:36px 0 12px;color:#8f3f27}
.card{background:#fff;border-radius:14px;padding:22px 26px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:18px}
img{max-width:100%;border-radius:10px;display:block}pre{white-space:pre-wrap;font-family:inherit;font-size:17px;margin:0}
.ok{color:#2f6b3a;font-weight:700}.look{color:#9a5a00}a{color:#8f3f27}
.steps{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}</style></head><body><main>
<h1>${escapeHtml(title)}: package for @${escapeHtml(run.handle)}</h1>
<p>Every step passed its automatic check. Look at the carousels and the ${run.contact === 'dm' ? 'DM' : 'email'}, then tell Toby <b>"approve @${escapeHtml(run.handle)}"</b>, or what to change.</p>
<div class="card"><b>App:</b> ${link ? `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>` : 'no link found'}<br><b>Book:</b> <a href="${rel(ed + '/book.pdf')}">book.pdf</a><br><b>Checks:</b> <a href="package-check.md">package-check.md</a>, <a href="phone-check.md">phone-check.md</a><br><b>Base book:</b> <a href="${rel('ebooks/' + run.base + '/book.pdf')}">${escapeHtml(run.base)}/book.pdf</a>${baseLink ? `, showcase app <a href="${escapeHtml(baseLink)}">${escapeHtml(baseLink)}</a>` : ''}</div>
${looks.length ? `<div class="card look"><b>Worth a look (not blocking):</b><br>${looks.map(l => escapeHtml(l.slice(2))).join('<br>')}</div>` : ''}
<h2>Carousels</h2><div class="steps">${carousels.map(n => `<div class="card"><b>${escapeHtml(n)}</b><a href="${rel(`${ed}/carousel/${n}/sheet.jpg`)}" title="Open full size"><img src="${rel(`${ed}/carousel/${n}/sheet.jpg`)}" alt="${escapeHtml(n)} slides"></a><br><a href="${rel(`${ed}/carousel/${n}`)}">Open the slides folder</a></div>`).join('')}</div>
<h2>Captions</h2><div class="card"><pre>${escapeHtml(cap.trim())}</pre></div>
<h2>${run.contact === 'dm' ? 'DM' : 'Email'} draft</h2><div class="card"><pre>${escapeHtml(draft.trim() || 'No draft found.')}</pre></div>
</main></body></html>`;
    await this.teamFolder.write(null, `pipeline/${run.handle}/review.html`, html);
  }
  startTimer() { this.timer = setInterval(() => void this.tick().catch(() => {}), 5000); this.timer.unref?.(); }
  async close() { this.closed = true; clearInterval(this.timer); await this.persist; }
}
