// Build 52: a Gmail draft Tavin scheduled is not made again (24-25 Nov: scheduled emails came back as duplicate drafts).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OutreachMail} from '../src/outreach-mail.mjs';
import {Gmail} from '../src/gmail.mjs';

async function setup({exists = false, scheduled = false, existsErr = null, schedErr = null} = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'toby52-')); const tried = []; const lines = []; let t = 1_000_000;
  const g = {exists, scheduled, existsErr, schedErr};
  const gmail = {status: () => ({connected: true}), sendAsFor: () => null,
    draftExists: async () => { if (g.existsErr) throw g.existsErr; return g.exists; },
    scheduledTo: async () => { if (g.schedErr) throw g.schedErr; return g.scheduled; }};
  const log = {read: async () => [{handle: 'pipbakes', stage: 'Approved', contact_route: 'email'}]};
  const teamFolder = {append: async (_f, line) => { lines.push(line); }};
  const m = await new OutreachMail({gmail, teamRoot: dir, teamFolder, log, directory: dir, now: () => t}).init();
  m.state.creators.pipbakes = {draftId: 'd1', to: 'pip@example.com'};
  m.draftPitch = async h => { tried.push(h); m.state.creators[h] = {...m.state.creators[h], draftId: 'd' + (tried.length + 1)}; return {ok: true}; };
  return {dir, m, g, tried, lines, tick: ms => { t += ms; }};
}

test('build 52: a scheduled draft is left alone and said once on the run board', async () => {
  const s = await setup({scheduled: true});
  try {
    await s.m.draftApproved(); await s.m.draftApproved();
    assert.deepEqual(s.tried, []);
    assert.equal(s.m.state.creators.pipbakes.draftId, 'd1', 'the draft is still tracked, so Sent is matched later');
    assert.equal(s.lines.filter(l => /Scheduled folder/.test(l)).length, 1);
  } finally { await rm(s.dir, {recursive: true, force: true}); }
});

test('build 52: a deleted draft (not in Drafts, not in Scheduled) is still made again, as in build 50', async () => {
  const s = await setup();
  try { await s.m.draftApproved(); assert.deepEqual(s.tried, ['pipbakes']); } finally { await rm(s.dir, {recursive: true, force: true}); }
});

test('build 52: a Gmail error on either check never makes a copy', async () => {
  const a = await setup({existsErr: new Error('Gmail said 500: x')});
  const b = await setup({schedErr: new Error('network')});
  try { await a.m.draftApproved(); await b.m.draftApproved(); assert.deepEqual(a.tried, []); assert.deepEqual(b.tried, []); }
  finally { await rm(a.dir, {recursive: true, force: true}); await rm(b.dir, {recursive: true, force: true}); }
});

test('build 52: a draft missing again within 2 hours of being made again is held, not made a third time', async () => {
  const s = await setup();
  try {
    await s.m.draftApproved(); assert.deepEqual(s.tried, ['pipbakes']);
    s.tick(10 * 60000); await s.m.draftApproved(); await s.m.draftApproved();
    assert.deepEqual(s.tried, ['pipbakes'], 'held');
    assert.equal(s.lines.filter(l => /not made a third time/.test(l)).length, 1);
    s.tick(3 * 3600000); await s.m.draftApproved();
    assert.deepEqual(s.tried, ['pipbakes', 'pipbakes'], 'after 2 hours a deletion is honoured again');
  } finally { await rm(s.dir, {recursive: true, force: true}); }
});

test('build 52: draftExists is false only on 404; other Gmail errors throw', async () => {
  const g = Object.create(Gmail.prototype);
  g.api = async () => { throw new Error('Gmail said 404: Requested entity was not found.'); };
  assert.equal(await g.draftExists('x'), false);
  g.api = async () => { throw new Error('Gmail said 503: backend'); };
  await assert.rejects(g.draftExists('x'));
  g.api = async (_m, path) => { assert.match(decodeURIComponent(path.replace(/\+/g, " ")), /in:scheduled to:pip@example\.com/); return {messages: [{id: '1'}]}; };
  assert.equal(await g.scheduledTo('pip@example.com'), true);
});
