import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Schedules,cutShort} from '../src/schedules.mjs';
import {ChatService} from '../src/chat-service.mjs';
import {Pipelines,baseName} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';

const encrypt = s => Buffer.from(s).map(b => b ^ 42), decrypt = b => Buffer.from(b).map(b => b ^ 42).toString();
const timing = {kind: 'weekly', time: '06:30', days: [1, 2, 3, 4, 5], timezone: 'Asia/Ho_Chi_Minh'};

test('Toby build 39: a scheduled run cut short by closing Toby or a run limit keeps its schedule on and tells the board', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'toby-b39-')), team = await mkdtemp(join(tmpdir(), 'toby-b39t-'));
  let now = Date.parse('2026-11-18T23:30Z');
  const service = new ChatService({dataDir: dir, backend: async function* () { yield 'Plan saved'; }}); await service.init();
  const s = await new Schedules({directory: dir, encrypt, decrypt, service, now: () => now, teamFolder: new TeamFolder(team)}).init();
  t.after(async () => { await s.close(); await service.close(); await rm(dir, {recursive: true, force: true}); await rm(team, {recursive: true, force: true}); });
  const chat = service.state.activeConversationId;
  const item = await s.create({conversationId: chat, title: 'Daily Plan', prompt: 'Make the plan', timing});
  await s.runNow({id: item.id, conversationId: chat}); await service.whenIdle();
  // What the app does to a reply that was still streaming when Toby quit.
  const reply = service._conversation(chat).messages.at(-1); reply.status = 'cancelled'; reply.error = 'Response interrupted when the app closed.';
  await s.tick();
  const row = s.get(item.id, chat);
  assert.equal(row.enabled, true, 'the schedule stays on');
  assert.equal(row.error, undefined);
  assert.equal(row.runs[0].status, 'interrupted');
  await new Promise(r => setTimeout(r, 50));
  const runs = await readFile(join(team, 'board/runs-2026-11-19.md'), 'utf8');
  assert.match(runs, /scheduled run "Daily Plan" was cut short; the schedule stays on/);
  assert.match(runs, /problems: Response interrupted when the app closed\./);
});

test('Toby build 39: only real interruptions count; a run Tavin stopped still pauses', () => {
  for (const e of ['Response interrupted when the app closed.', 'Paused at the tool-call limit. Partial work is saved. Review it before choosing Retry.', 'Paused after 30 minutes. Partial work is saved.', 'Paused after repeated tool failures in a row.']) assert.equal(cutShort(e), true, e);
  for (const e of ['Stopped', '', undefined, 'The model returned an error']) assert.equal(cutShort(e), false, String(e));
});

test('Toby build 39: the base book can be given with or without "ebooks/"', async () => {
  assert.equal(baseName('ebooks/sourdough-at-home'), 'sourdough-at-home');
  assert.equal(baseName('ebooks\\sourdough-at-home\\'), 'sourdough-at-home');
  assert.equal(baseName(' sourdough-at-home '), 'sourdough-at-home');
  const root = await mkdtemp(join(tmpdir(), 'toby-b39p-')), data = await mkdtemp(join(tmpdir(), 'toby-b39d-'));
  try {
    await mkdir(join(root, 'ebooks/test-bread'), {recursive: true}); await writeFile(join(root, 'ebooks/test-bread/part-a.md'), '# Base\n');
    const service = {state: {bots: [{id: 'b0', name: 'Creative Studio'}], conversations: [{id: 'c0', botId: 'b0', messages: [], updatedAt: 0}]}, async _deliver() {}};
    await mkdir(join(root, 'pipeline'), {recursive: true});
    await writeFile(join(root, 'pipeline/steps.json'), JSON.stringify({steps: [{id: 'look', bot: 'Creative Studio', task: 'look', gates: []}, {id: 'review', review: true}]}));
    const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false}).init();
    const run = await p.start({handle: 'testbaker', base: 'ebooks/test-bread'});
    assert.equal(run.base, 'test-bread');
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});
