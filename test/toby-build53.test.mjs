import test from 'node:test';
import assert from 'node:assert/strict';
import {Schedules, staleRun, nextRun} from '../src/schedules.mjs';

// Build 53: a run missed on an earlier day is skipped, not run late. Made-up schedules only.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).getTime();
const weekdays = {kind: 'weekly', time: '06:30', days: [1, 2, 3, 4, 5], timezone: TZ};
const friday = {kind: 'weekly', time: '16:00', days: [5], timezone: TZ};
// 2026-01-09 is a Friday, 2026-01-10 a Saturday, 2026-01-12 a Monday.

test('build 53: staleRun skips earlier days and weekday runs on a day off; same-day late runs still run', () => {
  assert.equal(staleRun(weekdays, at(2026, 1, 9, 6, 30), at(2026, 1, 10, 7, 10)), true); // Friday's run, opened Saturday
  assert.equal(staleRun(friday, at(2026, 1, 9, 16, 0), at(2026, 1, 10, 7, 10)), true);
  assert.equal(staleRun(weekdays, at(2026, 1, 9, 6, 30), at(2026, 1, 12, 6, 0)), true); // Friday's run, opened Monday before 06:30
  assert.equal(staleRun(weekdays, at(2026, 1, 12, 6, 30), at(2026, 1, 12, 9, 0)), false); // laptop asleep at 06:30, opened 09:00: runs late as before
  assert.equal(staleRun(weekdays, at(2026, 1, 12, 6, 30), at(2026, 1, 12, 6, 0)), false); // not due yet
  assert.equal(staleRun({kind: 'interval', minutes: 60, timezone: TZ}, at(2026, 1, 9, 6, 30), at(2026, 1, 10, 7, 10)), false);
  assert.equal(staleRun({kind: 'cron', expression: '0 9 1 * *', timezone: TZ}, at(2026, 1, 1, 9, 0), at(2026, 1, 10, 7, 10)), false);
  // A weekday schedule on an extra workday that was removed from the list: no late run on the day off.
  assert.equal(staleRun({...weekdays, days: [1, 2, 3, 4, 5]}, at(2026, 1, 10, 6, 30), at(2026, 1, 10, 7, 0)), true);
  assert.equal(staleRun(weekdays, at(2026, 1, 10, 6, 30), at(2026, 1, 10, 7, 0), new Set(['2026-01-10'])), false);
});

function fakeApp(now, items) {
  const delivered = [], lines = [];
  const conversation = {id: 'c1', messages: []};
  const service = {
    closing: false, changingThreads: new Set(), teams: {busy: () => false, waiting: () => false},
    state: {conversations: [conversation], bots: [{id: 'b1', name: 'Test Bot'}]},
    _conversation: () => conversation,
    _deliver: async (c, prompt, a, setup) => { delivered.push(setup.scheduled.title); c.messages.push({role: 'user', sourceScheduleRunId: setup.scheduled.runId}); },
  };
  const teamFolder = {root: () => null, append: async (path, text) => { lines.push([path, text]); }};
  const s = new Schedules({directory: '/nonexistent', encrypt: async x => x, decrypt: async x => x, service, teamFolder, now: () => now.t});
  s.opened = true; s.save = async () => {}; s.items = items; s.workdays = {get: async () => new Set()};
  return {s, delivered, lines};
}

test('build 53: opening Toby on Saturday after a closed Friday starts nothing, and Monday runs as normal', async () => {
  const now = {t: at(2026, 1, 10, 7, 10)};
  const items = [
    {id: 'a', conversationId: 'c1', botId: 'b1', title: 'Morning plan', prompt: 'p', timing: weekdays, enabled: true, nextRunAt: at(2026, 1, 9, 6, 30), runs: []},
    {id: 'b', conversationId: 'c1', botId: 'b1', title: 'Friday review', prompt: 'p', timing: friday, enabled: true, nextRunAt: at(2026, 1, 9, 16, 0), runs: []},
    {id: 'c', conversationId: 'c1', botId: 'b1', title: 'Thursday afternoon', prompt: 'p', timing: {...weekdays, time: '15:40'}, enabled: true, nextRunAt: at(2026, 1, 8, 15, 40), runs: []},
  ];
  const {s, delivered, lines} = fakeApp(now, items);
  await s.tick(); await s.tick();
  assert.deepEqual(delivered, []);
  assert.equal(items[0].nextRunAt, at(2026, 1, 12, 6, 30));
  assert.equal(items[1].nextRunAt, at(2026, 1, 16, 16, 0));
  assert.equal(items[2].nextRunAt, at(2026, 1, 12, 15, 40));
  assert.ok(items.every(i => i.enabled && i.runs.length === 0 && i.skipped.length === 1));
  await new Promise(r => setTimeout(r, 0));
  assert.equal(lines.length, 3);
  assert.ok(lines.every(([path, text]) => path === 'board/runs-2026-01-10.md' && /missed \(Toby was closed\) and skipped, not run late/.test(text)));
  now.t = at(2026, 1, 12, 6, 31);
  await s.tick();
  assert.deepEqual(delivered, ['Morning plan']);
  assert.equal(items[0].nextRunAt, at(2026, 1, 13, 6, 30));
});

test('build 53: a run missed earlier the same day still runs once, late', async () => {
  const now = {t: at(2026, 1, 12, 9, 0)};
  const items = [{id: 'a', conversationId: 'c1', botId: 'b1', title: 'Morning plan', prompt: 'p', timing: weekdays, enabled: true, nextRunAt: at(2026, 1, 12, 6, 30), runs: []}];
  const {s, delivered} = fakeApp(now, items);
  await s.tick();
  assert.deepEqual(delivered, ['Morning plan']);
  assert.equal(items[0].nextRunAt, nextRun(weekdays, now.t, at(2026, 1, 12, 6, 30)));
});
