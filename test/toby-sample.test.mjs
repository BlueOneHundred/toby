import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {agentRuntime} from '../src/agent-tools.mjs';
import {WorkspaceFiles} from '../src/workspace-files.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {buildApp} from '../src/app-builder.mjs';
const here=(f)=>new URL(f,import.meta.url);
const PART_A=readFileSync(here('./fixtures/sample-part-a.md'),'utf8'),END=readFileSync(here('./fixtures/sample-end.md'),'utf8');
const GENERAL=readFileSync(here('../templates/app/template-general.html'),'utf8');
const TEMPLATE='<html><script>const BOOK="__BOOK_DATA__";</script></html>';
const sampleJson=JSON.stringify({title:'Sourdough at Home',subtitle:'From starter to flavoured loaves',sample:true,requiredTools:[]});
const app=(parts,appJson,template=TEMPLATE)=>buildApp({files:{parts,plan:'',voice:'',appJson},bookDir:'ebooks/sourdough',coverDataUrl:'',template});
const temp=async t=>{const d=await mkdtemp(join(tmpdir(),'toby-sample-'));t.after(()=>rm(d,{recursive:true,force:true}));return d;};

test('a sample app: part A plus an "In the full book" list passes, and lists the chapters to come',()=>{
 const {check,html}=app([PART_A,END],sampleJson);
 assert.deepEqual(check.problems,[]);assert.equal(check.passed,true);assert.equal(check.sample,true);assert.equal(check.coming,5);assert.equal(check.chapters,2);assert.equal(check.sources,2);
 assert.match(html,/"coming":\[\{"num":3,"title":"Your first loaf, hour by hour"\}/);assert.match(html,/"sample":true/);
});
test('a sample must list what is to come, a full book must not, and chapter numbers cannot repeat',()=>{
 assert.ok(app([PART_A,END.replace(/## In the full book[\s\S]*?## Sources/,'## Sources')],sampleJson).check.problems.some(p=>/needs an "## In the full book" section/.test(p)));
 assert.ok(app([PART_A,END],JSON.stringify({title:'X',requiredTools:[]})).check.problems.some(p=>/does not say "sample": true/.test(p)));
 assert.ok(app([PART_A,END.replace('Chapter 3:','Chapter 2:')],sampleJson).check.problems.some(p=>/used twice/.test(p)));
 assert.ok(app([PART_A,END.replace(/## Sources[\s\S]*$/,'')],sampleJson).check.problems.some(p=>/No Sources list found/.test(p)));
});
test('the plan length comes from app.json; the first book keeps its 30 days',()=>{
 const plan=(n)=>`## Chapter 3: Plan\n\n| Day | Focus | Try today |\n|---|---|---|\n${Array.from({length:n},(_,i)=>`| ${i+1} | F${i+1} | T${i+1} |`).join('\n')}\n`;
 const j=(o)=>JSON.stringify({title:'X',requiredTools:[],...o});
 assert.equal(app([PART_A,plan(14),END.replace(/## In the full book[\s\S]*?## Sources/,'## Sources')],j({planDays:14})).check.passed,true);
 assert.ok(app([PART_A,plan(13),END.replace(/## In the full book[\s\S]*?## Sources/,'## Sources')],j({planDays:14})).check.problems.includes('Plan table does not have 14 days'));
 assert.ok(app([PART_A,plan(14),END.replace(/## In the full book[\s\S]*?## Sources/,'## Sources')],j({})).check.problems.includes('Plan table does not have 30 days'));
});
test('the general template has no puppy parts and fills every placeholder',()=>{
 for(const bad of ['S.potty','S.social','pottySheet','your puppy','F30.','call your vet'])assert.ok(!GENERAL.includes(bad),bad);
 const {html,check}=app([PART_A,END],sampleJson,GENERAL);assert.equal(check.passed,true);
 for(const p of ['__BOOK_DATA__','__COVER__','__TITLE__','__SHORT__','/*__FONTS__*/'])assert.ok(!html.includes(p),p);
 assert.match(html,/<title>Sourdough at Home: the companion app<\/title>/);
});
test('check_edition on a sample: only the parts the base book has are checked, and the note says Sample',async t=>{
 const d=await temp(t),book=join(d,'team','ebooks','sourdough'),dir=join(book,'editions','jane');await mkdir(dir,{recursive:true});
 await writeFile(join(book,'part-a.md'),PART_A);await writeFile(join(book,'sources.md'),'S1 | x\nS2 | y\n');
 const voiced=PART_A.replace('This book pulls together what trusted baking sources agree on [S1]. Every source is numbered, so you can check it yourself.','I gathered what the trusted bakers all agree on [S1], and numbered every source so you can look for yourself.')
  .replace('Read one chapter, then bake. Short and simple wins.','One chapter, then into the kitchen with you. Keep it small and simple.')
  .replace('> Try tonight: Feed your starter and mark the jar with a band.','> Try tonight: Feed that starter and pop a band round the jar.')
  .replace('> Try tonight: Fold in a handful of cheese and see how it bakes.','> Try tonight: Throw a handful of cheese in and watch what happens.')
  .replace('Last fold, not first.','Save them for the final fold.').replace('Warm kitchens go faster.','A cosy kitchen speeds it all up.').replace('Write down what you did.','Jot down every step.')
  .replace('Dry mix-ins hold up best.','Dry add-ins behave best.').replace('Keep to about a fifth of the flour.','Stay near a fifth of your flour.')
  .replace('My starter is still learning','My starter is still finding its feet').replace('My starter is broken','My starter is ruined forever');
 await writeFile(join(dir,'part-a.md'),voiced);
 const rt=await agentRuntime({conversationId:randomUUID(),files:new WorkspaceFiles(join(d,'bots')),teamFolder:new TeamFolder(join(d,'team')),onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal,connections:{status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set(),appPublisher:()=>null},bot:{id:randomUUID(),capabilities:{web:false,files:true,computer:false,connections:false}}});
 const call=async(name,input)=>{const r=await rt.definitions.find(x=>x.name===name).handler(input);return r.isError?{error:r.content[0].text}:JSON.parse(r.content[0].text);};
 const r=await call('check_edition',{editionDir:'ebooks/sourdough/editions/jane'});
 assert.equal(r.sample,true);assert.ok(!r.toFix.some(x=>/Not written yet/.test(x)),r.toFix.join(' | '));
 const note=await readFile(join(dir,'edition-check.md'),'utf8');assert.match(note,/Sample: only part-a\.md of the base book exist so far/);
 assert.match((await call('check_edition',{editionDir:'ebooks/empty/editions/jane'})).error,/No base book text found/);
});
