import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRunBudget,validateRunLimits,DEFAULT_RUN_LIMITS} from '../src/run-limits.mjs';
import {agentRuntime} from '../src/agent-tools.mjs';
import {WorkspaceFiles} from '../src/workspace-files.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {claudeEnvironment} from '../src/claude-backend.mjs';
const temp=async t=>{const d=await mkdtemp(join(tmpdir(),'toby-b6-'));t.after(()=>rm(d,{recursive:true,force:true}));return d;};

test('tool failures count only in a row, so a few dead links never stop a research run',()=>{
 const c=new AbortController(),b=createRunBudget(c,{...DEFAULT_RUN_LIMITS,toolFailures:3},{durationMs:60000});
 let n=0;const fail=()=>{const id='f'+n++;b.activity({id,status:'running'});b.activity({id,status:'error'});};const ok=()=>{const id='o'+n++;b.activity({id,status:'running'});b.activity({id,status:'complete'});};
 fail();fail();ok();fail();fail();ok();assert.equal(c.signal.aborted,false);
 fail();fail();fail();assert.equal(c.signal.aborted,true);assert.match(String(c.signal.reason.message),/in a row/);b.close();
});
test('old Gratis run limits are upgraded, chosen numbers are kept',()=>{
 assert.deepEqual(validateRunLimits({minutes:10,toolCalls:100,toolFailures:5,outputCharacters:1000000,t3Retries:8,t3MonitorHours:24}),{...DEFAULT_RUN_LIMITS});
 assert.equal(validateRunLimits({minutes:45,toolCalls:100,toolFailures:5}).minutes,45);
 assert.equal(DEFAULT_RUN_LIMITS.minutes,30);
});
test('bots can read large paid-data results',()=>{assert.equal(claudeEnvironment({PATH:'/bin'}).MAX_MCP_OUTPUT_TOKENS,'60000');});
test('make_pdf is offered only with Files and the team folder, and writes into the team folder',async t=>{
 const d=await temp(t),files=new WorkspaceFiles(join(d,'bots')),team=new TeamFolder(join(d,'team'));await mkdir(join(d,'team','ebooks','a'),{recursive:true});
 await writeFile(join(d,'team','ebooks','a','book.html'),'<!doctype html><h1>Hi</h1>');
 let asked;const makePdf=async input=>{asked=input;return Buffer.from('%PDF-1.7 test');};
 const base={conversationId:randomUUID(),files,teamFolder:team,makePdf,connections:{status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set()},onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal};
 const on=await agentRuntime({...base,bot:{id:randomUUID(),name:'Ebook Builder',capabilities:{web:false,files:true,computer:false,connections:false}}});
 const tool=on.definitions.find(x=>x.name==='make_pdf');assert.ok(tool);
 const result=await tool.handler({htmlPath:'ebooks/a/book.html',pdfPath:'ebooks/a/book.pdf',pageSize:'Letter'});assert.equal(result.isError,undefined);
 assert.equal(asked.pageSize,'Letter');assert.match(asked.file,/book\.html$/);
 assert.equal((await readFile(join(d,'team','ebooks','a','book.pdf'))).toString(),'%PDF-1.7 test');
 const bad=await tool.handler({htmlPath:'../x.html',pdfPath:'x.pdf',pageSize:'Letter'});assert.equal(bad.isError,true);
 const off=await agentRuntime({...base,bot:{id:randomUUID(),name:'Income Coach',capabilities:{web:false,files:false,computer:false,connections:false}}});
 assert.equal(off.definitions.some(x=>x.name==='make_pdf'),false);
});
test('a page that refuses the reader comes back as a result, not a tool failure',async t=>{
 const d=await temp(t),files=new WorkspaceFiles(d),events=[];
 const rt=await agentRuntime({conversationId:randomUUID(),files,connections:{status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set()},onActivity:a=>events.push(a),approve:async()=>false,signal:new AbortController().signal,bot:{id:randomUUID(),name:'Creator Partnerships',capabilities:{web:true,files:false,computer:false,connections:false}}});
 const read=rt.definitions.find(x=>x.name==='read_webpage');
 const result=await read.handler({url:'https://does-not-exist.invalid-tld-toby-test/'});
 assert.equal(result.isError,undefined);assert.match(result.content[0].text,/"opened":false/);
 assert.equal(events.some(e=>e.status==='error'),false);
 const blocked=await read.handler({url:'https://localhost/'});assert.equal(blocked.isError,true);
});
test('make_book assembles Markdown parts into a designed book and PDF',async t=>{
 const {bookHTML}=await import('../src/book-builder.mjs');
 const html=bookHTML({title:'Calm Walks',subtitle:'A <test>',tagline:'Short walks',badge:'Built from 3 sources',parts:['## Contents\n\n1. Chapter 1\n\n## Chapter 1: Start Here\n\n> The short version: walk slowly [S3].\n\n### Why\n\nText [S1, S2].\n\n> Try tonight: one lap.\n\n> Stat: 47% | of puppies [S1]\n\n> Steps:\n> 1. One\n> 2. Two\n\n> Checklist: Before you go\n>\n> - Lead\n> - Bags\n\n> Before: chaos\n\n> After: calm\n\n> Timeline:\n> - Day 1: settle\n> - Day 2: crate\n\n> From Sam\'s kitchen: hi\n\nHere is the list:\n\n- a\n- b\n\n| A | B |\n|---|---|\n| 1 | 2 |\n','## Sources\n\nS1. Example. https://example.org\nS2. Second.'],accent:'#123456'});
 for(const c of ['opener-short','box box-try','class="stat"','class="steps"','class="checklist"','class="ba"','class="timeline"','box box-from','class="keep"','class="page-opener"','cover-badge','class="source"','@font-face'])assert.ok(html.includes(c),c);
 assert.match(html,/A &lt;test&gt;/);assert.match(html,/<span class="cite">\[S1, S2\]<\/span>/);assert.doesNotMatch(html,/<script/);
 assert.equal((html.match(/<p class="source">/g)||[]).length,2);
 assert.doesNotMatch(html.split('<main>')[1],/Contents/,'hand-written contents is dropped');
 assert.match(html,/size:7in 10in/,'book trim by default');for(const t of ['warm','modern','classic'])assert.doesNotMatch(bookHTML({title:'x',parts:['## Chapter 1: A\n\nb'],theme:t}),/rgba\(|opacity:/,'no transparency in '+t);
 const d=await temp(t),files=new WorkspaceFiles(join(d,'bots')),team=new TeamFolder(join(d,'team'));await mkdir(join(d,'team','ebooks','b','images'),{recursive:true});
 await writeFile(join(d,'team','ebooks','b','part-a.md'),'## Chapter 1: Hi\n\nHello world.');
 await writeFile(join(d,'team','ebooks','b','images','ch01.png'),Buffer.from([137,80,78,71]));
 const rt=await agentRuntime({conversationId:randomUUID(),files,teamFolder:team,makePdf:async()=>Buffer.from('%PDF'),connections:{status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set()},onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal,bot:{id:randomUUID(),name:'Ebook Builder',capabilities:{web:false,files:true,computer:false,connections:false}}});
 const r=await rt.definitions.find(x=>x.name==='make_book').handler({parts:['ebooks/b/part-a.md'],title:'Hi',chapterImagesDir:'ebooks/b/images',htmlPath:'ebooks/b/book.html',pdfPath:'ebooks/b/book.pdf',pageSize:'Letter'});
 assert.equal(r.isError,undefined,JSON.stringify(r));assert.match(r.content[0].text,/"chapterImages":\[1\]/);
 const out=(await readFile(join(d,'team','ebooks','b','book.html'))).toString();assert.match(out,/Hello world/);assert.match(out,/opener-art/);assert.match(out,/data:image\/png;base64/);
 assert.ok(rt.definitions.some(x=>x.name==='save_image_to_team'));
});
