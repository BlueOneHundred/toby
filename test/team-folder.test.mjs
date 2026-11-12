import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,symlink,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {WorkspaceFiles} from '../src/workspace-files.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {agentRuntime} from '../src/agent-tools.mjs';
const temp=async t=>{const d=await mkdtemp(join(tmpdir(),'toby-team-'));t.after(()=>rm(d,{recursive:true,force:true}));return d;};
const runtimeFor=(bot,files,teamFolder)=>agentRuntime({bot,conversationId:randomUUID(),files,teamFolder,connections:{status:()=>({})},onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal});
const call=async(rt,name,input={})=>{const d=rt.definitions.find(d=>d.name===name);assert.ok(d,'missing tool '+name);const r=await d.handler(input);assert.ok(!r.isError,JSON.stringify(r));return r.content[0].text;};
test('two bots share the team folder while private Files stay separate',async t=>{
 const dir=await temp(t),files=new WorkspaceFiles(join(dir,'data')),team=new TeamFolder(join(dir,'Income'));
 const planner={id:randomUUID(),name:'Daily Planner',capabilities:{web:false,computer:false,connections:false}},toby={id:randomUUID(),name:'Toby',capabilities:{web:false,computer:false,connections:false}};
 const a=await runtimeFor(planner,files,team),b=await runtimeFor(toby,files,team);
 assert.equal(a.teamFolder,true);
 await call(a,'write_team_file',{path:'board/today.md',content:'# Plan\n'});
 await call(a,'append_team_file',{path:'board/today.md',content:'- Income window 15:00\n'});
 assert.equal(await call(b,'read_team_file',{path:'board/today.md'}),'# Plan\n- Income window 15:00\n');
 assert.match(await call(b,'list_team_files'),/today\.md/);
 assert.equal(await readFile(join(dir,'Income','board','today.md'),'utf8'),'# Plan\n- Income window 15:00\n');
 await files.write(planner.id,'private.md','mine');
 assert.equal((await files.list(toby.id)).length,0);
 await call(a,'copy_to_team',{path:'private.md',teamPath:'drop/private.md'});
 await call(b,'copy_from_team',{teamPath:'drop/private.md',path:'got.md'});
 assert.equal(await files.read(toby.id,'got.md'),'mine');
});
test('binary files copy unchanged between Files and the team folder',async t=>{
 const dir=await temp(t),files=new WorkspaceFiles(join(dir,'data')),team=new TeamFolder(join(dir,'Income')),bot={id:randomUUID(),name:'Creative Studio',capabilities:{web:false,computer:false,connections:false}};
 const png=Buffer.from([0x89,0x50,0x4e,0x47,0,1,2,255]);await files.target(bot.id);await writeFile(join(files.root(bot.id),'cover.png'),png);
 const rt=await runtimeFor(bot,files,team);await call(rt,'copy_to_team',{path:'cover.png',teamPath:'samples/cover.png'});
 assert.deepEqual(await readFile(join(dir,'Income','samples','cover.png')),png);
});
test('team folder rejects traversal, hidden paths and symlinks, and has no tools without Files',async t=>{
 const dir=await temp(t),files=new WorkspaceFiles(join(dir,'data')),team=new TeamFolder(join(dir,'Income'));
 for(const path of ['../outside.md','/etc/passwd','.hidden/x','ok/../../out'])await assert.rejects(team.write(null,path,'bad'));
 await team.write(null,'ok.md','fine');await symlink(tmpdir(),join(dir,'Income','escape'));await assert.rejects(team.write(null,'escape/out','bad'),/symlink/);
 await assert.rejects(team.append('big.md','x'.repeat(200001)),/200 KB/);
 const rt=await runtimeFor({id:randomUUID(),name:'No files',capabilities:{web:false,files:false,computer:false,connections:false}},files,team);
 assert.equal(rt.definitions.some(d=>d.name.includes('team')),false);assert.equal(rt.teamFolder,false);
 const none=await runtimeFor({id:randomUUID(),name:'No folder',capabilities:{web:false,computer:false,connections:false}},files,undefined);
 assert.equal(none.definitions.some(d=>d.name.includes('team')),false);
});
test('appends from many bots at once are all kept',async t=>{
 const dir=await temp(t),team=new TeamFolder(join(dir,'Income'));
 await Promise.all(Array.from({length:20},(_,i)=>team.append('log.md',`line ${i}\n`)));
 const lines=(await team.read(null,'log.md')).trim().split('\n');assert.equal(lines.length,20);
});
test('every turn tells the bot the real local time',async()=>{
 const {localTimeLine}=await import('../src/claude-backend.mjs');
 assert.equal(localTimeLine(new Date('2026-11-12T04:35:00Z'),'Asia/Bangkok'),'Current local time when this turn started: Thu 12 Nov 2026, 11:35 (Asia/Bangkok).');
});
