import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {toolResultActivity,claudeToolHooks} from '../src/claude-backend.mjs';
import {findInToolResult,FIND_MAX} from '../src/tool-results.mjs';
import {staleSlides,slideHtml,carouselColours} from '../src/carousel-builder.mjs';
import {PALETTE_NAMES,contrast} from '../src/palettes.mjs';
import {ICONS} from '../src/book-style.mjs';
import {readFile} from 'node:fs/promises';

test('Toby build 35: asking for a tool the bot does not have is not a red error', () => {
  const bash=toolResultActivity({tool_use_id:'t1',is_error:true,content:'<tool_use_error>Error: No such tool available: Bash. Bash is disabled for this session, in subagents as well as here.</tool_use_error>'},5);
  assert.equal(bash.status,'skipped');assert.equal(bash.id,'t1');assert.match(bash.detail,/No such tool available: Bash/);
  const denied=toolResultActivity({tool_use_id:'t2',is_error:true,content:[{type:'text',text:'This tool is not enabled for this bot.'}]},5);
  assert.equal(denied.status,'skipped');
  const real=toolResultActivity({tool_use_id:'t3',is_error:true,content:'The team folder limit is reached.'},5);
  assert.equal(real.status,'error','a real fault stays an error');
  assert.equal(toolResultActivity({tool_use_id:'t4',content:'ok'},5).status,'complete');
});

test('Toby build 35: the tool hook also marks a missing tool as skipped', async () => {
  const seen=[];const hooks=claudeToolHooks(m=>seen.push(m.activity));
  await hooks.PostToolUseFailure[0].hooks[0]({hook_event_name:'PostToolUseFailure',tool_name:'Bash',tool_use_id:'x',tool_input:{command:'grep'},error:'No such tool available: Bash'});
  await hooks.PostToolUseFailure[0].hooks[0]({hook_event_name:'PostToolUseFailure',tool_name:'WebFetch',tool_use_id:'y',tool_input:{},error:'Request failed'});
  assert.equal(seen[0].status,'skipped');assert.equal(seen[1].status,'error');
});

test('Toby build 35: the run-limits stop counts only real errors', async () => {
  const src=await readFile(new URL('../src/run-limits.mjs',import.meta.url),'utf8');
  assert.match(src,/a\.status==='error'/);assert.doesNotMatch(src,/skipped/);
  const ui=await readFile(new URL('../src/renderer.mjs',import.meta.url),'utf8');
  assert.match(ui,/a\.status==='approval'\|\|a\.status==='error'/,'the chat shows only approvals and errors, so skipped stays quiet');
});

test('Toby build 35: read_file can search a saved tool result (no Bash or grep needed)', async t => {
  const dir=await mkdtemp(join(tmpdir(),'toby-find-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const file=join(dir,'toolu_1.json');
  await writeFile(file,['header','2026-11-18 I48 | creators/photos/erickapajarillo/photo-1.jpg','other line','samples/2026-11-18/x CREATORS/look/erickapajarillo.md'].join('\n'));
  const r=await findInToolResult(file,'ErickaPajarillo');
  assert.equal(r.matches,2);assert.deepEqual(r.lines.map(l=>l.split(':')[0]),['2','4']);
  const none=await findInToolResult(file,'wildflour');assert.equal(none.matches,0);assert.match(none.note,/No line/);
  await writeFile(file,Array.from({length:FIND_MAX+50},(_,i)=>'match '+i).join('\n'));
  const many=await findInToolResult(file,'match');assert.equal(many.matches,FIND_MAX);assert.match(many.note,/first 200/);
  await assert.rejects(findInToolResult(file,'  '),/Give some text/);
  const tools=await readFile(new URL('../src/agent-tools.mjs',import.meta.url),'utf8');
  assert.match(tools,/pass find with a word or phrase/);assert.match(tools,/You have no Bash, grep or Read tool/);
});

test('Toby build 35: books carry no paw icon (quote for From boxes, spark for Did you know?)', async () => {
  const builder=await readFile(new URL('../src/book-builder.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(builder,/ICONS\.paw|'paw'/);
  assert.match(builder,/from: 'quote'/);assert.match(builder,/ICONS\.spark/);
  assert.ok(ICONS.quote.startsWith('<svg')&&ICONS.spark.startsWith('<svg'));
});

test('Toby build 35: the flag slide sits on the deep colour in both layouts, and its words pass contrast in every palette', () => {
  for(const name of PALETTE_NAMES){const C=carouselColours(name);
    for(const layout of ['panel','card']){
      const html=slideHtml({slide:{type:'flag',kicker:'Safety note',title:'Hot pot',body:'Use dry mitts.',source:'Source: King Arthur Baking'},index:7,total:8,layout,paletteName:name,handle:'@x'});
      assert.match(html,new RegExp('\\.slide\\.flagged\\{background:'+C.deep+'\\}'),name+' '+layout);}
    assert.ok(contrast(C.accent,C.deep)>=4.5,name+' kicker and source on deep: '+contrast(C.accent,C.deep).toFixed(2));
    assert.ok(contrast(C.card,C.deep)>=4.5,name+' body on deep');
    assert.ok(contrast('#FFFFFF',C.deep)>=3,name+' title on deep');}
});

test('Toby build 35: a shorter remake moves the old extra slides out of the carousel', () => {
  assert.deepEqual(staleSlides(['01.jpg','02.jpg','07.jpg','08.jpg','sheet.jpg','slides.json','09.jpg','_old-1'],7),['08.jpg','09.jpg']);
  assert.deepEqual(staleSlides(['01.jpg','08.jpg'],8),[]);
});
