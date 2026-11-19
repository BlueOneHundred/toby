import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {Schedules,hitLimit,WRAP_UP} from '../src/schedules.mjs';
import {ChatService} from '../src/chat-service.mjs';
import {Pipelines,secondTryMessage} from '../src/pipeline.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {CreatorLog,parseCsv,LOG_CSV} from '../src/creator-log.mjs';
import {buildBook} from '../src/book-builder.mjs';

// Made-up creators only.
const encrypt = s => Buffer.from(s).map(b => b ^ 42), decrypt = b => Buffer.from(b).map(b => b ^ 42).toString();
const timing = {kind: 'weekly', time: '07:00', days: [1, 2, 3, 4, 5], timezone: 'Asia/Ho_Chi_Minh'};
async function team(files) { const root = await mkdtemp(join(tmpdir(), 'toby-b40-')); for (const [p, b] of Object.entries(files)) { await mkdir(dirname(join(root, p)), {recursive: true}); await writeFile(join(root, p), b); } return root; }

test('Toby build 40: a scheduled run that hits its run limit gets one turn to save its work, and only one', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'toby-b40s-')); let now = Date.parse('2026-11-19T00:00Z');
  const seen = [];
  const service = new ChatService({dataDir: dir, backend: async function* ({messages}) { seen.push(messages.at(-1).content); yield 'Saved'; }}); await service.init();
  const s = await new Schedules({directory: dir, encrypt, decrypt, service, now: () => now}).init();
  t.after(async () => { await s.close(); await service.close(); await rm(dir, {recursive: true, force: true}); });
  const chat = service.state.activeConversationId;
  const item = await s.create({conversationId: chat, title: 'Morning creator search', prompt: 'Search', timing});
  await s.runNow({id: item.id, conversationId: chat}); await service.whenIdle();
  const reply = service._conversation(chat).messages.at(-1); reply.status = 'cancelled'; reply.error = 'Paused at the tool-call limit. Partial work is saved. Review it before choosing Retry.';
  await s.tick(); await service.whenIdle();
  let row = s.get(item.id, chat);
  assert.equal(row.enabled, true); assert.equal(row.runs[0].status, 'interrupted'); assert.equal(row.runs[1].kind, 'wrapup');
  assert.match(seen.at(-1), /stopped at its run limit/);
  assert.equal(service._conversation(chat).messages.filter(m => m.content === WRAP_UP || String(m.content).includes('stopped at its run limit')).length >= 1, true);
  // The save turn itself hits the limit: no third turn.
  const again = service._conversation(chat).messages.at(-1); again.status = 'cancelled'; again.error = 'Paused at the tool-call limit. Partial work is saved.';
  await s.tick(); await service.whenIdle(); await s.tick();
  row = s.get(item.id, chat); assert.equal(row.runs.length, 2); assert.equal(row.runs[1].status, 'interrupted');
  assert.equal(hitLimit('Response interrupted when the app closed.'), false, 'closing Toby does not get a save turn');
});

const fake = names => {
  const state = {bots: names.map((name, i) => ({id: 'b' + i, name})), conversations: names.map((_, i) => ({id: 'c' + i, botId: 'b' + i, messages: [], updatedAt: i}))};
  return {state, delivered: [], async _deliver(c, input) { c.messages.push({id: 'm' + Math.random(), role: 'user', content: input, status: 'complete', createdAt: Date.now()}); this.delivered.push(input); }};
};

test('Toby build 40: no finished creator list by 08:15 on a weekday means one second try, ready-book creators first', async () => {
  const root = await team({'creators/2026-11-19.md': '# Creators, 2026-11-19\nStatus: in progress\n'});
  const data = await mkdtemp(join(tmpdir(), 'toby-b40d-'));
  let now = new Date(2026, 10, 19, 8, 0).getTime();
  const service = fake(['Creator Partnerships']);
  service.state.conversations[0].messages.push({role: 'user', content: 'Do today\'s creator search', status: 'complete', createdAt: new Date(2026, 10, 19, 7, 0).getTime()});
  const p = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service, busy: () => false, now: () => now}).init();
  try {
    await p.watchCreators(); assert.equal(service.delivered.length, 0, 'too early');
    now = new Date(2026, 10, 19, 8, 16).getTime(); await p.watchCreators();
    assert.equal(service.delivered.length, 1); assert.match(service.delivered[0], /READY-BOOK TOP-UP FIRST/);
    assert.match(await readFile(join(root, 'pipeline/second-try-2026-11-19.md'), 'utf8'), /asked it for a second try/);
    assert.match(await readFile(join(root, 'board/runs-2026-11-19.md'), 'utf8'), /asked Creator Partnerships for a second try/);
    now += 120000; await p.watchCreators(); assert.equal(service.delivered.length, 1, 'only once a day');
    // A finished file, a weekend, or a busy bot: no second try.
    const root2 = await team({'creators/2026-11-20.md': '# Creators\n...\nStatus: done\n'});
    const p2 = await new Pipelines({directory: data, teamRoot: root2, teamFolder: new TeamFolder(root2), service: fake(['Creator Partnerships']), busy: () => false, now: () => new Date(2026, 10, 20, 11, 0).getTime()}).init();
    await p2.watchCreators(); assert.equal(p2.service.delivered.length, 0);
    const p3 = await new Pipelines({directory: data, teamRoot: root2, teamFolder: new TeamFolder(root2), service: fake(['Creator Partnerships']), busy: () => false, now: () => new Date(2026, 10, 21, 11, 0).getTime()}).init();
    await p3.watchCreators(); assert.equal(p3.service.delivered.length, 0, 'Saturday');
    const p4 = await new Pipelines({directory: data, teamRoot: root, teamFolder: new TeamFolder(root), service: fake(['Creator Partnerships']), busy: () => true, now: () => new Date(2026, 10, 23, 11, 0).getTime()}).init();
    await p4.watchCreators(); assert.equal(p4.service.delivered.length, 0, 'still working');
    assert.match(secondTryMessage('2026-11-19'), /Status: done/);
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('Toby build 40: a package for a near miss fills her row from the creators file', async () => {
  const root = await team({'creators/2026-11-19.md': '# Creators\n\n## Near misses\n| handle | niche | followers | gate failed or score | evidence |\n|---|---|---|---|---|\n| @testbaker (Test Baker) | sourdough | 202,251 | G1 unclear (would score about 85) | No country. Email TestBaker@example.com |\n'});
  try {
    const log = new CreatorLog({teamRoot: root, teamFolder: new TeamFolder(root), now: () => new Date(2026, 10, 19, 8, 26).getTime()});
    await log.started({handle: 'testbaker', base: 'test-bread', contact: 'email'});
    const r = parseCsv(await readFile(join(root, LOG_CSV), 'utf8'))[0];
    assert.equal(r.name, 'Test Baker'); assert.equal(r.niche, 'sourdough'); assert.equal(r.followers, '202251'); assert.equal(r.contact, 'TestBaker@example.com');
    assert.equal(r.found_file, 'creators/2026-11-19.md'); assert.equal(r.stage, 'Picked'); assert.equal(r.base_book, 'test-bread');
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('Toby build 40: on a long title the sources seal moves up onto the photo', () => {
  const parts = ['## Chapter 1: One\n\nText.\n', '## Chapter 2: Two\n\nText.\n'];
  const long = buildBook({title: 'Bread Without the Long Waiting', badge: 'Built from 42 trusted sources', parts}).html;
  const short = buildBook({title: 'Bread Book', badge: 'Built from 42 trusted sources', parts}).html;
  assert.match(long, /<div class="seal high">/); assert.match(short, /<div class="seal">/);
  assert.match(long, /\.seal\.high\{top:calc\(57% - 42mm\)\}/);
});

test('Toby build 41: run lines get the real time; other files and other lines are left alone', async () => {
  const {stampRunLines, localTimeLine, clockNow} = await import('../src/claude-backend.mjs');
  assert.equal(stampRunLines('board/runs-2026-11-19.md', '~08:40 | Creator Partnerships | done: x | cost: $0.04 | problems: none\n', '08:08'), '08:08 | Creator Partnerships | done: x | cost: $0.04 | problems: none\n');
  assert.equal(stampRunLines('board\\runs-2026-11-19.md', '09:40 | Visual Check | done: y', '09:12'), '09:12 | Visual Check | done: y');
  assert.equal(stampRunLines('board/runs-2026-11-19.md', 'Art Director | done: z | cost: $0', '09:05'), '09:05 | Art Director | done: z | cost: $0');
  assert.equal(stampRunLines('board/runs-2026-11-19.md', 'A note that mentions 12:00 | nothing else', '09:05'), 'A note that mentions 12:00 | nothing else');
  assert.equal(stampRunLines('creators/2026-11-19.md', '09:40 | x', '09:12'), '09:40 | x');
  assert.equal(stampRunLines('board/decisions-2026-11.md', '09:40 | x', '09:12'), '09:40 | x');
  const t = new Date(2026, 10, 19, 9, 12); assert.equal(clockNow(t).hhmm, '09:12');
  assert.match(localTimeLine(t), /09:12 .*never a guess/);
});
