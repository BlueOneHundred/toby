import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {runPackageCheck,emailSection,editionBoxes,CAROUSEL_LINE,checkBreakdownText,bare} from '../src/package-check.mjs';
import {Pipelines,decisionLine,nextInstruction,DEFAULT_STEPS} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {slideHtml} from '../src/carousel-builder.mjs';
import {APP_PHONE_SCRIPT,PHONE} from '../src/app-phone-check.mjs';

// A made-up creator. Real creators' words never go into this public repository.
const H = 'testbaker', BASE = 'test-bread';
const caption = i => `${i}. 2026-10-${String(i).padStart(2, '0')} https://www.instagram.com/p/AbC${i}xyz/\n"Caption ${i}: this loaf came out so yummy, peep that swirl ${i}! @flourbrand"\n`;
const voice = `# Voice file: Test (@${H})\nProfile: Ohio, USA, test@example.com\nBio: "Bread for busy people"\n\n## Captions\n${Array.from({length: 22}, (_, i) => caption(i + 1)).join('\n')}\nFollower question: "do you have adjustments for high altitude"\n`;
const chapter = (n, box) => `## Chapter ${n}: Part ${n}\n\nSome text about bread.\n\n> From Test's kitchen: ${box} [Creator: add a line.]\n\n`;
const goodParts = Array.from({length: 12}, (_, i) => chapter(i + 1, i === 4 ? 'One loaf had too much in it, and "this loaf came out so yummy" was not the word.' : 'My loaves get loaded up.')).join('') + '## Sources\n\nS1 | Colour of crusts | 2020\n';
const slides = name => JSON.stringify({title: name, handle: H, layout: 'panel', slides: [{type: 'cover', title: 'Save your **starter**!', kicker: 'Got a jar?'}, {type: 'point', title: 'Keep it cold', body: 'In the fridge it keeps for weeks.'}, {type: 'end', title: 'Bread Book'}]});
const captions = `# Captions\n\n## Captions for Test\n\n### Carousel A\n\nPaid partnership. Quick note: I earn from each sale of this.\n\nSave your starter!\n\n### Carousel B\n\nPaid partnership. Quick note: I earn from each sale of this.\n\nKeep your loaf good.\n\n## Notes (internal)\n\nComment "bread" and I'll send it.\n`;
const link = 'https://app.blueonehundred.com/bread-book-testbaker-abc12345/';
const email = (body) => `# Send sheet\n\n## First emails\n\n### @${H} (Test) · real pitch · NOT sent\n- **Attach:** none\n\n**Subject options**\n1. A book for you\n\n**Email 1 (about 150 words)**\n\n${body}\n\n**Follow-up (3 days later)**\n\nHi again.\n\n**Why this is safe to send**\n- ok\n`;
const goodEmail = `Hi Test,\n\nYour swirl loaf stayed with me: "peep that swirl 3".\n\nWe made you "Bread Book":\n${link}kit/\n\nYour flop story sits in Chapter 5.\n\n${CAROUSEL_LINE}\n\nKeep 60%, no cost. No is fine.\n\nDan`;
const breakdown = (share = '$342') => `<table><tr><td>Buyers (13,700 followers x 0.1%, 0.25%, 0.5%, rounded down)</td><td>13</td><td>34</td><td>68</td></tr><tr><td>Sales (buyers x $47)</td><td>$611</td><td>$1,598</td><td>$3,196</td></tr><tr><td>Less estimated fees (6% plus $0.30 a sale)</td><td>$41</td><td>$106</td><td>$212</td></tr><tr><td>Left after fees</td><td>$570</td><td>$1,492</td><td>$2,984</td></tr><tr><td>Your 60%</td><td>${share}</td><td>$895</td><td>$1,790</td></tr></table><p>Estimate, not a forecast.</p>`;

async function team(files) {
  const root = await mkdtemp(join(tmpdir(), 'toby-b36-'));
  for (const [p, body] of Object.entries(files)) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); }
  return root;
}
const ed = `ebooks/${BASE}/editions/${H}`;
const goodFiles = () => ({
  [`creators/voice/${H}.md`]: voice, [`ebooks/${BASE}/part-a.md`]: '# Base\n', [`${ed}/part-a.md`]: goodParts, [`${ed}/part-b.md`]: '', [`${ed}/part-c.md`]: '',
  [`${ed}/book-check.md`]: '# Book check: Bread Book\n\n- Result: PASSED\n', [`${ed}/app/app-link.md`]: `- Link: ${link}\n- Live when checked: yes\n`,
  [`${ed}/carousel/A-starter/slides.json`]: slides('A'), [`${ed}/carousel/A-starter/carousel-check.md`]: '- Result: PASSED\n',
  [`${ed}/carousel/B-loaf/slides.json`]: slides('B'), [`${ed}/carousel/B-loaf/carousel-check.md`]: '- Result: PASSED\n',
  [`${ed}/carousel/_old-1/slides.json`]: '{"slides":[{"title":"my kids"}]}', [`${ed}/carousel/captions.md`]: captions,
  ['outreach/send-sheet-2026-11-18.md']: email(goodEmail), [`outreach/breakdown-${H}.html`]: breakdown()
});

test('Toby build 36: a good package passes the automatic check', async () => {
  const root = await team(goodFiles());
  try {
    const r = await runPackageCheck(root, {handle: '@' + H, base: BASE});
    assert.deepEqual(r.items.filter(i => i.level === 'fail'), []);
    assert.equal(r.passed, true); assert.match(r.markdown, /Result: PASSED/);
    assert.equal(r.path, join('ebooks', BASE, 'editions', H, 'package-check.md'));
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('Toby build 36: the check catches what Claude caught by hand on 18 Nov', async () => {
  const files = goodFiles();
  files[`${ed}/part-a.md`] = goodParts
    .replace('My loaves get loaded up.', 'I always say "never ever skip the salt step" in my reels.')
    .replace('Some text about bread.', 'I bake with my two kids every weekend. The colour is lovely. Thanks @flourbrand!');
  files[`${ed}/carousel/captions.md`] = captions.replace('Save your starter!', 'Comment "starter" and I\'ll send the recipe! My husband loves it.');
  files['outreach/send-sheet-2026-11-18.md'] = email(goodEmail.replace(CAROUSEL_LINE, 'Here are two carousels.').replace('Chapter 5', 'Chapter 13').replace('"peep that swirl 3"', '"this loaf came out so yummy, peep that swirl at the end for sure"') + '\n[POSTAL ADDRESS NEEDED: D3]\nChapter 9 grew from your reels.');
  files[`outreach/breakdown-${H}.html`] = breakdown('$400');
  const root = await team(files);
  try {
    const r = await runPackageCheck(root, {handle: H, base: BASE}), msgs = r.items.filter(i => i.level === 'fail').map(i => i.message).join('\n');
    assert.equal(r.passed, false);
    assert.match(msgs, /quotes words that are not in her voice file: "never ever skip the salt step"/);
    assert.match(msgs, /my two kids/);
    assert.match(msgs, /UK spelling "colour"/);
    assert.match(msgs, /tags @flourbrand/);
    assert.match(msgs, /asks followers to comment a keyword/);
    assert.match(msgs, /Captions mentions "My husband"/);
    assert.match(msgs, /carousel line word for word/);
    assert.match(msgs, /Quote over 8 words/);
    assert.match(msgs, /names Chapter 13, but none of her "From" boxes/);
    assert.doesNotMatch(msgs, /names Chapter 9/, 'Chapter 9 holds a box');
    assert.match(msgs, /postal address placeholder/);
    assert.match(msgs, /grew from/);
    assert.match(msgs, /"Your 60%" Low shows 400; the arithmetic gives 342/);
    assert.doesNotMatch(msgs, /Colour of crusts/, 'source titles in the Sources list are left alone');
    assert.match(r.markdown, /## To fix\n- Edition Writer:/);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('Toby build 36: the email check reads the newest full Email 1, not a sign-off update', () => {
  const sheet = email(goodEmail) + `\n## Update 17:52\n\n### @${H} · final sign-offs · NOT sent\n\n**Email 1 sign-off (final)**\n\nDan\n`;
  const found = emailSection(sheet, H);
  assert.ok(found.email.includes(link)); assert.ok(!found.email.includes('Why this is safe'));
  assert.equal(emailSection('### @someoneelse\n\n**Email 1**\n\nHi', H), null);
  assert.equal(bare('Another day - another shaping video!!'), bare('another day, another shaping video'));
  assert.deepEqual(editionBoxes(goodParts).map(b => b.chapter), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('Toby build 36: breakdown arithmetic matches the one Claude checked for Hillary', () => {
  const report = {items: []}; checkBreakdownText(report, {html: breakdown()}); assert.deepEqual(report.items, []);
});

// A pretend chat service: bots, their chats and _deliver like the real one. Replies are added by the test.
function fakeService(names) {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input, _a, setup) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, sourceScheduleRunId: setup.scheduled.runId, status: 'complete'}); this.delivered.push({bot: state.bots.find(b => b.id === c.botId).name, input}); }};
}
const touch = (root, p, t) => utimes(join(root, p), new Date(t), new Date(t));
const reply = (service, bot, status = 'complete') => { const b = service.state.bots.find(x => x.name === bot), c = service.state.conversations.find(x => x.botId === b.id); c.messages.push({id: 'r' + Math.random(), role: 'assistant', status, content: 'done'}); };

test('Toby build 36: a package run goes bot by bot, gates each step, gives one fix run, then waits for Tavin', async () => {
  const steps = {steps: [
    {id: 'voice', bot: 'Creator Partnerships', task: 'make her voice file', gates: [{file: 'creators/voice/{handle}.md'}, {check: ['voice']}]},
    {id: 'carousels', bot: 'Marketing Kit', task: 'make 2 carousels', retry: ['Art Director', 'Marketing Kit'], gates: [{file: '{edition}/carousel/captions.md', contains: ['Paid partnership']}]},
    {id: 'review', review: true}]};
  const root = await team({[`ebooks/${BASE}/part-a.md`]: '# Base\n', 'pipeline/steps.json': JSON.stringify(steps), 'board/decisions-2026-11.md': '2026-11-18 I57 | for: X | instruction: y | status: decided | 17:28\n'});
  const data = await mkdtemp(join(tmpdir(), 'toby-b36d-'));
  let now = new Date(2026, 10, 19, 9, 0).getTime();
  const service = fakeService(['Toby', 'Creator Partnerships', 'Art Director', 'Marketing Kit']);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  try {
    const run = await p.start({handle: '@' + H, base: BASE, contact: 'email', notes: 'Keep her | dog out'});
    assert.equal(run.decision, 58);
    const decisions = await readFile(join(root, 'board/decisions-2026-11.md'), 'utf8');
    assert.match(decisions, /^2026-11-19 I58 \| for: Creator Partnerships, .* \| instruction: PACKAGE RUN for @testbaker on base book test-bread .*Keep her \/ dog out \| status: decided \| 09:00\n$/m);
    await assert.rejects(p.start({handle: H, base: BASE}), /already has a package run/);
    await p.tick(); assert.equal(service.delivered.at(-1).bot, 'Creator Partnerships'); assert.match(service.delivered.at(-1).input, /Package run for @testbaker, step 1 of 2/);
    await p.tick(); assert.equal(service.delivered.length, 1, 'waits while the bot works');
    // Step 1 writes a good voice file and passes.
    now += 60000; await mkdir(join(root, 'creators/voice'), {recursive: true}); await writeFile(join(root, `creators/voice/${H}.md`), voice); await touch(root, `creators/voice/${H}.md`, now); reply(service, 'Creator Partnerships');
    await p.tick(); assert.equal(p.find(H).step, 1);
    await p.tick(); assert.equal(service.delivered.at(-1).bot, 'Marketing Kit');
    // Step 2 fails its gate: the fix run goes to Art Director, then Marketing Kit, with the reasons.
    now += 60000; reply(service, 'Marketing Kit');
    await p.tick(); assert.equal(p.find(H).attempt, 1);
    await p.tick(); assert.equal(service.delivered.at(-1).bot, 'Art Director'); assert.match(service.delivered.at(-1).input, /it needs your part fixed first\. Fix exactly these.*\n- .*captions\.md was not written/);
    now += 60000; reply(service, 'Art Director'); await p.tick(); await p.tick();
    assert.equal(service.delivered.at(-1).bot, 'Marketing Kit'); assert.match(service.delivered.at(-1).input, /your carousels step did not pass/);
    now += 60000; await mkdir(join(root, ed, 'carousel'), {recursive: true}); await writeFile(join(root, ed, 'carousel/captions.md'), captions); await touch(root, `${ed}/carousel/captions.md`, now); reply(service, 'Marketing Kit');
    await p.tick(); await p.tick();
    assert.equal(p.find(H).status, 'review');
    const review = await readFile(join(root, `pipeline/${H}/review.html`), 'utf8'); assert.match(review, /approve @testbaker/); assert.match(review, /Save your starter!/);
    assert.match(await readFile(join(root, `pipeline/${H}/status.md`), 'utf8'), /Status: review/);
    const runs = await readFile(join(root, 'board/runs-2026-11-19.md'), 'utf8');
    assert.match(runs, /Package runs \| done: @testbaker step "voice" \(Creator Partnerships\) passed/); assert.match(runs, /READY for Tavin's review/);
    const approved = await p.approve(H, 'Looks great');
    assert.equal(approved.status, 'approved'); assert.match(await readFile(join(root, 'board/decisions-2026-11.md'), 'utf8'), /I59 \| for: Outreach Writer, Toby \| instruction: Tavin APPROVED @testbaker's package/);
    // The run survives a restart of the app.
    const again = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
    assert.equal(again.find(H).status, 'approved');
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('Toby build 36: a step that fails twice stops the run and says why on the board', async () => {
  const steps = {steps: [{id: 'look', bot: 'Creative Studio', task: 'write her look file', gates: [{file: 'creators/look/{handle}.md', contains: ['Palette:']}]}, {id: 'review', review: true}]};
  const root = await team({[`ebooks/${BASE}/part-a.md`]: '# Base\n', 'pipeline/steps.json': JSON.stringify(steps)});
  const data = await mkdtemp(join(tmpdir(), 'toby-b36d-')); let now = new Date(2026, 10, 19, 10, 0).getTime();
  const service = fakeService(['Creative Studio']);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  try {
    await p.start({handle: H, base: BASE});
    await p.tick(); now += 1000; reply(service, 'Creative Studio', 'error'); await p.tick();
    assert.equal(p.find(H).attempt, 1, 'a bot error counts as a failed try');
    await p.tick(); now += 1000; await mkdir(join(root, 'creators/look'), {recursive: true}); await writeFile(join(root, `creators/look/${H}.md`), 'Cover photo: base cover\n'); await touch(root, `creators/look/${H}.md`, now); reply(service, 'Creative Studio');
    await p.tick();
    const run = p.find(H); assert.equal(run.status, 'stopped'); assert.match(run.reason, /still did not pass after one fix run:\n- creators\/look\/testbaker\.md does not say "Palette:"/);
    assert.match(await readFile(join(root, `pipeline/${H}/status.md`), 'utf8'), /## Why it stopped/);
    assert.match(await readFile(join(root, 'board/runs-2026-11-19.md'), 'utf8'), /package run stopped; needs a look/);
    // An old file from before the run does not count as this run's work.
    await p.start({handle: H, base: BASE}); await utimes(join(root, `creators/look/${H}.md`), new Date(2026, 0, 1), new Date(2026, 0, 1));
    await p.tick(); now += 1000; reply(service, 'Creative Studio'); await p.tick();
    assert.match(p.find(H).history.at(-1).reasons[0], /was not updated in this run/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('Toby build 36: starting checks the handle, the base book and the bots', async () => {
  const root = await team({[`ebooks/${BASE}/part-a.md`]: '# Base\n'});
  const data = await mkdtemp(join(tmpdir(), 'toby-b36d-'));
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service: fakeService(['Toby']), busy: () => false}).init();
  try {
    await assert.rejects(p.start({handle: 'bad handle!', base: BASE}), /Instagram handle/);
    await assert.rejects(p.start({handle: H, base: 'nope'}), /No base book at ebooks\/nope/);
    await assert.rejects(p.start({handle: H, base: BASE}), /No chat found for the bot "Creator Partnerships"/);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'pipeline/steps.json'), 'utf8')), DEFAULT_STEPS, 'the standard steps are saved where Tavin can see them');
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('Toby build 36: the standard steps cover the whole package in order', () => {
  const s = DEFAULT_STEPS.steps;
  assert.deepEqual(s.map(x => x.bot || 'review'), ['Creator Partnerships', 'Creative Studio', 'Edition Writer', 'App Builder', 'Art Director', 'Marketing Kit', 'Visual Check', 'Outreach Writer', 'Outreach Writer', 'review']);
  assert.ok(s.find(x => x.id === 'app').gates.some(g => g.phone), 'the app is checked at phone size');
  assert.equal(nextInstruction('2026-11-18 I9 | x\n2026-11-18 I57 | y\n2026-11-18 D3 | z'), 58);
  const line = decisionLine({n: 60, handle: H, base: BASE, contact: 'dm', notes: '', when: new Date(2026, 10, 19, 8, 5).getTime()});
  assert.match(line, /^2026-11-19 I60 \| for: .* \| status: decided \| 08:05\n$/); assert.match(line, /Instagram DM draft/); assert.doesNotMatch(line, /—|–/, 'no dashes');
});

test('Toby build 36 (build 50): carousel words always sit on the main colour, however long the title', () => {
  const html = slideHtml({slide: {type: 'cover', title: "Don't pour out your **discard**!", kicker: 'Discard'}, index: 1, total: 8, layout: 'panel', paletteName: 'terracotta', handle: H});
  assert.match(html, /\.slide\.dark \.txt\{z-index:2\}/); assert.match(html, /\.slide\.dark \.txt::before\{content:'';position:absolute/);
});

test('Toby build 36: the phone check opens every tab and a chapter at 390 px', () => {
  assert.deepEqual(PHONE, {width: 390, height: 844});
  for (const bit of ['skipsetup', 'nav [data-go]', 'First hours', 'scrolls sideways', 'did not load', '[data-go^="ch-"]']) assert.ok(APP_PHONE_SCRIPT.includes(bit), bit);
  assert.doesNotThrow(() => new Function('return ' + APP_PHONE_SCRIPT.replace(/^\(async/, '(async')));
});
