import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, writeFile, readFile, utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {Pipelines, packageRetry} from '../src/pipeline.mjs';
import {chooseCreators, pickReport} from '../src/auto-pick.mjs';
import {TeamFolder} from '../src/team-folder.mjs';

// Made-up creators and books only: real ones never go into this public repository.

test('build 46: an app check that cannot read a fill-in table sends the fix to Edition Writer, then App Builder', () => {
  assert.deepEqual(packageRetry({id: 'app', bot: 'App Builder'}, ['ebooks/x/app/app-check.md does not say "Result: PASSED". Its own list: - Fill-in table not found: social']), ['Edition Writer', 'App Builder']);
  assert.deepEqual(packageRetry({id: 'app', bot: 'App Builder'}, ['app-link.md was not written.']), ['App Builder']);
  assert.deepEqual(packageRetry({id: 'visual', bot: 'Visual Check', retry: ['Marketing Kit', 'Visual Check']}, []), ['Marketing Kit', 'Visual Check']);
});

const row = (handle, score, base, contact = 'email: x@example.com') => ({handle, stage_no: '1', stage: 'Found', found_date: '2026-01-12', score: String(score), base_book: base, contact_route: contact});

test('build 46: auto-pick takes clean ready-book fits before "possible" ones, and the report reads cleanly', () => {
  const rows = [row('bigreach', 78, 'possible: test-van (lives in a camper)', 'DM'), row('cleanfit', 70, 'test-van'), row('puppyfit', 84, 'test-puppy'), row('low', '55 (below 60)', 'no')];
  const pick = chooseCreators({rows, today: '2026-01-12', readyBases: ['test-van', 'test-puppy']});
  assert.deepEqual(pick.packages.map(c => c.handle), ['puppyfit', 'cleanfit']);
  assert.ok(pick.skipped.some(s => s.handle === 'bigreach' && /^partly fits test-van/.test(s.why)));
  const low = pick.skipped.find(s => s.handle === 'low'); assert.equal(low.why, 'score 55 (below 60)');
  const md = pickReport({date: '2026-01-12', time: '07:30', picks: '@puppyfit, @cleanfit', skipped: pick.skipped, candidates: pick.candidates, started: [], book: null});
  assert.match(md, /Creators who could be picked: 3 \(found in the last 7 days/);
});

const BOTS = ['Toby', 'Edition Writer', 'App Builder', 'Art Director', 'Outreach Writer'];
function fakeService(names) {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input, _a, setup) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, sourceScheduleRunId: setup.scheduled.runId, status: 'complete'}); this.delivered.push({bot: state.bots.find(b => b.id === c.botId).name, input}); }};
}
const reply = (service, bot) => { const b = service.state.bots.find(x => x.name === bot), c = service.state.conversations.find(x => x.botId === b.id); c.messages.push({id: 'r' + Math.random(), role: 'assistant', status: 'complete', content: 'done'}); };
async function put(root, p, body, t) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); if (t) await utimes(join(root, p), new Date(t), new Date(t)); }

async function stoppedRun() {
  const steps = {version: 1, steps: [
    {id: 'app', bot: 'App Builder', task: 'build her app', gates: [{file: '{edition}/app/app-check.md', contains: ['Result: PASSED']}]},
    {id: 'plan', bot: 'Art Director', task: 'plan', gates: [{file: '{edition}/carousel/plan.md'}]},
    {id: 'email', bot: 'Outreach Writer', task: 'email', gates: [{file: 'outreach/breakdown-{handle}.html'}]},
    {id: 'review', review: true}]};
  const root = await mkdtemp(join(tmpdir(), 'toby-b46-')), data = await mkdtemp(join(tmpdir(), 'toby-b46d-'));
  const clock = {now: new Date(2026, 0, 12, 8, 0).getTime()};
  await put(root, 'pipeline/steps.json', JSON.stringify(steps)); await put(root, 'ebooks/test-book/part-a.md', '# A\n');
  const service = fakeService(BOTS);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => clock.now}).init();
  const ed = 'ebooks/test-book/editions/testmaker';
  await p.start({handle: 'testmaker', base: 'test-book', contact: 'email'}); await p.tick();
  // App check fails twice (first try and the fix run), so the run stops.
  const FAIL = '# App check\n- Result: NEEDS FIXES\n\n## To fix\n- Fill-in table not found: social\n';
  for (const bot of ['App Builder', 'Edition Writer', 'App Builder']) {
    clock.now += 60000; if (bot === 'App Builder') await put(root, `${ed}/app/app-check.md`, FAIL, clock.now);
    assert.equal(service.delivered.at(-1).bot, bot); reply(service, bot); await p.tick(); await p.tick();
  }
  return {p, root, data, clock, ed, service};
}

test('build 46: resume_package carries on a stopped run: finished steps pass without a message, then review', async () => {
  const {p, root, data, clock, ed, service} = await stoppedRun();
  try {
    let run = p.find('testmaker'); assert.equal(run.status, 'stopped');
    await assert.rejects(p.approve('testmaker'), /resume_package/);
    // The cause is fixed and the plan step is done by hand; the email step is not done yet.
    clock.now += 600000; await put(root, `${ed}/app/app-check.md`, '# App check\n- Result: PASSED\n', clock.now); await put(root, `${ed}/carousel/plan.md`, '# Plan\n', clock.now);
    const before = service.delivered.length;
    run = await p.resume('testmaker');
    assert.equal(run.status, 'running'); assert.equal(run.step, 2, 'app and plan already pass');
    await p.tick(); assert.equal(service.delivered.length, before + 1); assert.equal(service.delivered.at(-1).bot, 'Outreach Writer');
    clock.now += 60000; await put(root, 'outreach/breakdown-testmaker.html', '<p>x</p>', clock.now); reply(service, 'Outreach Writer'); await p.tick(); await p.tick();
    assert.equal(p.find('testmaker').status, 'review');
    const runs = await readFile(join(root, 'board/runs-2026-01-12.md'), 'utf8');
    assert.match(runs, /@testmaker package run resumed by Tavin; already passing: app, plan; next: step "email" \(Outreach Writer\)/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('build 46: resuming a run Tavin already approved by a decided line marks it approved, with no second line', async () => {
  const {p, root, data, clock, ed} = await stoppedRun();
  try {
    clock.now += 600000;
    for (const f of [`${ed}/app/app-check.md`]) await put(root, f, '# App check\n- Result: PASSED\n', clock.now);
    await put(root, `${ed}/carousel/plan.md`, '# Plan\n', clock.now); await put(root, 'outreach/breakdown-testmaker.html', '<p>x</p>', clock.now);
    const run0 = p.find('testmaker');
    const dec = 'board/decisions-2026-01.md', text = await readFile(join(root, dec), 'utf8');
    await put(root, dec, text + `2026-01-12 I9 | for: Outreach Writer, Toby | instruction: Tavin APPROVED @testmaker's package at 10:58 (package run I${run0.decision}): done by hand. | status: decided | 10:58\n`);
    const run = await p.resume('testmaker');
    assert.equal(run.status, 'approved');
    const after = await readFile(join(root, dec), 'utf8');
    assert.equal((after.match(/APPROVED @testmaker/g) || []).length, 1);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});
