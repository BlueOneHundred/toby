import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {WorkspaceFiles} from '../src/workspace-files.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {agentRuntime} from '../src/agent-tools.mjs';
import {softResult} from '../src/soft-results.mjs';

test('Toby build 32: a missing team file is a normal answer, not a red error', async t => {
  const dir=await mkdtemp(join(tmpdir(),'toby-soft-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const activity=[];
  const rt=await agentRuntime({bot:{id:randomUUID(),name:'Creative Studio',capabilities:{web:false,computer:false,connections:false}},conversationId:randomUUID(),
    files:new WorkspaceFiles(join(dir,'data')),teamFolder:new TeamFolder(join(dir,'Income')),cropImage:async()=>({bytes:Buffer.alloc(1),mimeType:'image/png',width:1,height:1}),
    connections:{status:()=>({})},onActivity:a=>activity.push(a),approve:async()=>false,signal:new AbortController().signal});
  for(const [name,input] of [['read_team_file',{path:'creators/photos/erickapajarillo/photos.md'}],['zoom_team_image',{path:'creators/photos/erickapajarillo/photo-1.jpg'}]]){
    const r=await rt.definitions.find(d=>d.name===name).handler(input);
    assert.equal(r.isError,undefined,JSON.stringify(r));
    const v=JSON.parse(r.content[0].text);assert.equal(v.found,false);assert.equal(v.path,input.path);
  }
  assert.ok(activity.filter(a=>a.finishedAt).every(a=>a.status==='complete'),JSON.stringify(activity));
  // A real mistake is still an error.
  const bad=await rt.definitions.find(d=>d.name==='zoom_team_image').handler({path:'notes.txt'});
  assert.equal(bad.isError,true);
  assert.equal(activity.at(-1).status,'error');
});

test('Toby build 32: which outcomes are soft', () => {
  const enoent=Object.assign(new Error("ENOENT: no such file or directory, lstat 'x'"),{code:'ENOENT'});
  assert.ok(softResult('read_team_file',{path:'a.md'},enoent));
  assert.equal(softResult('make_app',{bookDir:'x'},new Error('Not found in the team folder: x')),null);
  assert.ok(softResult('read_webpage',{url:'https://a.com'},Object.assign(new Error('Webpage returned HTTP 404.'),{code:'HTTP_STATUS'})));
  assert.equal(softResult('read_webpage',{url:'https://localhost/'},Object.assign(new Error('Private network destinations are blocked.'),{code:'URL_BLOCKED'})),null);
  assert.equal(softResult('append_team_file',{path:'a'},new Error('The team folder limit is reached')),null);
  assert.ok(softResult('read_team_file',{path:'a.pdf'},new Error('PDF text extraction is unavailable. Attach a text version of this document.')));
});
