import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {ownToolResultPath,readToolResult,PART_CHARS} from '../src/tool-results.mjs';

test('Toby build 34: a bot reads its own saved tool results, and only its own', async t => {
  const home=await mkdtemp(join(tmpdir(),'toby-home-'));t.after(()=>rm(home,{recursive:true,force:true}));
  const conv='c3d89bdf-e4c6-4355-a854-4cca7aed68d9',hash=createHash('sha256').update(conv).digest('hex');
  const project=join(home,'.claude','projects','C--Users-Tavin-AppData-Roaming-Toby-data-claude-workspaces-'+hash);
  const dir=join(project,'session-1','tool-results');await mkdir(dir,{recursive:true});
  const file=join(dir,'toolu_013pk2nuKydB5J9YbDBoCZZt.json');
  await writeFile(file,'a'.repeat(PART_CHARS)+'END');
  assert.equal(ownToolResultPath(file,conv,home),file);
  const p1=await readToolResult(file),p2=await readToolResult(file,2);
  assert.equal(p1.parts,2);assert.equal(p1.text.length,PART_CHARS);assert.match(p1.note,/part 2/);assert.equal(p2.text,'END');
  assert.equal(ownToolResultPath(file,'another-conversation',home),null,'another chat cannot read it');
  assert.equal(ownToolResultPath(join(project,'session-1','secrets.json'),conv,home),null,'only tool-results files');
  assert.equal(ownToolResultPath(join(dir,'..','..','..','..','..','x','tool-results','a.json'),conv,home),null);
  assert.equal(ownToolResultPath('notes.txt',conv,home),null);
});
