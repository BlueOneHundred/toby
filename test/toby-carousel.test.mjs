import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {slideHtml,textProblems,contrastProblems,carouselToFix,carouselColours,sheetHtml,checkNote,SLIDE_SCRIPT,LAYOUTS} from '../src/carousel-builder.mjs';
import {PALETTE_NAMES,contrast} from '../src/palettes.mjs';
import {WorkspaceFiles} from '../src/workspace-files.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {agentRuntime} from '../src/agent-tools.mjs';

const plan=()=>[
 {type:'cover',image:'ebooks/b/images/a.jpg',kicker:'Shape with me',title:'Is your starter **ready**?',body:'5 signs.'},
 {type:'point',image:'ebooks/b/images/a.jpg',label:'1',title:'It doubles',body:'Doubled in 6 to 8 hours.',source:'Source: King Arthur Baking'},
 {type:'point',image:'ebooks/b/images/a.jpg',label:'2',title:'Bubbles',body:'All through the jar.'},
 {type:'flag',title:'Pink or fuzzy? Toss it.',body:'Mold means it goes.'},
 {type:'end',title:'Shape With Me',bullets:['12 short chapters'],body:'Link below.'},
];

test('every slide type renders in both layouts with the words escaped and one coloured emphasis',()=>{
 for(const layout of LAYOUTS)for(const [i,slide] of plan().entries()){
  const html=slideHtml({slide:{...slide,body:(slide.body||'')+' <script>x</script>'},index:i+1,total:5,layout,paletteName:'terracotta',handle:'@jane',images:{'ebooks/b/images/a.jpg':'data:image/jpeg;base64,AA=='},bookCover:'data:image/jpeg;base64,BB=='});
  assert.match(html,/^<!doctype html>/);assert.ok(!html.includes('<script>'),layout+' '+slide.type);
  assert.match(html,/@font-face\{font-family:'Outfit'/);assert.match(html,new RegExp(`${i+1}/5`));
  if(slide.type==='cover')assert.match(html,/<b>ready<\/b>/);
  if(slide.type==='end')assert.match(html,/Link in bio/);
 }
 assert.match(slideHtml({slide:plan()[1],index:2,total:5,handle:'jane__doughh',images:{}}),/<span>@jane__doughh<\/span>/);
 assert.match(slideHtml({slide:plan()[1],index:2,total:5,handle:'@jane',images:{}}),/<span>@jane<\/span>/);
});

test('slide colours come from the book palette and every palette keeps words readable on its solid colours',()=>{
 assert.equal(carouselColours('terracotta').deep,'#73301E');
 for(const name of PALETTE_NAMES){const C=carouselColours(name);
  assert.ok(contrast('#FFFFFF',C.deep)>=4.5,name+' white on deep');assert.ok(contrast(C.accent,C.deep)>=4.5,name+' accent on deep');
  assert.ok(contrast('#FFFFFF',C.main)>=4.5,name+' white on main');assert.ok(contrast(C.deep,C.card)>=4.5,name+' heading on card');
  assert.ok(contrast(C.muted,C.card)>=4.5,name+' source on card');assert.ok(contrast(C.main,C.blush)>=4.5,name+' kicker on blush');}
});

test('the slide list follows the house rules before anything is made',()=>{
 assert.deepEqual(textProblems(plan()),[]);
 const bad=plan();bad[1].title='Rise — fast';bad[2].image='';bad.reverse();
 const out=textProblems(bad).join('\n');
 assert.match(out,/no em or en dashes/);assert.match(out,/needs an image/);assert.match(out,/first slide must be a cover/);assert.match(out,/last slide must be an end slide/);
});

test('contrast is measured on the real pixels behind each word',()=>{
 const w=20,h=10,bitmap=Buffer.alloc(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,light=x>=10;bitmap[i]=bitmap[i+1]=bitmap[i+2]=light?240:30;bitmap[i+3]=255;}
 const white={text:'on dark',box:[0,0,10,10],color:'rgb(255, 255, 255)',size:40};
 const onLight={text:'on light',box:[10,0,20,10],color:'rgb(255, 255, 255)',size:20};
 const pill={text:'pill',box:[10,0,20,10],color:'rgb(255, 255, 255)',size:20,own:'rgb(156, 65, 41)'};
 const r=contrastProblems([white,onLight,pill],bitmap,w,h);
 assert.deepEqual(r.problems.map(p=>p.text),['on light']);assert.ok(r.lowest<1.5);
 assert.match(carouselToFix([{problems:r.problems},{problems:[{kind:'outside',text:'Long'}]}]).join('\n'),/Slide 1: "on light" is hard to read.*\n.*Slide 2: "Long" does not fit/s);
 assert.match(carouselToFix([{problems:[{kind:'widow',text:'When and how much to fold in',word:'in'}]}]).join(''),/Slide 1: "in" sits alone on the last line of "When and how much to fold in"/);
});

test('the overview sheet and the check note describe every slide',()=>{
 const s=sheetHtml(['data:a','data:b','data:c','data:d','data:e']);assert.equal(s.width,1500);assert.equal(s.height,936);assert.equal((s.html.match(/<img/g)||[]).length,5);
 const note=checkNote({title:'T',layout:'panel',paletteName:'pine',results:[{problems:[],lowest:6.5},{problems:[{kind:'shrunk',from:88,to:80}],lowest:5}],toFix:[],textFix:[],files:['01.jpg','02.jpg']});
 assert.match(note,/Result: PASSED/);assert.match(note,/\| 2 \| 02\.jpg \| 5:1 \| title shrunk 88 to 80 px \|/);
 assert.match(SLIDE_SCRIPT,/document\.fonts\.ready/);
});

test('make_carousel exists only where slides can be captured, and refuses a broken plan without making anything',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'toby-carousel-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const files=new WorkspaceFiles(join(dir,'data')),team=new TeamFolder(join(dir,'Income'));await mkdir(join(dir,'Income'),{recursive:true});
 const bot={id:randomUUID(),capabilities:{web:false,files:true,computer:false,connections:false}};
 const base={bot,conversationId:randomUUID(),files,teamFolder:team,connections:{status:()=>({})},onActivity:()=>{},approve:async()=>false,signal:new AbortController().signal};
 assert.ok(!(await agentRuntime(base)).definitions.some(d=>d.name==='make_carousel'));
 let renders=0;const rt=await agentRuntime({...base,renderPage:async()=>{renders++;throw new Error('should not render');}});
 const tool=rt.definitions.find(d=>d.name==='make_carousel');assert.ok(tool);
 const broken=plan().slice(1);
 const r=JSON.parse((await tool.handler({folder:'ebooks/b/carousel/x',title:'T',handle:'@j',layout:'panel',palette:'pine',slides:broken})).content[0].text);
 assert.equal(r.passed,false);assert.match(r.toFix.join(' '),/first slide must be a cover/);assert.equal(renders,0);
 const missing=JSON.parse((await tool.handler({folder:'ebooks/b/carousel/x',title:'T',handle:'@j',layout:'panel',palette:'pine',slides:plan()})).content[0].text);
 assert.equal(missing.passed,false);assert.match(missing.toFix[0],/was not found/);assert.equal(renders,0);
});
