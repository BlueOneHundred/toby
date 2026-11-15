import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {agentRuntime} from '../src/agent-tools.mjs';
import {WorkspaceFiles} from '../src/workspace-files.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {Connections} from '../src/connections.mjs';
import {buildApp,appSlug} from '../src/app-builder.mjs';
import {publishApp,randomEnding} from '../src/app-publisher.mjs';
import {TEAM_ORDER} from '../src/sidebar-items.mjs';
const temp=async t=>{const d=await mkdtemp(join(tmpdir(),'toby-app-'));t.after(()=>rm(d,{recursive:true,force:true}));return d;};
const TEMPLATE='<!doctype html><html><head><title>__TITLE__</title><meta content="__SHORT__"><style>/*__FONTS__*/</style></head><body><img src="__COVER__"><script>const BOOK="__BOOK_DATA__";</script>'+'<!-- pad -->'.repeat(100)+'</body></html>';
const plan=Array.from({length:30},(_,i)=>`| ${i+1} | Focus ${i+1} | Try thing ${i+1} |`).join('\n');
const PART_A=`## A note from Sam\n\nHello there.\n\n## Chapter 1: Calm starts\n\n> The short version: Short and happy wins [S1].\n\n### The plan\n\n| Day | Focus | Try today |\n|---|---|---|\n${plan}\n\n> From Sam's kitchen: We did this every morning.\n\n[Creator: add your own story about the first night]\n\n> Try tonight: One calm minute.\n`;
const PART_B=`## Chapter 2: Sleep\n\nText with a source [S2].\n\n> Facts:\n> - 8 in 10 | sleep more [S1]\n> - Naps matter [S2]\n\n## Sources\n\nS1. Guide one. Org One. 2024. https://example.org/one\nS2. Guide two. Org Two. 2025. https://example.org/two\n`;
const files=(extra={})=>({parts:[PART_A,PART_B],plan:'- Title: Puppy Month One\n- Subtitle: A calm start\n',voice:'"by Sam Rivers" (@samrivers)\n',appJson:JSON.stringify({requiredTools:[]}),...extra});

test('an edition becomes an app with its own saved-progress key, creator name and check',()=>{
 const {html,check}=buildApp({files:files(),bookDir:'ebooks/puppy/editions/samrivers',coverDataUrl:'data:image/jpeg;base64,AAAA',template:TEMPLATE});
 assert.equal(check.passed,true);assert.deepEqual(check.problems,[]);assert.equal(check.chapters,2);assert.equal(check.planDays,30);assert.equal(check.sources,2);
 assert.equal(check.creatorGaps,1);assert.equal(check.fromBoxes,1);assert.equal(check.author,'Sam Rivers');
 assert.match(html,/<title>Puppy Month One: the companion app<\/title>/);assert.match(html,/"slug":"puppy-samrivers"/);assert.match(html,/font-family:'Outfit'/);
 assert.ok(!html.includes('__BOOK_DATA__')&&!html.includes('__COVER__')&&!html.includes('requiredTools'));
 assert.equal(appSlug('ebooks\\puppy'),'puppy');
});
test('the app check names what is wrong in plain words',()=>{
 const bad=buildApp({files:files({parts:[PART_A.replace(/\| 30 \|.*\n/,''),PART_B.replace('[S2].','[S9].')],appJson:''}),bookDir:'ebooks/puppy',coverDataUrl:'',template:TEMPLATE}).check;
 assert.equal(bad.passed,false);assert.ok(bad.problems.includes('Plan table does not have 30 days'));assert.ok(bad.problems.some(p=>/Cited but not in Sources: 9/.test(p)));assert.ok(bad.problems.some(p=>/Fill-in table not found: potty/.test(p)));
 assert.throws(()=>buildApp({files:files(),bookDir:'x',coverDataUrl:'',template:'<html></html>'}),/__BOOK_DATA__/);
});
const github=(log,{live=true,exists=false,deny=false}={})=>async(url,options={})=>{log.push([options.method||'GET',url,options]);
 if(url.startsWith('https://api.github.com/')){if(deny)return new Response(JSON.stringify({message:'Bad credentials'}),{status:401});
  if(options.method==='PUT')return new Response('{}',{status:exists?200:201});return exists?new Response(JSON.stringify({sha:'abc'}),{status:200}):new Response('{}',{status:404});}
 const put=log.find(c=>c[0]==='PUT');return live&&put?new Response(Buffer.from(JSON.parse(put[2].body).content,'base64'),{status:200}):new Response('nope',{status:404});};
const publisher={owner:'o',repo:'r',token:'t0ken',site:'https://apps.example'};
test('publishing uploads to a folder with a random ending and waits until the page is live',async()=>{
 const log=[],html=Buffer.from('x'.repeat(5000));
 const out=await publishApp({publisher,html,name:'puppy-sam',fetchImpl:github(log),wait:async()=>{}});
 assert.match(out.folder,/^puppy-sam-[a-z0-9]{8}$/);assert.equal(out.url,`https://apps.example/${out.folder}/`);assert.equal(out.live,true);assert.equal(out.updated,false);
 const put=log.find(c=>c[0]==='PUT');assert.equal(put[1],`https://api.github.com/repos/o/r/contents/${out.folder}/index.html`);assert.equal(put[2].headers.Authorization,'Bearer t0ken');assert.equal(JSON.parse(put[2].body).sha,undefined);
 const log2=[];const again=await publishApp({publisher,html,name:'puppy-sam',previousFolder:out.folder,fetchImpl:github(log2,{exists:true,live:false}),wait:async()=>{},checks:2});
 assert.equal(again.folder,out.folder);assert.equal(again.updated,true);assert.equal(again.live,false);assert.equal(JSON.parse(log2.find(c=>c[0]==='PUT')[2].body).sha,'abc');
 await assert.rejects(publishApp({publisher,html,name:'puppy-sam',fetchImpl:github([],{deny:true}),wait:async()=>{}}),/refused the app publisher token/);
 await assert.rejects(publishApp({publisher:null,html,name:'puppy-sam'}),/not set up/);
 assert.notEqual(randomEnding(),randomEnding());
});
test('the app_publisher connection is a publishing key, never a tool server for bots',async t=>{
 const d=await temp(t),c=await new Connections({directory:d,encrypt:async v=>Buffer.from(v),decrypt:async v=>v.toString()}).init();
 assert.equal(c.appPublisher(),null);
 await c.configure({customAdd:{name:'treg',url:'https://treg.to/mcp/',token:'a',askFirst:false}});
 await c.configure({customAdd:{name:'app_publisher',url:'https://github.com/BlueOneHundred/blueprints-apps',token:'ghp_x',askFirst:true}});
 assert.deepEqual(Object.keys(c.customMcp()),['treg']);assert.equal(c.customAskFirst().has('app_publisher'),false);
 assert.deepEqual(c.appPublisher(),{owner:'BlueOneHundred',repo:'blueprints-apps',token:'ghp_x',site:'https://app.blueonehundred.com'});
 assert.ok(!JSON.stringify(c.status()).includes('ghp_x'));
});
test('make_app and publish_app: build, check note, refuse a failed app, then publish and save the link',async t=>{
 const d=await temp(t),bots=new WorkspaceFiles(join(d,'bots')),team=new TeamFolder(join(d,'team')),dir=join(d,'team','ebooks','puppy','editions','sam');
 await mkdir(dir,{recursive:true});await mkdir(join(d,'team','templates','app'),{recursive:true});
 await writeFile(join(d,'team','templates','app','template.html'),TEMPLATE);await writeFile(join(d,'team','ebooks','puppy','cover.png'),Buffer.from('89504e470d0a1a0a','hex'));
 await writeFile(join(dir,'edition-check.md'),'- Result: PASSED\n');
 const f=files();await writeFile(join(dir,'part-a.md'),PART_A.replace(/\| 30 \|.*\n/,''));await writeFile(join(dir,'part-b.md'),PART_B);await writeFile(join(dir,'part-c.md'),'');await writeFile(join(dir,'plan.md'),f.plan);await writeFile(join(dir,'voice.md'),f.voice);await writeFile(join(dir,'app.json'),f.appJson);
 const log=[];const base={conversationId:randomUUID(),files:bots,teamFolder:team,onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal,fetchImpl:github(log),wait:async()=>{}};
 const run=(connections,caps={})=>agentRuntime({...base,connections,bot:{id:randomUUID(),capabilities:{web:false,files:true,computer:false,connections:true,...caps}}});
 const none={status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set(),appPublisher:()=>null},ready={...none,appPublisher:()=>publisher};
 const names=async r=>(await r).definitions.map(x=>x.name);
 assert.ok((await names(run(none))).includes('make_app'));assert.ok(!(await names(run(none))).includes('publish_app'));
 assert.ok(!(await names(run(ready,{connections:false}))).includes('publish_app'));
 const rt=await run(ready),call=async(name,input)=>{const r=await rt.definitions.find(x=>x.name===name).handler(input);return r.isError?{error:r.content[0].text}:JSON.parse(r.content[0].text);};
 const args={bookDir:'ebooks/puppy/editions/sam',coverImage:'ebooks/puppy/cover.png',template:'templates/app/template.html'};
 const first=await call('make_app',args);assert.equal(first.passed,false);assert.match(await readFile(join(dir,'app','app-check.md'),'utf8'),/Result: NEEDS FIXES \(1\)/);
 assert.match((await call('publish_app',{appDir:'ebooks/puppy/editions/sam/app',name:'puppy-sam'})).error,/does not say "Result: PASSED"/);assert.equal(log.length,0);
 await writeFile(join(dir,'part-a.md'),PART_A);
 const second=await call('make_app',args);assert.equal(second.passed,true);assert.equal(second.check.author,'Sam Rivers');assert.equal(second.toFix.length,1);assert.match(await readFile(join(dir,'app','app-check.md'),'utf8'),/^- Result: PASSED$/m);
 const pub=await call('publish_app',{appDir:'ebooks/puppy/editions/sam/app',name:'puppy-sam'});assert.equal(pub.live,true);assert.match(pub.url,/^https:\/\/apps\.example\/puppy-sam-[a-z0-9]{8}\/$/);
 const note=await readFile(join(dir,'app','app-link.md'),'utf8');assert.ok(note.includes('- Link: '+pub.url));assert.ok(!note.includes('t0ken'));
 const again=await call('publish_app',{appDir:'ebooks/puppy/editions/sam/app',name:'other-name'});assert.equal(again.folder,pub.folder);
 assert.match((await call('make_app',{...args,bookDir:'ebooks/nope'})).error,/Not found in the team folder/);
});
test('the new team members have a place in the sidebar order',()=>{for(const n of ['Edition Writer','App Builder','Store Manager','Marketing Kit'])assert.ok(TEAM_ORDER.includes(n));assert.ok(TEAM_ORDER.indexOf('App Builder')<TEAM_ORDER.indexOf('Outreach Writer'));});
test('a save that Windows briefly refuses is tried again instead of being lost',async()=>{
 const {steadyRename}=await import('../src/storage-safety.mjs');let calls=0;const waits=[];
 const busy=async()=>{if(++calls<4)throw Object.assign(new Error('EPERM: operation not permitted, rename'),{code:'EPERM'});return 'moved';};
 assert.equal(await steadyRename('a','b',{move:busy,wait:async ms=>{waits.push(ms);}}),'moved');assert.equal(calls,4);assert.deepEqual(waits,[50,100,200]);
 await assert.rejects(steadyRename('a','b',{tries:3,move:async()=>{throw Object.assign(new Error('still busy'),{code:'EBUSY'});},wait:async()=>{}}),/still busy/);
 let once=0;await assert.rejects(steadyRename('a','b',{move:async()=>{once++;throw Object.assign(new Error('gone'),{code:'ENOENT'});},wait:async()=>{}}),/gone/);assert.equal(once,1);
});

import {checkEdition,sameness} from '../src/edition-check.mjs';
const BASE=`## A note before you start\n\nWe read the guides so you do not have to.\n\n## Chapter 1: Calm starts\n\n> The short version: Short and happy sessions win every time [S1].\n\nPuppies learn fastest when lessons are short and end on a good moment, says the guide [S1].\n\nIn one study 46.9% of 145 puppies found being alone hard [S2].\n\nKeep the first week quiet and let the puppy sleep as much as it wants to.\n\nMost puppies need 18 to 20 hours of sleep a day [S1].\n\n| Say this | Not that |\n|---|---|\n| Good try | Bad dog |\n\n> Try tonight: Sit near the crate for 5 minutes and read a book.\n\n> Remember: Slow is fast.\n\n> Facts:\n>\n> - 18 to 20 hours | of sleep a day [S1]\n> - Short sessions work best [S1]\n\n## Sources\n\nS1. Guide one. Org One. 2024. https://example.org/one\nS2. Study two. Org Two. 2025. https://example.org/two\n`;
const VOICED=BASE.replace('## A note before you start','## A note from Sam').replace('We read the guides so you do not have to.','Hello lovely, we went through every guide for you.')
 .replace('Short and happy sessions win every time [S1].','Little and cheerful is the way, every single day [S1].')
 .replace('Puppies learn fastest when lessons are short and end on a good moment, says the guide [S1].','Our squidgy babies pick things up quickest in tiny bursts that finish while everyone is smiling [S1].')
 .replace('In one study 46.9% of 145 puppies found being alone hard [S2].','You are not the only one: 46.9% of the 145 pups in one piece of research struggled when left [S2].')
 .replace('Keep the first week quiet and let the puppy sleep as much as it wants to.','Go gently for those first seven days, and let your little chunk snooze whenever the mood takes them.')
 .replace('Most puppies need 18 to 20 hours of sleep a day [S1].','Did you know they want 18 to 20 hours of shut-eye? We did not either [S1].')
 .replace('Sit near the crate for 5 minutes and read a book.','Pop yourself by the crate with a cuppa for 5 minutes.').replace('Slow is fast.','Gentle wins, promise.');
test('an edition that is the base book with a new note fails the voice check; a real rewrite passes',()=>{
 const copy=checkEdition({base:{parts:[BASE]},edition:{parts:[BASE.replace('## A note before you start','## A note from Sam')]}});
 assert.equal(copy.passed,false);assert.equal(copy.report.textShare,0);assert.match(copy.toFix[0],/still the base book/);
 const good=checkEdition({base:{parts:[BASE]},edition:{parts:[VOICED]}});
 assert.deepEqual(good.toFix,[]);assert.equal(good.passed,true);assert.equal(good.report.textShare,100);assert.equal(good.report.boxShare,100);
 assert.ok(sameness('Keep the first week quiet.','Keep the first week very quiet.')>0.8);assert.ok(sameness('Keep the first week quiet.','Go gently for seven days.')<0.5);
});
test('the edition check catches a lost source tag, a changed or new number, a dropped box, a changed table and dashes',()=>{
 const broke=VOICED.replace('46.9% of the 145 pups','about half of the 150 pups').replace(' We did not either [S1].',' We did not either.').replace('> Remember: Gentle wins, promise.\n\n','').replace('| Good try | Bad dog |\n','').replace('Hello lovely,','Hello lovely —');
 const r=checkEdition({base:{parts:[BASE]},edition:{parts:[broke]}}),all=r.toFix.join(' | ');
 assert.equal(r.passed,false);assert.match(all,/source tags lost: S1 \(1\)/);assert.match(all,/missing or changed: .*46\.9%/);assert.match(all,/not in the base book or sources\.md: 150/);assert.match(all,/boxes missing: remember/);assert.match(all,/table 1 has 0 rows/);assert.match(all,/em or en dashes/);
 const gaps=VOICED.replace('> Remember:','> From Sam’s kitchen: [Creator: add a line]\n\n> Remember:');assert.match(checkEdition({base:{parts:[BASE]},edition:{parts:[gaps]}}).toFix.join(' '),/nothing but a gap/);
});
test('check_edition writes the note, and make_app refuses an edition that has not passed it',async t=>{
 const d=await temp(t),bots=new WorkspaceFiles(join(d,'bots')),team=new TeamFolder(join(d,'team')),book=join(d,'team','ebooks','puppy'),dir=join(book,'editions','sam');await mkdir(dir,{recursive:true});
 for(const n of ['part-a.md','part-b.md','part-c.md']){await writeFile(join(book,n),n==='part-a.md'?BASE:'');await writeFile(join(dir,n),n==='part-a.md'?BASE:'');}
 const rt=await agentRuntime({conversationId:randomUUID(),files:bots,teamFolder:team,onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal,connections:{status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set(),appPublisher:()=>null},bot:{id:randomUUID(),capabilities:{web:false,files:true,computer:false,connections:false}}});
 const call=async(name,input)=>{const r=await rt.definitions.find(x=>x.name===name).handler(input);return r.isError?{error:r.content[0].text}:JSON.parse(r.content[0].text);};
 const first=await call('check_edition',{editionDir:'ebooks/puppy/editions/sam'});assert.equal(first.passed,false);assert.match(await readFile(join(dir,'edition-check.md'),'utf8'),/Result: NEEDS FIXES/);
 assert.match((await call('make_app',{bookDir:'ebooks/puppy/editions/sam',coverImage:'ebooks/puppy/cover.png'})).error,/must pass check_edition first/);
 await writeFile(join(dir,'part-a.md'),VOICED);const second=await call('check_edition',{editionDir:'ebooks/puppy/editions/sam'});assert.equal(second.passed,true);assert.match(await readFile(join(dir,'edition-check.md'),'utf8'),/^- Result: PASSED$/m);
 assert.match((await call('check_edition',{editionDir:'ebooks/puppy'})).error,/must look like/);
});
test('make_pdf reports the page count, and a PDF can be checked without text extraction',async()=>{
 const {pdfPageCount}=await import('../src/pdf-pages.mjs');
 const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Count 3 /Kids [3 0 R 4 0 R 5 0 R]>>\nendobj\n3 0 obj\n<</Type /Page>>\nendobj\n4 0 obj\n<</Type /Page>>\nendobj\n5 0 obj\n<</Type /Page>>\nendobj\n','latin1');
 assert.equal(pdfPageCount(pdf),3);assert.equal(pdfPageCount(Buffer.from('%PDF-1.4\n3 0 obj\n<</Type /Page>>\nendobj\n')),1);assert.equal(pdfPageCount(Buffer.from('not a pdf')),0);
});
