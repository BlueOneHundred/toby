import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pictureRefs,picturePath,imageSize,cleanSvg,pictureEntry,pictureOf} from '../src/book-pictures.mjs';
import {buildBook,bookToFix} from '../src/book-builder.mjs';
import {buildApp} from '../src/app-builder.mjs';

// A PNG header is enough for the size reader and the book (the browser never sees these bytes in tests).
const png=(w,h)=>{const b=Buffer.alloc(33);b.writeUInt32BE(0x89504e47,0);b.writeUInt32BE(0x0d0a1a0a,4);b.writeUInt32BE(13,8);b.write('IHDR',12,'ascii');b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;};
const jpeg=(w,h)=>Buffer.from([0xff,0xd8,0xff,0xe0,0,16,0x4a,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0,0xff,0xc0,0,17,8,h>>8,h&255,w>>8,w&255,3,1,0x22,0,2,0x11,1,3,0x11,1,0xff,0xd9]);
const SVG='<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300" onload="alert(1)"><script>alert(2)</script><a href="https://evil.example"><rect width="10" height="10" fill="var(--pine)"/></a><text x="10" y="40" font-family="var(--display)">Mix</text></svg>';

test('picture lines, paths and sizes are read the same way everywhere',()=>{
 assert.deepEqual(pictureOf('![A bubbly starter](images/ch2.jpg "Ready to use [S4]")'),{alt:'A bubbly starter',href:'images/ch2.jpg',caption:'Ready to use [S4]'});
 assert.equal(pictureOf('Some text ![x](a.png)'),null);
 assert.deepEqual(pictureRefs(['![a](images/a.png)\n\n![b](images/b.svg "B")','![a](images/a.png)']),['images/a.png','images/b.svg']);
 assert.equal(picturePath('images/a.png','ebooks/sourdough'),'ebooks/sourdough/images/a.png');
 assert.equal(picturePath('ebooks/shared/a.png','ebooks/sourdough'),'ebooks/shared/a.png');
 assert.deepEqual(imageSize(png(1600,1000)),{w:1600,h:1000});
 assert.deepEqual(imageSize(jpeg(1800,1200)),{w:1800,h:1200});
 assert.deepEqual(imageSize(Buffer.from(SVG)),{w:600,h:300});
});

test('an SVG diagram is made safe and sizes to its box',()=>{
 const svg=cleanSvg(SVG);
 assert.ok(!/script|onload|evil\.example|<\?xml/.test(svg),svg);
 assert.match(svg,/^<svg[^>]*viewBox="0 0 600 300"/);assert.ok(!/^<svg[^>]*\swidth=/.test(svg));
 assert.match(svg,/var\(--pine\)/);
 assert.throws(()=>cleanSvg('<html></html>'),/not an SVG/);
 assert.throws(()=>pictureEntry(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),'x.svg'),/viewBox/);
 assert.throws(()=>pictureEntry(Buffer.from('GIF89a'),'x.gif'),/PNG, JPEG, WebP or SVG/);
 const shrunk=pictureEntry(jpeg(1800,1200),'x.jpg',png(3000,2000));
 assert.equal(shrunk.px,3000);assert.match(pictureEntry(jpeg(1800,1200),'saved-as.png').src,/^data:image\/jpeg/);assert.equal(shrunk.w,1800);assert.match(shrunk.src,/^data:image\/jpeg;base64,/);
});

const chapter=(n,lead='',inner='')=>`## Chapter ${n}: Bread ${n}\n\n${lead}> The short version: Short text [S1].\n\n### First part\n\nSome text [S1].\n\n${inner}### Second part\n\nMore text.\n\n> Remember:\n> - One thing [S1]\n\n> Facts:\n> - 1 | one [S1]\n> - 2 | two [S1]\n> - 3 | three [S1]\n> - 4 | four [S1]\n> - 5 | five [S1]\n`;
const SOURCES='\n## Sources\n\nS1. A guide. An org. 2024. https://example.org\n';

test('pictures go in the text with their caption, and a lead picture fills the opening page',()=>{
 const pictures={'images/open.jpg':pictureEntry(png(2000,1200),'open.png'),'images/steps.svg':pictureEntry(Buffer.from(SVG),'steps.svg')};
 const parts=[chapter(1,'![A starter in a jar](images/open.jpg)\n\n','### Shaping\n\n![Shaping in four steps](images/steps.svg "Fold, turn, drag, rest [S1].")\n\n'),SOURCES];
 const {html,report}=buildBook({title:'Bread',parts,pictures});
 assert.match(html,/<section class="opener has-pic" id="ch-1"><div class="opener-pic"><img src="data:image\/png;base64,[^"]+" alt="A starter in a jar">/);
 // the heading is kept whole with the picture under it, the caption carries its source link, the diagram is inline
 assert.match(html,/<div class="keep"><h3>Shaping<\/h3><figure class="fig fig-svg"><div class="fig-art" style="width:145\.8mm;height:72\.9mm"><svg/);
 assert.match(html,/<figcaption>Fold, turn, drag, rest\.<sup class="cite"><a href="#src-1">1<\/a><\/sup><\/figcaption>/);
 assert.ok(!report.notes.some(n=>/short version/.test(n)),report.notes.join('; '));
 // a figure spans the full text width like a box does, or Chrome shrinks every page to fit it
 assert.match(html,/\.fig\{margin:[^}]*calc\(-1 \* var\(--gutter\)\)/);
 assert.equal(report.pictures.placed,2);assert.deepEqual(bookToFix(report,false),[]);
});

test('the book check names a missing, blurry or undescribed picture',()=>{
 const pictures={'images/small.png':pictureEntry(png(700,500),'small.png'),'images/tall.png':pictureEntry(png(1000,3000),'tall.png')};
 const parts=[chapter(1,'','![](images/small.png)\n\n![Gone](images/gone.png)\n\n![A tall one](images/tall.png)\n\n'),SOURCES];
 const {html,report}=buildBook({title:'Bread',parts,pictures});
 assert.match(html,/Picture not found: images\/gone\.png/);
 // a tall picture is narrowed to at most about half a page
 assert.match(html,/style="width:39\.3mm;height:118\.0mm"/);
 const fix=bookToFix(report,false).join('\n');
 assert.match(fix,/Chapter 1: the picture images\/gone\.png is not in the team folder/);
 assert.match(fix,/images\/small\.png is 700 pixels wide and will print blurry at this size\. Ask Creative Studio for one at least 1033 pixels wide/);
 assert.match(fix,/images\/small\.png has no description/);
 assert.ok(!/tall\.png is/.test(fix),'a narrowed tall picture needs fewer pixels: '+fix);
});

test('the app shows the same pictures, with the lead picture on the chapter opener',()=>{
 const template=readFileSync(new URL('../templates/app/template-general.html',import.meta.url),'utf8');
 const pictures={'images/open.jpg':pictureEntry(png(2000,1200),'open.png'),'images/steps.svg':pictureEntry(Buffer.from(SVG),'steps.svg')};
 const plan='### The 14 days\n\n| Day | Focus | Try today |\n|---|---|---|\n'+Array.from({length:14},(_,i)=>`| ${i+1} | F | T |`).join('\n')+'\n\n';
 const parts=[chapter(1,'![A starter in a jar](images/open.jpg)\n\n','![Shaping in four steps](images/steps.svg "Fold and turn")\n\n![Lost](images/lost.png)\n\n'+plan),SOURCES];
 const files={parts,plan:'- Title: Bread\n',voice:'',appJson:JSON.stringify({requiredTools:[],planDays:14})};
 const {html,check}=buildApp({files,bookDir:'ebooks/bread',coverDataUrl:'',template,pictures});
 const data=JSON.parse(html.match(/const BOOK = (\{.*?\});\n/s)?.[1]||html.match(/BOOK\s*=\s*(\{.*\})\s*;/)[1]);
 const ch=data.chapters[0];
 assert.equal(ch.pic.alt,'A starter in a jar');assert.match(ch.pic.src,/^data:image\/png/);
 const fig=ch.blocks.find(b=>b.t==='fig'&&!b.missing);assert.match(fig.svg,/^<svg/);assert.equal(fig.caption,'Fold and turn');
 assert.equal(check.pictures,2);assert.deepEqual(check.missingPictures,['Chapter 1: images/lost.png']);
 assert.ok(check.problems.some(p=>/Picture not found in the team folder: Chapter 1: images\/lost\.png/.test(p)));
 const old=buildApp({files:{...files,parts:[chapter(1,'![A starter](images/open.jpg)\n\n',plan),SOURCES]},bookDir:'ebooks/bread',coverDataUrl:'',template:'<script>const B="__BOOK_DATA__";</script>',pictures}).check;
 assert.ok(old.problems.some(p=>/cannot show them/.test(p)));
});

test('make_book and make_app read pictures from the book\'s own folder in the team folder',async t=>{
 const {mkdtemp,rm,readFile,writeFile,mkdir}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {randomUUID}=await import('node:crypto');
 const {agentRuntime}=await import('../src/agent-tools.mjs');const {WorkspaceFiles}=await import('../src/workspace-files.mjs');const {TeamFolder}=await import('../src/team-folder.mjs');
 const d=await mkdtemp(join(tmpdir(),'toby-pics-'));t.after(()=>rm(d,{recursive:true,force:true}));
 const dir=join(d,'team','ebooks','bread');await mkdir(join(dir,'images'),{recursive:true});await mkdir(join(d,'team','templates','app'),{recursive:true});
 await writeFile(join(d,'team','templates','app','template-general.html'),readFileSync(new URL('../templates/app/template-general.html',import.meta.url)));
 await writeFile(join(dir,'images','open.png'),png(2000,1200));await writeFile(join(dir,'images','steps.svg'),SVG);await writeFile(join(dir,'cover.png'),png(1600,2400));
 const plan='### The 14 days\n\n| Day | Focus | Try today |\n|---|---|---|\n'+Array.from({length:14},(_,i)=>`| ${i+1} | F | T |`).join('\n')+'\n\n';
 await writeFile(join(dir,'part-a.md'),chapter(1,'![A starter in a jar](images/open.png)\n\n','![Shaping](images/steps.svg "Fold and turn")\n\n'+plan));await writeFile(join(dir,'part-b.md'),SOURCES);await writeFile(join(dir,'part-c.md'),'');
 await writeFile(join(dir,'app.json'),JSON.stringify({title:'Bread',requiredTools:[],planDays:14}));
 const none={status:()=>({}),customMcp:()=>({}),customAskFirst:()=>new Set(),appPublisher:()=>null};
 const rt=await agentRuntime({conversationId:randomUUID(),files:new WorkspaceFiles(join(d,'bots')),teamFolder:new TeamFolder(join(d,'team')),onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal,wait:async()=>{},connections:none,bot:{id:randomUUID(),capabilities:{web:false,files:true,computer:false,connections:true}}});
 const call=async(name,input)=>{const r=await rt.definitions.find(x=>x.name===name).handler(input);return r.isError?{error:r.content[0].text}:JSON.parse(r.content[0].text);};
 const book=await call('make_book',{parts:['ebooks/bread/part-a.md','ebooks/bread/part-b.md'],title:'Bread',htmlPath:'ebooks/bread/book.html'});
 assert.equal(book.report.pictures.placed,2,JSON.stringify(book));
 const html=await readFile(join(dir,'book.html'),'utf8');assert.match(html,/opener has-pic/);assert.match(html,/<figure class="fig fig-svg">/);
 const app=await call('make_app',{bookDir:'ebooks/bread',coverImage:'ebooks/bread/cover.png',template:'templates/app/template-general.html'});
 assert.equal(app.passed,true,JSON.stringify(app.toFix));assert.equal(app.check.pictures,2);
 assert.match(await readFile(join(dir,'app','app-check.md'),'utf8'),/^- Pictures: 2$/m);
 await writeFile(join(dir,'part-a.md'),'## Chapter 1: X\n\n![Bad](images/../../../../outside.png)\n');
 assert.ok((await call('make_book',{parts:['ebooks/bread/part-a.md'],title:'Bread',htmlPath:'ebooks/bread/book.html'})).error,'a path outside the team folder is refused');
});
