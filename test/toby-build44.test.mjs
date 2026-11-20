import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {parseExtraWorkdays, isWorkday} from '../src/workdays.mjs';
import {nextRun, weekdaySchedule} from '../src/schedules.mjs';
import {chooseCreators, askedHandles, scoreOf} from '../src/auto-pick.mjs';
import {Pipelines} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {toCsv, COLUMNS} from '../src/creator-log.mjs';

// Made-up creators and books only: real ones never go into this public repository.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).getTime();

test('build 44: extra workdays are read from board/extra-workdays.md', () => {
  const days = parseExtraWorkdays('# Extra workdays\n\n- 2026-01-10 weekend test\n2026-01-11\nnot a date 2026-01-12\n- 2026-13-01 bad month\n');
  assert.deepEqual([...days].sort(), ['2026-01-10', '2026-01-11']);
  assert.equal(isWorkday(at(2026, 1, 10, 9, 0)), false); // a Saturday
  assert.equal(isWorkday(at(2026, 1, 10, 9, 0), days), true);
  assert.equal(isWorkday(at(2026, 1, 12, 9, 0)), true); // a Monday
});

test('build 44: a weekday schedule also fires on an extra workday; a Friday-only one does not', () => {
  const weekdays = {kind: 'weekly', time: '07:00', days: [1, 2, 3, 4, 5], timezone: TZ}, friday = {kind: 'weekly', time: '16:00', days: [5], timezone: TZ};
  assert.equal(weekdaySchedule(weekdays), true); assert.equal(weekdaySchedule(friday), false);
  assert.equal(weekdaySchedule({kind: 'weekly', time: '07:00', days: [0, 1, 2, 3, 4, 5, 6], timezone: TZ}), false);
  const fridayNight = at(2026, 1, 9, 21, 0), extra = new Set(['2026-01-10', '2026-01-11']);
  assert.equal(nextRun(weekdays, fridayNight, at(2026, 1, 9, 7, 0)), at(2026, 1, 12, 7, 0));
  assert.equal(nextRun(weekdays, fridayNight, at(2026, 1, 9, 7, 0), extra), at(2026, 1, 10, 7, 0));
  assert.equal(nextRun(weekdays, at(2026, 1, 10, 7, 30), at(2026, 1, 10, 7, 0), extra), at(2026, 1, 11, 7, 0));
  assert.equal(nextRun(weekdays, at(2026, 1, 11, 7, 30), at(2026, 1, 11, 7, 0), extra), at(2026, 1, 12, 7, 0));
  assert.equal(nextRun(friday, fridayNight, at(2026, 1, 9, 16, 0), extra), at(2026, 1, 16, 16, 0));
});

const row = (handle, extra) => ({...Object.fromEntries(COLUMNS.map(c => [c, ''])), handle, stage_no: '1', stage: 'Found', found_date: '2026-01-12', score: '70', contact_route: 'email', base_book: 'none ready', ...extra});

test('build 44: the auto-pick takes ready-book creators first, then one new base book at most', () => {
  const rows = [
    row('newniche_a', {score: '90'}),
    row('fits_low', {score: '62', base_book: 'test-bread'}),
    row('fits_high', {score: '80', base_book: 'yes: test-bread', contact_route: 'DM'}),
    row('too_low', {score: '55 (below 60)', base_book: 'test-bread'}),
    row('asked_one', {score: '95', base_book: 'test-bread'}),
    row('old_find', {score: '99', base_book: 'test-bread', found_date: '2025-12-01'}),
    row('packaged', {score: '99', base_book: 'test-bread', stage_no: '10', stage: 'Approved'})];
  const asked = askedHandles('2026-01-12 D3 | for: X | ask: Package for @asked_one? | status: waiting\n2026-01-12 I9 | for: X | instruction: about @newniche_a | status: decided | 10:00\n');
  assert.deepEqual([...asked], ['asked_one']);
  const pick = chooseCreators({rows, today: '2026-01-12', readyBases: ['test-bread'], asked});
  assert.deepEqual(pick.packages.map(c => [c.handle, c.base, c.contact]), [['fits_high', 'test-bread', 'dm'], ['fits_low', 'test-bread', 'email']]);
  assert.equal(pick.book, null);
  assert.ok(pick.skipped.some(s => s.handle === 'asked_one' && /asked/.test(s.why)));
  assert.ok(pick.skipped.some(s => s.handle === 'too_low'));
  assert.ok(!pick.skipped.some(s => s.handle === 'old_find' || s.handle === 'packaged'));
  // Only one creator fits: the best other creator gets the new base book.
  const one = chooseCreators({rows: rows.filter(r => r.handle !== 'fits_low'), today: '2026-01-12', readyBases: ['test-bread'], asked});
  assert.deepEqual(one.packages.map(c => c.handle), ['fits_high']); assert.equal(one.book.handle, 'newniche_a');
  // A book run already today: no new base book.
  const none = chooseCreators({rows: rows.filter(r => r.handle !== 'fits_low'), today: '2026-01-12', readyBases: ['test-bread'], asked, newBookAllowed: false});
  assert.equal(none.book, null); assert.ok(none.skipped.some(s => s.handle === 'newniche_a'));
  assert.equal(scoreOf('78'), 78); assert.ok(Number.isNaN(scoreOf('near miss: x')));
});

function fakeService(names) {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input, _a, setup) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, sourceScheduleRunId: setup.scheduled.runId, status: 'complete', createdAt: Date.now()}); this.delivered.push({bot: state.bots.find(b => b.id === c.botId).name, input, setup}); }};
}
async function team(files) {
  const root = await mkdtemp(join(tmpdir(), 'toby-b44-'));
  for (const [p, body] of Object.entries(files)) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); }
  return root;
}
const READY = {'ebooks/test-bread/part-a.md': '# A\n', 'ebooks/test-bread/images/check.md': 'All pictures PASSED (3)\n', 'ebooks/test-bread/app/app-link.md': 'https://example.com/x\nLive when checked: yes\n'};
const BOTS = ['Toby', 'Creator Partnerships', 'Creative Studio', 'Edition Writer', 'App Builder', 'Art Director', 'Marketing Kit', 'Visual Check', 'Outreach Writer', 'Ebook Builder'];

test('build 44: on an extra workday the auto-pick waits for the finished creators file, then starts the runs: ready-book creators first, then 1 new base book through Toby', async () => {
  const sat = '2026-01-10';
  const ranked = `# Creators ${sat}\n\n## Ranked list\n| rank | handle | niche | country | followers | score | parts | contact | fits an existing book? | rising? |\n|---|---|---|---|---|---|---|---|---|---|\n| 1 | @test.baker.one | sourdough and baking | USA | 10,000 | 82 | x | email: one@example.com | test-bread | no |\n| 2 | @test_baker_two | sourdough and baking | UK | 8,000 | 70 | x | DM only | no | no |\n| 3 | @test_knitter | crochet and knitting | Canada | 20,000 | 88 | x | DM only | no | no |\n| 4 | @test_baker_three | sourdough and baking | USA | 9,000 | 65 | x | DM only | test-bread | no |\n`;
  const root = await team({...READY, 'board/decisions-2026-01.md': '2026-01-09 I4 | for: X | instruction: y | status: decided | 10:00\n', 'creators/creators-log.csv': toCsv([]), 'pipeline/steps.json': JSON.stringify({steps: [{id: 'voice', bot: 'Creator Partnerships', task: 'voice', gates: [{file: 'creators/voice/{handle}.md'}]}, {id: 'review', review: true}]})});
  const data = await mkdtemp(join(tmpdir(), 'toby-b44d-'));
  let now = at(2026, 1, 10, 7, 31);
  const service = fakeService(BOTS);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  const tick = async () => { now += 61000; p.lastAuto = 0; p.lastWatch = 0; p.workdays.checked = 0; await p.autoPick(); };
  await tick();
  assert.equal(p.runs.length, 0, 'a Saturday is not a workday without the list');
  await writeFile(join(root, 'board/extra-workdays.md'), `- ${sat} weekend test\n`);
  await mkdir(join(root, 'creators'), {recursive: true}); await writeFile(join(root, `creators/${sat}.md`), ranked);
  await tick();
  assert.equal(p.runs.length, 0, 'waits until the creators file says Status: done');
  await writeFile(join(root, `creators/${sat}.md`), ranked + '\nStatus: done\n');
  await tick();
  assert.deepEqual(p.runs.map(r => [r.handle, r.base, r.contact, r.by]), [['test.baker.one', 'test-bread', 'email', 'auto'], ['test_baker_three', 'test-bread', 'dm', 'auto']]);
  const decisions = await readFile(join(root, 'board/decisions-2026-01.md'), 'utf8');
  assert.match(decisions, /I5 \| for: .*PACKAGE RUN for @test\.baker\.one on base book test-bread \(picked by the Toby app's daily auto-pick under Tavin's standing rule, 07:3\d\)/);
  assert.equal(service.delivered.filter(d => d.bot === 'Toby').length, 0, 'two ready-book creators: no new base book today');
  const report = await readFile(join(root, `pipeline/auto-pick-${sat}.md`), 'utf8');
  assert.match(report, /@test_baker_two: no ready base book; today's 2 are already picked/);
  assert.match(report, /Picked: @test\.baker\.one, @test_baker_three/);
  assert.doesNotMatch(report, /new base book first/);
  const runs = await readFile(join(root, `board/runs-${sat}.md`), 'utf8');
  assert.match(runs, /\| Package runs \| done: auto-pick: @test\.baker\.one/);
  // Once a day only.
  const count = service.delivered.length; await tick(); await tick();
  assert.equal(p.runs.length, 2); assert.equal(service.delivered.filter(d => d.bot === 'Toby').length, 0); assert.ok(service.delivered.length >= count);
  const settings = JSON.parse(await readFile(join(root, 'pipeline/auto-pick.json'), 'utf8'));
  assert.equal(settings.enabled, true); assert.equal(settings.perDay, 2);
});

test('build 44: the auto-pick can be switched off in pipeline/auto-pick.json', async () => {
  const root = await team({...READY, 'pipeline/auto-pick.json': JSON.stringify({enabled: false}), 'creators/2026-01-12.md': '## Ranked list\n| rank | handle | niche | country | followers | score | p | contact | fits | r |\n|---|---|---|---|---|---|---|---|---|---|\n| 1 | @test_x | sourdough | USA | 1 | 90 | x | DM only | test-bread | no |\n\nStatus: done\n'});
  const data = await mkdtemp(join(tmpdir(), 'toby-b44d-'));
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service: fakeService(BOTS), busy: () => false, now: () => at(2026, 1, 12, 8, 0)}).init();
  await p.autoPick();
  assert.equal(p.runs.length, 0);
});

test('build 44: with one ready-book creator, the auto-pick asks Toby for one new base book, and waits while Toby is busy', async () => {
  const day = '2026-01-12';
  const ranked = `## Ranked list\n| rank | handle | niche | country | followers | score | p | contact | fits an existing book? | r |\n|---|---|---|---|---|---|---|---|---|---|\n| 1 | @test_one | sourdough and baking | USA | 1,000 | 75 | x | DM only | test-bread | no |\n| 2 | @test_knitter | crochet and knitting | Canada | 20,000 | 88 | x | email: k@example.com | no | no |\n\nStatus: done\n`;
  const root = await team({...READY, [`creators/${day}.md`]: ranked, 'creators/creators-log.csv': toCsv([]), 'pipeline/steps.json': JSON.stringify({steps: [{id: 'voice', bot: 'Creator Partnerships', task: 'voice', gates: [{file: 'creators/voice/{handle}.md'}]}, {id: 'review', review: true}]})});
  const data = await mkdtemp(join(tmpdir(), 'toby-b44d-'));
  let now = at(2026, 1, 12, 7, 45), tobyBusy = true;
  const service = fakeService(BOTS);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: c => tobyBusy && c.id === 'c0', now: () => now}).init();
  const tick = async () => { now += 61000; p.lastAuto = 0; await p.autoPick(); };
  await tick();
  assert.deepEqual(p.runs.map(r => r.handle), ['test_one']);
  assert.equal(service.delivered.filter(d => d.bot === 'Toby').length, 0);
  assert.match(await readFile(join(root, `pipeline/auto-pick-${day}.md`), 'utf8'), /waiting: Toby is busy/);
  tobyBusy = false; await tick();
  const asks = service.delivered.filter(d => d.bot === 'Toby');
  assert.equal(asks.length, 1); assert.match(asks[0].input, /@test_knitter/); assert.match(asks[0].input, /handle "test_knitter" and contact "email"/); assert.match(asks[0].input, /start_book_run/);
  await tick(); assert.equal(service.delivered.filter(d => d.bot === 'Toby').length, 1);
  // A restart keeps the day's state: nothing is picked twice.
  const again = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  await again.autoPick(); assert.equal(again.runs.length, 1); assert.equal(service.delivered.filter(d => d.bot === 'Toby').length, 1);
  assert.match(await readFile(join(root, `pipeline/auto-pick-${day}.md`), 'utf8'), /\| @test_knitter \| new base book first \(Toby starts the book run\) \| asked Toby at/);
});

import {Schedules} from '../src/schedules.mjs';
test('build 44: when board/extra-workdays.md appears, a weekday schedule moves its next run to the extra day', async () => {
  const root = await team({});
  let now = at(2026, 1, 9, 21, 0);
  const weekdays = {kind: 'weekly', time: '07:00', days: [1, 2, 3, 4, 5], timezone: TZ}, friday = {kind: 'weekly', time: '16:00', days: [5], timezone: TZ};
  const s = new Schedules({directory: root, encrypt: x => x, decrypt: x => x, service: {}, now: () => now, teamFolder: new TeamFolder(root)});
  s.items = [{id: 'a', enabled: true, timing: weekdays, nextRunAt: at(2026, 1, 12, 7, 0), runs: [{scheduledFor: at(2026, 1, 9, 7, 0), status: 'completed'}]},
    {id: 'b', enabled: true, timing: friday, nextRunAt: at(2026, 1, 16, 16, 0), runs: []}];
  assert.equal(await s.refreshWorkdays(), false);
  await mkdir(join(root, 'board'), {recursive: true}); await writeFile(join(root, 'board/extra-workdays.md'), '- 2026-01-10\n- 2026-01-11\n');
  now += 61000; assert.equal(await s.refreshWorkdays(), true);
  assert.equal(s.items[0].nextRunAt, at(2026, 1, 10, 7, 0)); assert.equal(s.items[1].nextRunAt, at(2026, 1, 16, 16, 0));
});

import {openCaptionChanges, BOOK_STEPS} from '../src/pipeline.mjs';
test('build 44: a book run gets an Art Director caption step only when Visual Check left open caption changes', async () => {
  const pics = '# Pictures\n\n## Caption changes (Visual Check)\nIntro line.\n- DONE (Art Director, 2026-01-10): images/a.jpg caption fixed\n- images/b.jpg (part-b.md). Caption now: "x". True caption: "y".\n\n## Caption changes (Visual Check): DONE (Art Director)\n- images/c.jpg old note\n\n## For Toby\n- nothing\n';
  assert.deepEqual(openCaptionChanges(pics), ['- images/b.jpg (part-b.md). Caption now: "x". True caption: "y".']);
  assert.deepEqual(openCaptionChanges('# P\n\n## For Toby\n- x\n'), []);
  const ids = BOOK_STEPS.steps.map(s => s.id);
  assert.deepEqual(ids.slice(ids.indexOf('picture-check'), ids.indexOf('rebuild') + 1), ['picture-check', 'captions', 'rebuild']);
  const root = await team({...READY, 'ebooks/test-bread/pictures.md': pics});
  const data = await mkdtemp(join(tmpdir(), 'toby-b44d-'));
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service: fakeService(BOTS), busy: () => false, now: () => at(2026, 1, 12, 9, 0)}).init();
  const step = BOOK_STEPS.steps.find(s => s.id === 'captions'), run = {kind: 'book', base: 'test-bread', startedAt: at(2026, 1, 12, 8, 0)};
  const reasons = await p.gates(run, step, at(2026, 1, 12, 8, 30));
  assert.equal(reasons.length, 1); assert.match(reasons[0], /1 line under "## Caption changes \(Visual Check\)" .* is not marked "- DONE"/);
  await writeFile(join(root, 'ebooks/test-bread/pictures.md'), pics.replace('- images/b.jpg', '- DONE (Art Director, 2026-01-12): images/b.jpg'));
  assert.deepEqual(await p.gates(run, step, at(2026, 1, 12, 8, 30)), []);
  // An older saved book-steps.json (version 1) is replaced by the new standard, with a backup.
  await mkdir(join(root, 'pipeline'), {recursive: true}); await writeFile(join(root, 'pipeline/book-steps.json'), JSON.stringify({version: 1, steps: [{id: 'old', bot: 'Ebook Builder'}]}));
  assert.ok((await p.steps('book')).some(s => s.id === 'captions'));
  assert.match(await readFile(join(root, 'pipeline/book-steps.v1.json'), 'utf8'), /"old"/);
});

import {splitDecisions, parseStanding} from '../src/decisions-archive.mjs';
test('build 44: decisions archiving moves finished lines older than 7 days and keeps standing rules and waiting questions', async () => {
  const text = ['2026-01-01 I1 | for: X | instruction: old job | status: decided | 10:00', '2026-01-01 I2 | for: X | instruction: OUTREACH PAUSED | status: decided | 10:00',
    '2026-01-02 D1 | for: X | ask: old question | status: waiting', '2026-01-02 D2 | for: X | ask: still open | status: waiting', '2026-01-03 D1 | answer: yes | status: decided | 09:00',
    '2026-01-03 I3 | for: X | instruction: keep me [standing] | status: decided | 10:00', '2026-01-10 I4 | for: X | instruction: recent | status: decided | 10:00', ''].join('\n');
  const out = splitDecisions({text, today: '2026-01-12', month: '2026-01', standing: parseStanding('Standing: I2, D7')});
  assert.equal(out.moved, 3);
  assert.match(out.archive, /old job[\s\S]*old question[\s\S]*D1 \| answer: yes/);
  assert.doesNotMatch(out.live, /old job|old question|D1 \| answer/);
  assert.match(out.live, /^> Archive note \(Toby app\): .*board\/archive\/decisions-2026-01\.md.*Standing rules always stay here: D7, I2\. .*the next new ones are D3 and I5\.\n\n2026-01-01 I2/);
  for (const keep of ['OUTREACH PAUSED', 'still open', 'keep me', 'recent']) assert.match(out.live, new RegExp(keep));
  // Running again moves nothing more and keeps one note.
  const again = splitDecisions({text: out.live, archiveText: out.archive, today: '2026-01-12', month: '2026-01', standing: parseStanding('I2 D7')});
  assert.equal(again.moved, 0); assert.equal(again.live.match(/Archive note/g).length, 1); assert.equal(again.archive, out.archive);
});

test('build 44: the app archives the decisions file at night and numbers new lines across both files', async () => {
  const filler = Array.from({length: 400}, (_, i) => `2026-01-01 I${i + 1} | for: X | instruction: ${'x'.repeat(120)} | status: decided | 10:00`).join('\n') + '\n2026-01-11 D9 | for: X | ask: open? | status: waiting\n';
  const root = await team({...READY, 'board/decisions-2026-01.md': filler});
  const data = await mkdtemp(join(tmpdir(), 'toby-b44d-'));
  let now = at(2026, 1, 12, 20, 0);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service: fakeService(BOTS), busy: () => false, now: () => now}).init();
  assert.equal(await p.archiveDecisions(), null, 'not before 21:00');
  now = at(2026, 1, 12, 21, 5);
  const out = await p.archiveDecisions();
  assert.equal(out.moved, 394, 'the 6 standing I lines stay'); assert.ok(out.after < 3000);
  assert.match(await readFile(join(root, 'board/archive/standing.md'), 'utf8'), /Standing: I11, I18, I36, I41, I60, I70, D3, D7/);
  const live = await readFile(join(root, 'board/decisions-2026-01.md'), 'utf8');
  assert.match(live, /D9 \| for: X \| ask: open\?/); assert.match(live, /^> Archive note/);
  assert.equal(await p.archiveDecisions(), null, 'once a night');
  const run = await p.start({handle: 'test_y', base: 'test-bread', contact: 'dm'});
  assert.equal(run.decision, 401, 'numbering carries on from the archive');
});

import {readdirSync, readFileSync} from 'node:fs';
test('build 44: nothing on screen or in the bots\' tools says Mac (Toby runs on Windows, and later on a server)', () => {
  const dir = new URL('../src/', import.meta.url), hits = [];
  for (const name of readdirSync(dir)) {
    if (!/\.(mjs|html|cjs)$/.test(name)) continue;
    const text = readFileSync(new URL(name, dir), 'utf8');
    for (const m of text.matchAll(/(?:this|your|the user[’']s) Mac\b|available on macOS/g)) hits.push(`${name}: ${m[0]}`);
  }
  assert.deepEqual(hits, []);
});
