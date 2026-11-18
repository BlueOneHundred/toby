import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {CreatorLog,parseCsv,toCsv,rankedCreators,renderLogHtml,COLUMNS,STAGES,LOG_CSV,LOG_HTML} from '../src/creator-log.mjs';
import {Pipelines} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';

// Made-up creators only. Real creators' details never go into this public repository.
const H = 'testbaker', BASE = 'test-bread';
async function team(files) {
  const root = await mkdtemp(join(tmpdir(), 'toby-b38-'));
  for (const [p, body] of Object.entries(files)) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), body); }
  return root;
}
const ranked = `# Creators, 2026-11-19\n\n## Ranked list\n| rank | handle | niche | country | followers | score | reach / demand / teaches / fit / consistency | contact | fits an existing book? | rising? |\n|---|---|---|---|---|---|---|---|---|---|\n| 1 | @newbaker | sourdough and baking | USA | 21,500 | 81 | 22 / 25 / 20 / 8 / 6 | email: new@example.com | sourdough-at-home | no history |\n| 2 | @${H} | sourdough and baking | UK | 9,000 | 70 | 15 / 18 / 20 / 8 / 9 | DM only | no | no history |\n| 3 | @agentbaker | meal prep | UK | 99,000 | 62 | 8 / 10 / 20 / 15 / 9 | email: sam@talentco.example (talent manager) | no | no history |\n\n## 1. New Baker\nMore text | with | pipes | that | is | not | a | row |\n`;
const existing = toCsv([{...Object.fromEntries(COLUMNS.map(c => [c, ''])), handle: H, name: 'Test, "the baker"', stage_no: '1', stage: 'Found', notes: 'kept, with a comma'}]);

test('Toby build 38: the log reads and writes CSV with commas and quotes safely', () => {
  const rows = parseCsv(existing);
  assert.equal(rows.length, 1); assert.equal(rows[0].name, 'Test, "the baker"'); assert.equal(rows[0].notes, 'kept, with a comma');
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test('Toby build 38: new ranked creators come from Creator Partnerships\' daily file', () => {
  const found = rankedCreators(ranked, 'creators/2026-11-19.md');
  assert.deepEqual(found.map(f => f.handle), ['newbaker', H, 'agentbaker']);
  assert.equal(found[0].followers, '21500'); assert.equal(found[0].contact, 'new@example.com'); assert.equal(found[0].base_book, 'sourdough-at-home'); assert.equal(found[0].found_date, '2026-11-19');
  assert.equal(found[1].contact_route, 'DM'); assert.equal(found[1].contact, `https://www.instagram.com/${H}/`); assert.equal(found[1].base_book, 'none ready');
  assert.equal(found[2].contact_route, 'email (talent manager)');
  assert.deepEqual(rankedCreators('# Creators\nNo table today.\n', 'creators/2026-11-20.md'), []);
});

test('Toby build 38: found creators are added once, existing rows are never changed, and the page is rebuilt', async () => {
  const root = await team({'creators/2026-11-19.md': ranked, [LOG_CSV]: existing});
  const now = new Date(2026, 10, 19, 7, 40).getTime();
  try {
    const log = new CreatorLog({teamRoot: root, teamFolder: new TeamFolder(root), now: () => now});
    assert.equal(await log.scanFound(), 2);
    assert.equal(await log.scanFound(), 0, 'an unchanged file is not read again');
    const rows = parseCsv(await readFile(join(root, LOG_CSV), 'utf8'));
    assert.deepEqual(rows.map(r => r.handle), [H, 'newbaker', 'agentbaker']);
    assert.equal(rows[0].name, 'Test, "the baker"', 'existing row untouched');
    assert.equal(rows[1].stage, 'Found'); assert.equal(rows[1].stage_no, '1'); assert.equal(rows[1].waiting_on, 'Tavin: pick in the brief'); assert.equal(rows[1].stage_updated, '2026-11-19');
    const page = await readFile(join(root, LOG_HTML), 'utf8');
    assert.match(page, /Creator progress log/); assert.match(page, /@newbaker/); assert.match(page, /Updated 2026-11-19 07:40/);
    assert.doesNotMatch(page, /"the baker"/, 'text is escaped in the page');
  } finally { await rm(root, {recursive: true, force: true}); }
});

const fakeService = names => {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input, _a, setup) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, sourceScheduleRunId: setup.scheduled.runId, status: 'complete'}); this.delivered.push({bot: state.bots.find(b => b.id === c.botId).name, input}); }};
};
const reply = (service, bot) => { const b = service.state.bots.find(x => x.name === bot), c = service.state.conversations.find(x => x.botId === b.id); c.messages.push({id: 'r' + Math.random(), role: 'assistant', status: 'complete', content: 'done'}); };
const touch = (root, p, t) => utimes(join(root, p), new Date(t), new Date(t));

test('Toby build 38: a package run moves the creator along the log by itself, then Toby records what Tavin says', async () => {
  const steps = {steps: [
    {id: 'look', bot: 'Creative Studio', task: 'write her look file', gates: [{file: 'creators/look/{handle}.md', contains: ['Palette:']}]},
    {id: 'visual', bot: 'Visual Check', task: 'check both carousels', gates: [{file: 'creators/look/{handle}.md'}]},
    {id: 'review', review: true}]};
  const root = await team({[`ebooks/${BASE}/part-a.md`]: '# Base\n', 'pipeline/steps.json': JSON.stringify(steps), [LOG_CSV]: existing});
  const data = await mkdtemp(join(tmpdir(), 'toby-b38d-')); let now = new Date(2026, 10, 19, 9, 0).getTime();
  const service = fakeService(['Creative Studio', 'Visual Check']);
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  const row = async h => parseCsv(await readFile(join(root, LOG_CSV), 'utf8')).find(r => r.handle === h);
  try {
    await p.start({handle: H, base: BASE, contact: 'dm'});
    assert.equal((await row(H)).stage, 'Picked'); assert.equal((await row(H)).base_book, BASE);
    await p.tick(); now += 60000; await mkdir(join(root, 'creators/look'), {recursive: true}); await writeFile(join(root, `creators/look/${H}.md`), 'Palette: terracotta\nCover photo: base cover\n'); await touch(root, `creators/look/${H}.md`, now); reply(service, 'Creative Studio');
    await p.tick();
    let r = await row(H); assert.equal(r.stage, 'Look'); assert.equal(r.stage_no, '4'); assert.equal(r.stage_updated, '2026-11-19 09:01'); assert.match(r.next_step, /^Visual Check: check both carousels/);
    await p.tick(); now += 60000; await touch(root, `creators/look/${H}.md`, now); reply(service, 'Visual Check'); await p.tick(); await p.tick();
    r = await row(H); assert.equal(r.stage, 'Visual Check'); assert.equal(r.waiting_on, 'Tavin: review'); assert.match(r.next_step, /approve @testbaker/);
    assert.equal(p.find(H).status, 'review');
    await p.approve(H); assert.equal((await row(H)).stage, 'Approved');
    now += 3600000; await p.log.setByTavin('@TestBaker', 'Sent');
    r = await row(H); assert.equal(r.stage, 'Sent'); assert.equal(r.stage_no, '11'); assert.equal(r.stage_updated, '2026-11-19 10:02');
    await p.log.setByTavin(H, 'No', 'not right now, maybe in spring');
    r = await row(H); assert.equal(r.stage, 'No'); assert.match(r.notes, /kept, with a comma; 2026-11-19: not right now, maybe in spring/);
    await assert.rejects(p.log.setByTavin(H, 'Maybe'), /stage must be one of/);
    await assert.rejects(p.log.setByTavin('nobody_here', 'Sent'), /not in the creator log/);
    assert.match(await readFile(join(root, LOG_HTML), 'utf8'), /Said no or dropped/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('Toby build 38: a stopped run says so in the log, and the page lists every stage', async () => {
  assert.equal(STAGES.length, 15);
  const page = renderLogHtml([], new Date(2026, 10, 19, 6, 0).getTime());
  for (const s of STAGES) assert.ok(page.includes(s.replace('+', '+')));
  const root = await team({[LOG_CSV]: existing}); const now = new Date(2026, 10, 19, 11, 0).getTime();
  try {
    const log = new CreatorLog({teamRoot: root, teamFolder: new TeamFolder(root), now: () => now});
    await log.stopped({handle: H}, 'Step "edition" still did not pass');
    const r = parseCsv(await readFile(join(root, LOG_CSV), 'utf8'))[0];
    assert.equal(r.waiting_on, 'Tavin: package run stopped'); assert.match(r.next_step, /pipeline\/testbaker\/status\.md/); assert.equal(r.stage, 'Found', 'the stage itself stays');
  } finally { await rm(root, {recursive: true, force: true}); }
});
