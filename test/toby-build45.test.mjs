import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, writeFile, readFile, utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {Pipelines, hasVerdict, VERDICTS, DEFAULT_STEPS} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';

// Made-up creator and book only: real ones never go into this public repository.
// The failing file below has the same shape as a real Visual Check file of 21 Nov 2026 that the build 44 check passed.
const NOT_YET = '# Carousel check: @testmaker (Test Book)\nVisual Check, 2026-01-12 08:46.\n\n**Carousel B PASSED (8 of 8). Carousel A: 7 of 8 pass, 1 FAIL (slide 4, words only).** Not "Both carousels PASSED" yet.\n\n| carousel | slide | result | what I checked |\n|---|---|---|---|\n| A | 4 | FAIL | Words point to a table no slide shows. |\n\nCarousel A has one fail. One word change for Marketing Kit is in captions.md.\n';
const PASSED = '# Carousel check: @testmaker (Test Book)\nVisual Check, rechecked 2026-01-12 09:48.\n\n**Both carousels PASSED, 2026-01-12 09:48**\n';

test('build 45: a verdict counts only when it starts its own line, never inside a sentence', () => {
  assert.deepEqual(VERDICTS, ['Both carousels PASSED', 'All pictures PASSED']);
  assert.equal(hasVerdict(NOT_YET, 'Both carousels PASSED'), false);
  assert.equal(hasVerdict(PASSED, 'Both carousels PASSED'), true);
  assert.equal(hasVerdict('# Check\n\nBoth carousels PASSED, 2026-01-12 08:19\n', 'Both carousels PASSED'), true);
  assert.equal(hasVerdict('All pictures PASSED (37), 2026-01-12 09:46\n', 'All pictures PASSED'), true);
  assert.equal(hasVerdict('## Log\n- All pictures PASSED (37), 2026-01-12 19:49\n', 'All pictures PASSED'), true);
  assert.equal(hasVerdict('Status then: 35 of 36 pass. The "All pictures PASSED (36)" line of 16 Jan no longer held.\n', 'All pictures PASSED'), false);
  assert.equal(hasVerdict('', 'All pictures PASSED'), false);
});

const BOTS = ['Toby', 'Marketing Kit', 'Visual Check'];
function fakeService(names) {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input, _a, setup) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, sourceScheduleRunId: setup.scheduled.runId, status: 'complete'}); this.delivered.push({bot: state.bots.find(b => b.id === c.botId).name, input, setup}); }};
}
const reply = (service, bot) => { const b = service.state.bots.find(x => x.name === bot), c = service.state.conversations.find(x => x.botId === b.id); c.messages.push({id: 'r' + Math.random(), role: 'assistant', status: 'complete', content: 'done'}); };
async function put(root, p, body, t) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); if (t) await utimes(join(root, p), new Date(t), new Date(t)); }

test('build 45: a carousel FAIL hidden in a "Not ... yet" sentence does not pass; the fix run goes to Marketing Kit, then Visual Check', async () => {
  // The steps.json saved in the team folder (version 1, no fix notes), cut down to the visual step.
  const visual = DEFAULT_STEPS.steps.find(s => s.id === 'visual');
  const steps = {version: 1, steps: [{id: visual.id, bot: visual.bot, task: visual.task, retry: visual.retry, gates: [visual.gates[0]]}, {id: 'review', review: true}]};
  const root = await mkdtemp(join(tmpdir(), 'toby-b45-')), data = await mkdtemp(join(tmpdir(), 'toby-b45d-'));
  let now = new Date(2026, 0, 12, 8, 0).getTime();
  const ed = 'ebooks/test-book/editions/testmaker/carousel/check.md';
  await put(root, 'ebooks/test-book/part-a.md', '# A\n'); await put(root, 'pipeline/steps.json', JSON.stringify(steps));
  const service = fakeService(BOTS);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  const step = async (bot, files = {}) => { now += 60000; for (const [f, b] of Object.entries(files)) await put(root, f, b, now); reply(service, bot); await p.tick(); await p.tick(); };
  try {
    await p.start({handle: 'testmaker', base: 'test-book', contact: 'email'});
    await p.tick(); assert.equal(service.delivered.at(-1).bot, 'Visual Check');
    await step('Visual Check', {[ed]: NOT_YET});
    let run = p.find('testmaker');
    assert.equal(run.status, 'running', 'not sent to review'); assert.equal(run.attempt, 1, 'one fix run');
    assert.equal(service.delivered.at(-1).bot, 'Marketing Kit');
    assert.match(service.delivered.at(-1).input, /^Package run for @testmaker: Visual Check's visual step did not pass the automatic check, and it needs your part fixed first\. Visual Check failed a slide\. Make every open line under "## Word changes \(Visual Check\)" in ebooks\/test-book\/editions\/testmaker\/carousel\/captions\.md/);
    assert.match(service.delivered.at(-1).input, /does not say "Both carousels PASSED"\..*Its FAIL rows: \| A \| 4 \| FAIL \|/s);
    await step('Marketing Kit');
    assert.equal(service.delivered.at(-1).bot, 'Visual Check');
    assert.match(service.delivered.at(-1).input, /write the line "Both carousels PASSED, <date> <time>" on its own line only when every slide of both carousels passes/);
    await step('Visual Check', {[ed]: PASSED});
    run = p.find('testmaker'); assert.equal(run.status, 'review');
    const runs = await readFile(join(root, 'board/runs-2026-01-12.md'), 'utf8');
    assert.match(runs, /@testmaker step "visual" did not pass; fix run started/);
    assert.match(runs, /@testmaker package READY for Tavin's review/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});
