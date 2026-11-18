import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ChatService, INSTRUCTIONS_MAX} from '../src/chat-service.mjs';

test('Toby build 31: bot instructions up to 32,000 characters, and no more', async t => {
  assert.equal(INSTRUCTIONS_MAX, 32000);
  const dataDir = await mkdtemp(join(tmpdir(), 'toby-limits-'));
  const service = new ChatService({dataDir}); await service.init();
  t.after(async () => { await service.close(); await rm(dataDir, {recursive:true, force:true}); });
  const long = 'x'.repeat(31999) + 'y';
  await service.createBot({name:'Long rules', instructions:long});
  const id = service.snapshot().activeBotId;
  assert.equal(service.snapshot().bots.find(b => b.id === id).instructions, long);
  await service.updateBot({id, instructions: long.slice(1) + 'z'});
  assert.equal(service.snapshot().bots.find(b => b.id === id).instructions.length, 32000);
  await assert.rejects(service.updateBot({id, instructions: long + 'z'}));
  await assert.rejects(service.createBot({name:'Too long', instructions: long + 'z'}));
  const reopened = new ChatService({dataDir}); await reopened.init();
  assert.equal(reopened.snapshot().bots.find(b => b.id === id).instructions.length, 32000);
  await reopened.close();
});

test('Toby build 31: the bot settings box takes 32,000 characters', async () => {
  const html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  assert.match(html, /<textarea id="bot-system" maxlength="32000"/);
});
