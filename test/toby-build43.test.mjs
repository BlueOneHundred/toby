import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stampRunLines} from '../src/claude-backend.mjs';

test('build 43: a placeholder time like HH:MM on a run line gets the real time', () => {
  const p = 'board/runs-2026-01-05.md';
  assert.equal(stampRunLines(p, 'HH:MM | Marketing Kit | done: kit saved', '16:31'), '16:31 | Marketing Kit | done: kit saved');
  assert.equal(stampRunLines(p, 'hh:mm | Some Bot | done: x', '09:02'), '09:02 | Some Bot | done: x');
  assert.equal(stampRunLines(p, '17:00 | Some Bot | done: x', '17:47'), '17:47 | Some Bot | done: x');
  assert.equal(stampRunLines(p, 'NOW | Lead Researcher | done: no search', '07:30'), '07:30 | Lead Researcher | done: no search');
  assert.equal(stampRunLines(p, '| Marketing Kit | done: no kit work', '15:40'), '15:40 | Marketing Kit | done: no kit work');
  assert.equal(stampRunLines(p, 'Marketing Kit | done: x', '15:40'), '15:40 | Marketing Kit | done: x');
  assert.equal(stampRunLines(p, '| file | PASS | ok |', '15:40'), '| file | PASS | ok |');
  assert.equal(stampRunLines(p, 'Notes about HH:MM | not a run line', '10:00'), 'Notes about HH:MM | not a run line');
  assert.equal(stampRunLines('notes/other.md', 'HH:MM | Bot | done: x', '10:00'), 'HH:MM | Bot | done: x');
});

test('build 43: ticking a project step updates the "N of M steps ticked" line straight away', () => {
  const html = readFileSync(new URL('../templates/app/template-general.html', import.meta.url), 'utf8');
  assert.match(html, /class="xcount"[^>]*>\$\{ticked\} of \$\{r\.steps\.length\} steps ticked/);
  assert.match(html, /case 'check':[^\n]*querySelector\('\.xcount'\)/);
});

// ---- Book runs (build 43). A made-up base book only: real books and creators never go into this public repository.
import {mkdtemp, rm, mkdir, writeFile, readFile as readText, utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {Pipelines, BOOK_STEPS, bookDecisionLine} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';

const SLUG = 'test-shed', NICHE = 'garden shed building';
const NICHES = '# Book types\n\n| Niche | Type |\n|---|---|\n| sourdough and baking | recipe |\n| DIY home projects | project |\n\nNotes:\n- one\n';
const BOTS = ['Toby', 'Ebook Builder', 'Art Director', 'Creative Studio', 'Visual Check', 'App Builder', 'Creator Partnerships'];
function fakeService(names) {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input, _a, setup) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, sourceScheduleRunId: setup.scheduled.runId, status: 'complete'}); this.delivered.push({bot: state.bots.find(b => b.id === c.botId).name, input, setup}); }};
}
const reply = (service, bot, status = 'complete') => { const b = service.state.bots.find(x => x.name === bot), c = service.state.conversations.find(x => x.botId === b.id); c.messages.push({id: 'r' + Math.random(), role: 'assistant', status, content: 'done'}); };
async function team(files) {
  const root = await mkdtemp(join(tmpdir(), 'toby-b43-'));
  for (const [p, body] of Object.entries(files)) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); }
  return root;
}
async function put(root, p, body, t) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); await utimes(join(root, p), new Date(t), new Date(t)); }
const B = p => `ebooks/${SLUG}/${p}`;
const PICS = `# Pictures\n\nC. cover.png | 2:3 | ebooks/${SLUG}/cover.png\n\n1. images/ch1-opener.jpg | 16:9 | Chapter 1\n2. images/ch1-saw.jpg | 3:2 | Chapter 1\n`;

test('build 43: a book run makes the whole base book bot by bot, sends the picture redos back, then starts the package run by itself', async () => {
  const pkgSteps = {steps: [{id: 'voice', bot: 'Creator Partnerships', task: 'make her voice file', gates: [{file: 'creators/voice/{handle}.md'}]}, {id: 'review', review: true}]};
  const root = await team({'templates/book-types/niches.md': NICHES, 'pipeline/steps.json': JSON.stringify(pkgSteps), 'board/decisions-2026-11.md': '2026-11-20 I66 | for: X | instruction: y | status: decided | 07:43\n'});
  const data = await mkdtemp(join(tmpdir(), 'toby-b43d-'));
  let now = new Date(2026, 10, 20, 8, 0).getTime();
  const service = fakeService(BOTS);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  const step = async (bot, files, status = 'complete') => { now += 60000; for (const [f, b] of Object.entries(files)) await put(root, f, b, now); reply(service, bot, status); await p.tick(); await p.tick(); };
  try {
    const run = await p.startBook({base: SLUG, niche: NICHE, topic: 'build a small garden shed from a kit', type: 'project', handle: '@testbuilder', contact: 'email', notes: 'Keep | roofing simple'});
    assert.equal(run.decision, 67); assert.equal(run.kind, 'book');
    const decisions = await readText(join(root, 'board/decisions-2026-11.md'), 'utf8');
    assert.match(decisions, /^2026-11-20 I67 \| for: Ebook Builder, Art Director, Creative Studio, Visual Check, App Builder, Toby \| instruction: BOOK RUN, NEW BASE BOOK ebooks\/test-shed .*Type for ebooks\/test-shed: project .*starts the package run for @testbuilder.*Keep \/ roofing simple \| status: decided \| 08:00\n$/m);
    assert.doesNotMatch(decisions, /—|–/, 'no dashes');
    assert.match(await readText(join(root, 'templates/book-types/niches.md'), 'utf8'), /\| DIY home projects \| project \|\n\| garden shed building \| project \|\n\nNotes/, 'the niche is added to the table');
    await assert.rejects(p.startBook({base: SLUG, niche: NICHE, topic: 't', type: 'project'}), /already has a book run going/);

    await p.tick(); assert.equal(service.delivered.at(-1).bot, 'Ebook Builder');
    assert.match(service.delivered.at(-1).input, /^Book run for ebooks\/test-shed \(new base book, niche garden shed building, Type: project\), step 1 of 6: write the new base book ebooks\/test-shed: plan\.md first with the line "Type: project".*this message is Tavin's go/);
    // 1. A plan that still waits for Tavin's type does not pass; the fix run says why.
    await step('Ebook Builder', {[B('plan.md')]: 'Type: project (please confirm)\n'});
    assert.equal(p.findBook(SLUG).attempt, 1);
    assert.match(service.delivered.at(-1).input, /^Book run for ebooks\/test-shed: your book step did not pass.*\n- ebooks\/test-shed\/plan\.md still says "\(please confirm\)"/s);
    await step('Ebook Builder', {[B('plan.md')]: 'Type: project\n', [B('part-a.md')]: '## Chapter 1: Plan\n', [B('part-b.md')]: '', [B('part-c.md')]: '', [B('book-check.md')]: '# Book check: Shed\n- Result: PASSED\n- Book type: project (Project and skill)\n- Pictures placed: 0, missing: 0\n', [B('book.pdf')]: '%PDF'});
    assert.equal(p.findBook(SLUG).step, 1); assert.equal(service.delivered.at(-1).bot, 'Art Director');
    assert.match(service.delivered.at(-1).input, /step 2 of 6: plan the pictures/);
    // 2. Art Director: pictures.md and the picture lines.
    await step('Art Director', {[B('pictures.md')]: PICS, [B('part-a.md')]: '## Chapter 1: Plan\n\n![A saw](images/ch1-saw.jpg)\n'});
    assert.equal(service.delivered.at(-1).bot, 'Creative Studio'); assert.match(service.delivered.at(-1).input, /Tavin's go \(cap \$3\.50/);
    // 3. Creative Studio misses a picture: the fix run names it.
    await step('Creative Studio', {[B('cover.png')]: 'png', [B('images/ch1-opener.jpg')]: 'jpg'});
    assert.match(service.delivered.at(-1).input, /1 of 3 pictures are not made yet: ebooks\/test-shed\/images\/ch1-saw\.jpg/);
    await step('Creative Studio', {[B('images/ch1-saw.jpg')]: 'jpg'});
    assert.equal(service.delivered.at(-1).bot, 'Visual Check');
    // 4. Visual Check fails a picture: Creative Studio makes the redo, Visual Check checks again (two rounds allowed).
    await step('Visual Check', {[B('images/check.md')]: '| ch1-saw.jpg | FAIL | extra finger |\n'});
    assert.equal(service.delivered.at(-1).bot, 'Creative Studio');
    assert.match(service.delivered.at(-1).input, /Visual Check's picture-check step did not pass the automatic check, and it needs your part fixed first\. Make every open line under "## Redo requests \(Visual Check\)" in ebooks\/test-shed\/plan\.md.*\n- .*Its FAIL rows: \| ch1-saw\.jpg \| FAIL \| extra finger \|/s);
    await step('Creative Studio', {[B('images/ch1-saw.jpg')]: 'jpg2'});
    assert.equal(service.delivered.at(-1).bot, 'Visual Check'); assert.match(service.delivered.at(-1).input, /Check again every picture Creative Studio has just remade/);
    await step('Visual Check', {[B('images/check.md')]: '| ch1-saw.jpg | FAIL | still a finger |\n'});
    assert.equal(p.findBook(SLUG).attempt, 2, 'a second fix round for the pictures'); assert.equal(service.delivered.at(-1).bot, 'Creative Studio');
    await step('Creative Studio', {[B('images/ch1-saw.jpg')]: 'jpg3'});
    await step('Visual Check', {[B('images/check.md')]: 'All pictures PASSED (3), 2026-11-20 09:10\n'});
    assert.equal(service.delivered.at(-1).bot, 'Ebook Builder'); assert.match(service.delivered.at(-1).input, /step 5 of 6: rebuild/);
    // 5. Rebuild with every picture in place.
    await step('Ebook Builder', {[B('book-check.md')]: '# Book check: Shed\n- Result: PASSED\n- Book type: project\n- Pictures placed: 2, missing: 0\n', [B('book.pdf')]: '%PDF2'});
    assert.equal(service.delivered.at(-1).bot, 'App Builder');
    // 6. The showcase app; then the book is ready and the creator's package run starts by itself.
    await step('App Builder', {[B('app/app-check.md')]: '# App check\n- Result: PASSED\n- Book type: project (tabs: Today, Projects, Progress, Read, Yours)\n', [B('app/app-link.md')]: '- Link: https://app.example.org/shed-showcase/\n- Live when checked: yes\n', [B('app/index.html')]: '<html></html>'});
    const book = p.findBook(SLUG);
    assert.equal(book.status, 'done'); assert.equal(book.appLink, 'https://app.example.org/shed-showcase/');
    const pkg = p.find('testbuilder'); assert.equal(pkg.status, 'running'); assert.equal(pkg.base, SLUG); assert.equal(pkg.decision, 68);
    await p.tick(); assert.equal(service.delivered.at(-1).bot, 'Creator Partnerships'); assert.match(service.delivered.at(-1).input, /^Package run for @testbuilder, step 1 of 1/);
    const status = await readText(join(root, `pipeline/book-${SLUG}/status.md`), 'utf8');
    assert.match(status, /Status: done/); assert.match(status, /package run started by itself/);
    const runs = await readText(join(root, 'board/runs-2026-11-20.md'), 'utf8');
    assert.match(runs, /Package runs \| done: book run ebooks\/test-shed started/);
    assert.match(runs, /book run ebooks\/test-shed step "picture-check" did not pass; fix run started/);
    assert.match(runs, /book run ebooks\/test-shed READY: book, pictures and showcase app all passed \(https:\/\/app\.example\.org\/shed-showcase\/\)/);
    assert.match(runs, /@testbuilder package run started by itself after book run ebooks\/test-shed \(I68\)/);
    assert.match(await readText(join(root, 'pipeline/status.md'), 'utf8'), /\| book: test-shed \(for @testbuilder\) \| test-shed \| done \|/);
    assert.equal(service.delivered.find(d => d.bot === 'Ebook Builder').setup.scheduled.title, 'Book run test-shed: Ebook Builder');
    // It survives a restart, and the finished book cannot start again.
    const again = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
    assert.equal(again.findBook(SLUG).status, 'done');
    await put(root, B('images/check.md'), 'All pictures PASSED (3)\n', now);
    await assert.rejects(again.startBook({base: SLUG, niche: NICHE, topic: 't', type: 'project'}), /already a finished base book/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('build 43: a book run stops for Tavin after its fix runs, and checks what it is given', async () => {
  const root = await team({'templates/book-types/niches.md': NICHES});
  const data = await mkdtemp(join(tmpdir(), 'toby-b43d-'));
  let now = new Date(2026, 10, 20, 8, 0).getTime();
  const service = fakeService(BOTS);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  try {
    await assert.rejects(p.startBook({base: 'Bad Name!', niche: NICHE, topic: 't', type: 'project'}), /folder name/);
    await assert.rejects(p.startBook({base: SLUG, niche: NICHE, topic: 't', type: 'guess'}), /one of care, recipe, project, routine.*never guess/);
    await assert.rejects(p.startBook({base: SLUG, niche: '', topic: 't', type: 'project'}), /Give the niche/);
    const lonely = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service: fakeService(['Toby']), busy: () => false}).init();
    await assert.rejects(lonely.startBook({base: SLUG, niche: NICHE, topic: 't', type: 'project'}), /No chat found for the bot "Ebook Builder"/);
    // A niche already on the list is not added twice; a book run with no creator just ends ready.
    await p.startBook({base: SLUG, niche: 'DIY home projects', topic: 'shelves', type: 'project'});
    assert.equal((await readText(join(root, 'templates/book-types/niches.md'), 'utf8')).match(/DIY home projects/g).length, 1);
    assert.deepEqual(JSON.parse(await readText(join(root, 'pipeline/book-steps.json'), 'utf8')), BOOK_STEPS, 'the standard book steps are saved where Tavin can see them');
    for (let i = 0; i < 3; i++) { await p.tick(); now += 60000; reply(service, 'Ebook Builder'); await p.tick(); }
    const run = p.findBook(SLUG);
    assert.equal(run.status, 'stopped'); assert.match(run.reason, /still did not pass after 2 fix runs:\n- ebooks\/test-shed\/plan\.md was not written/);
    assert.match(await readText(join(root, `pipeline/book-${SLUG}/status.md`), 'utf8'), /## Why it stopped/);
    assert.match(await readText(join(root, 'board/runs-2026-11-20.md'), 'utf8'), /book run ebooks\/test-shed stopped; needs a look/);
    assert.equal(p.find(SLUG), undefined, 'a book run is never mistaken for a package run');
    await p.startBook({base: SLUG, niche: 'DIY home projects', topic: 'shelves', type: 'project'});
    const stopped = await p.stopBook(SLUG); assert.equal(stopped.status, 'stopped');
    await assert.rejects(p.stopBook(SLUG), /No book run going/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('build 43: the book steps run in the agreed order and the decided line has no dashes', () => {
  assert.deepEqual(BOOK_STEPS.steps.map(s => s.bot || 'ready'), ['Ebook Builder', 'Art Director', 'Creative Studio', 'Visual Check', 'Ebook Builder', 'App Builder', 'ready']);
  assert.ok(BOOK_STEPS.steps.find(s => s.id === 'showcase').gates.some(g => g.phone), 'the showcase app is checked at phone size');
  const line = bookDecisionLine({n: 70, base: SLUG, niche: NICHE, topic: 'a shed', type: 'project', when: new Date(2026, 10, 20, 8, 5).getTime()});
  assert.match(line, /^2026-11-20 I70 \| .* no package run starts by itself\. .*\| status: decided \| 08:05\n$/); assert.doesNotMatch(line, /—|–/);
});

test('build 43: a run line always starts on its own line', async () => {
  const {startsOwnLine} = await import('../src/team-folder.mjs');
  const root = await team({'board/runs-2026-11-20.md': '07:30 | Product Scout | done: x | problems: none', 'notes/a.md': 'abc'});
  try {
    const f = new TeamFolder(root);
    await f.append('board/runs-2026-11-20.md', '08:16 | Ebook Builder | done: y\n');
    assert.equal(await readText(join(root, 'board/runs-2026-11-20.md'), 'utf8'), '07:30 | Product Scout | done: x | problems: none\n08:16 | Ebook Builder | done: y\n');
    await f.append('notes/a.md', 'def'); assert.equal(await readText(join(root, 'notes/a.md'), 'utf8'), 'abcdef', 'other files are left as they are');
    assert.equal(startsOwnLine('board/decisions-2026-11.md', Buffer.from('x\n'), 'y'), false);
  } finally { await rm(root, {recursive: true, force: true}); }
});
