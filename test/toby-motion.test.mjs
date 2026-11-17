// Toby: Motion Studio tools (make_video_clip, make_sound, make_reel pieces). No network, no cost: fal and
// ElevenLabs are faked; ffmpeg is the bundled one.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TeamFolder} from '../src/team-folder.mjs';
import {Connections} from '../src/connections.mjs';
import {ffmpeg, decodeAudio, measureSound, rankTakes, wav, SR} from '../src/media.mjs';
import {storyboardProblems, timeline, mixReel, wordProblems, soundCheck, reelHtml} from '../src/reel-builder.mjs';
import {SpendLedger, budgetCheck, logCredits, runFalQueue, REEL_LIMIT} from '../src/video-clip.mjs';
import {soundPromptProblems} from '../src/sound-maker.mjs';
import {registerMotionTools} from '../src/motion-tools.mjs';

const tmp = () => mkdtemp(join(tmpdir(), 'toby-motion-'));
const sine = (seconds, from = 0, to = seconds, amp = 0.4) => { const x = new Float32Array(Math.round(seconds * SR)); for (let i = Math.round(from * SR); i < Math.round(to * SR); i++) x[i] = amp * Math.sin(2 * Math.PI * 330 * i / SR); return x; };
async function mp3(samples) { const dir = await tmp(); await writeFile(join(dir, 'a.wav'), wav(samples)); await ffmpeg(['-y', '-i', join(dir, 'a.wav'), '-b:a', '128k', join(dir, 'a.mp3')]); const b = await readFile(join(dir, 'a.mp3')); await rm(dir, {recursive: true, force: true}); return b; }
function tools(deps) { const map = {}; registerMotionTools({register: (name, _d, _s, handler) => { map[name] = handler; }, text: v => JSON.parse(JSON.stringify(v)), ...deps}); return map; }

const board = (over = {}) => ({folder: 'r', name: 'reel', palette: 'terracotta', mode: 'final', shots: [
  {type: 'clip', seconds: 2, image: 'a.jpg', clip: 'c.mp4', clipFrom: 2.2, clipTo: 4.6, words: [{text: 'OH MY GOODNESS.', at: 1, size: 'big', y: 250}]},
  {type: 'photo', seconds: 1.5, image: 'b.jpg', words: [{text: 'Cheese.', at: 0, size: 'mid', y: 330}]},
  {type: 'book', seconds: 3, image: 'a.jpg', book: 'book.html', pages: ['cover', 'ch-5']},
  {type: 'app', seconds: 2, image: 'a.jpg', app: 'app/index.html', tap: 'Tick off day 1'},
  {type: 'end', seconds: 2, image: 'a.jpg', cover: 'book.html', words: [{text: 'Comment **SHAPE**', at: 0.1, size: 'mid', y: 1220}]}], ...over});

test('storyboard rules: Jane\'s recipe passes, broken boards are explained', () => {
  assert.deepEqual(storyboardProblems(board()), []);
  const bad = board({shots: [{type: 'photo', seconds: 2, image: 'a.jpg', words: [{text: 'One two three four five', at: 0, size: 'big', y: 100}]}, {type: 'clip', seconds: 1, image: 'a.jpg', clip: 'c.mp4', clipFrom: 0, clipTo: 4}, {type: 'photo', seconds: 1, image: 'b.jpg'}, {type: 'photo', seconds: 1, image: 'b.jpg'}]});
  const p = storyboardProblems(bad).join('\n');
  assert.match(p, /6 s long|7 to 15/); assert.match(p, /safe area/); assert.match(p, /1 to 4 words/); assert.match(p, /4x/); assert.match(p, /end card/); assert.match(p, /real-action AI hook/);
  assert.match(storyboardProblems(board({shots: board().shots.map((s, i) => i === 4 ? {...s, words: [{text: 'Link in bio', at: 0, size: 'mid', y: 1200}]} : s)})).join(), /comment call to action/);
  assert.match(storyboardProblems(board({shots: board().shots.map((s, i) => i === 1 ? {...s, words: [{text: 'Bake — now', at: 0, size: 'mid', y: 400}]} : s)})).join(), /em or en dash/);
  // An animatic may have clips without files yet.
  assert.deepEqual(storyboardProblems(board({mode: 'animatic', shots: board().shots.map((s, i) => i === 0 ? {type: 'clip', seconds: 2, image: 'a.jpg'} : s)})), []);
  assert.deepEqual(timeline(board().shots).map(s => [s.a, s.b]), [[0, 2], [2, 3.5], [3.5, 6.5], [6.5, 8.5], [8.5, 10.5]]);
});

test('the reel page holds the words, safe-area check catches words under Instagram\'s buttons', () => {
  const html = reelHtml(board(), {url: p => 'file:///' + p, clipFrames: {0: ['f1.jpg', 'f2.jpg']}, pages: {2: ['p1.jpg', 'p2.jpg'], 4: ['c.jpg']}, appInfo: {3: {before: 'a1.jpg', after: 'a2.jpg', tap: {x: 130, y: 542}, width: 390}}});
  assert.ok(html.includes(`Comment <span class=\\"acc\\">SHAPE</span>`), "accent word"); assert.match(html, /#F4CE8A/); assert.doesNotMatch(html, /ANIMATIC/);
  assert.match(reelHtml(board({mode: 'animatic'}), {url: p => p}), /ANIMATIC: AI clip goes here/);
  assert.deepEqual(wordProblems([{text: 'ok', top: 250, bottom: 400, right: 900}]), []);
  assert.equal(wordProblems([{text: 'low', top: 1450, bottom: 1560, right: 900}, {text: 'wide', top: 300, bottom: 400, right: 1010}]).length, 2);
});

test('sound mix: effects land where placed, turned up to their level, music follows its curve', () => {
  const m = mixReel({seconds: 4, sounds: [{file: 'x', samples: sine(1, 0, 1, 0.01), at: 2, peakDb: -6}], music: {samples: sine(4, 0, 4, 0.2), gains: [[0, 0.3], [3.3, 0.3], [4, 0]]}});
  assert.equal(m.fx.length, 4 * SR);
  let before = 0, during = 0; for (let i = 0; i < 2 * SR; i++) before = Math.max(before, Math.abs(m.fx[i])); for (let i = 2 * SR; i < 3 * SR; i++) during = Math.max(during, Math.abs(m.fx[i]));
  assert.equal(before, 0); assert.ok(during > 0.85, 'the quiet effect is turned up');
  assert.ok(Math.abs(m.music[Math.round(3.99 * SR)]) < 0.05, 'music fades out at the end');
  assert.deepEqual(soundCheck(board({sounds: [{file: 'w', at: 1.85, hit: 0.15}, {file: 't', at: 7.1}]})).map(s => s.on), ['the cut at 2 s', 'shot 4 (app)']);
});

test('take measurements: a single hit fails, a sound through the whole action passes (Jane, 17 Nov)', () => {
  const hit = sine(5, 3.5, 3.9, 0.5), long = sine(5, 0.1, 4.2, 0.3), late = sine(5, 1.2, 4.8, 0.3);
  const m = measureSound(hit); assert.ok(m.soundSeconds < 0.6); assert.ok(m.leadSilence > 3);
  const ranked = rankTakes([{file: 'hit', measure: m}, {file: 'late', measure: measureSound(late)}, {file: 'long', measure: measureSound(long)}], 2);
  assert.equal(ranked[0].file, 'long'); assert.equal(ranked[0].ok, true);
  assert.match(ranked.find(t => t.file === 'hit').problems.join(), /single hit/); assert.match(ranked.find(t => t.file === 'late').problems.join(), /late/);
});

test('sound prompts: no hard hits under an action, music is instrumental', () => {
  assert.deepEqual(soundPromptProblems('Slow close-up of soft warm bread being pulled apart by hand, gentle crust crackle, soft squishy stretch of melted cheese, no clicks, no taps, ASMR', 'effect', 3), []);
  assert.deepEqual(soundPromptProblems('Cast iron lid gently lifted off a pot, soft scrape, then a warm hiss of steam rising, no clanging, no impact', 'effect', 3), []);
  assert.match(soundPromptProblems('Lid lifted with a metal clank', 'effect', 3).join(), /clank/);
  assert.deepEqual(soundPromptProblems('A single soft finger tap on a phone screen', 'effect', 0.5), []);
  assert.match(soundPromptProblems('Warm acoustic kitchen song', 'music', 30).join(), /instrumental/);
});

test('spending record: $1.50 a reel, raised only by Tavin\'s yes, kept outside the team folder', async () => {
  const dir = await tmp(); const ledger = new SpendLedger(join(dir, 'data', 'fal-spend.json'));
  assert.equal(REEL_LIMIT, 1.5);
  for (const k of [1, 2, 3, 4]) await ledger.add('r', {what: 'c' + k, cost: 0.35});
  assert.deepEqual(await budgetCheck(ledger, 'r', 0.35), {ok: false, total: 1.4, limit: 1.5, cost: 0.35, after: 1.75});
  assert.equal((await budgetCheck(ledger, 'other', 0.35)).ok, true);
  await ledger.raise('r', 1.75); assert.equal((await budgetCheck(ledger, 'r', 0.35)).ok, true);
  await rm(dir, {recursive: true, force: true});
});

test('credits log keeps the month total in Tavin\'s format', async () => {
  const dir = await tmp(); const team = new TeamFolder(dir); await mkdir(join(dir, 'samples'));
  await writeFile(join(dir, 'samples', 'credits-2026-11.md'), '2026-11-17 12:51 | Jane | kling 5 s | $0.35 | month total $4.591\n');
  const r = await logCredits(team, {what: 'bagel shot1', model: 'kling 5 s', cost: 0.35}, new Date(2026, 10, 18, 9, 5));
  assert.equal(r.total, 4.941);
  await logCredits(team, {what: 'tear', model: 'ElevenLabs sound effects', credits: 68}, new Date(2026, 10, 18, 9, 6));
  const text = await readFile(join(dir, 'samples', 'credits-2026-11.md'), 'utf8');
  assert.match(text, /2026-11-18 09:05 \| bagel shot1 \| kling 5 s \| \$0\.35 \| month total \$4\.941\n/);
  assert.match(text, /09:06 \| tear \| ElevenLabs sound effects \| 68 ElevenLabs credits \| month total \$4\.941/);
  await rm(dir, {recursive: true, force: true});
});

test('fal queue: submit, wait, read the result with Toby\'s key; resume never pays twice', async () => {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => { calls.push([opts.method || 'GET', url, opts.headers?.Authorization]); if (opts.method === 'POST') return Response.json({request_id: 'req1'});
    if (url.endsWith('/status')) return Response.json({status: calls.filter(c => c[1].endsWith('/status')).length > 1 ? 'COMPLETED' : 'IN_PROGRESS'}); return Response.json({video: {url: 'https://v3.fal.media/x.mp4'}}); };
  const r = await runFalQueue({endpoint: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', input: {}, key: 'k', fetchImpl, wait: async () => {}});
  assert.equal(r.result.video.url, 'https://v3.fal.media/x.mp4');
  assert.deepEqual(calls[0], ['POST', 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video', 'Key k']);
  assert.equal(calls[1][1], 'https://queue.fal.run/fal-ai/kling-video/requests/req1/status');
  calls.length = 0; await runFalQueue({endpoint: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', input: {}, key: 'k', resume: 'req1', fetchImpl, wait: async () => {}});
  assert.equal(calls.filter(c => c[0] === 'POST').length, 0);
  await assert.rejects(runFalQueue({endpoint: 'a/b', input: {}, key: 'bad', fetchImpl: async () => new Response('{}', {status: 401}), wait: async () => {}}), /refused Toby's key/);
});

test('make_video_clip: checks the cap, asks Tavin when over it, saves the clip, frames and the cost', async () => {
  const dir = await tmp(), team = new TeamFolder(join(dir, 'team')), ledger = new SpendLedger(join(dir, 'fal-spend.json'));
  await mkdir(join(dir, 'team', 'pics'), {recursive: true}); await ffmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=red:s=800x1000', '-frames:v', '1', join(dir, 'team', 'pics', 'p.jpg')]);
  await ffmpeg(['-y', '-f', 'lavfi', '-i', 'testsrc=s=720x1280:r=24:d=5', '-pix_fmt', 'yuv420p', join(dir, 'clip.mp4')]);
  const clip = await readFile(join(dir, 'clip.mp4')); let submitted = 0, asked = [];
  const fetchImpl = async (url, opts = {}) => { if (opts.method === 'POST') { submitted++; const body = JSON.parse(opts.body); assert.match(body.image_url, /^data:image\/jpeg;base64,/); assert.equal(body.duration, '5'); return Response.json({request_id: 'r' + submitted}); }
    if (url.endsWith('/status')) return Response.json({status: 'COMPLETED'}); if (url.startsWith('https://queue')) return Response.json({video: {url: 'https://v3.fal.media/c.mp4'}}); return new Response(clip); };
  const connections = {apiKey: k => k === 'fal' ? 'key' : null};
  let answer = false;
  const t = tools({teamFolder: team, connections, cropToRatio: async (b) => b, ledger, approve: async (title) => { asked.push(title); return answer; }, fetchImpl, wait: async () => {}});
  const args = {reel: 'eds/bagel/video', name: 'clips/shot1', image: 'pics/p.jpg', prompt: 'Hands slowly tear a warm loaf apart, cheese stretching', focusX: 0.5, focusY: 0.5, seconds: '5', model: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', why: 'hook'};
  for (const k of [1, 2, 3, 4]) { const r = await t.make_video_clip({...args, name: 'clips/shot' + k}); assert.equal(r.made, true); assert.equal(r.cost, 0.35); }
  const r4 = (await ledger.reel('eds/bagel/video')); assert.equal(r4.total, 1.4); assert.equal(asked.length, 0);
  const no = await t.make_video_clip({...args, name: 'clips/shot5'}); assert.equal(no.made, false); assert.match(no.reason, /Tavin said no/); assert.equal(submitted, 4); assert.equal(asked.length, 1);
  answer = true; const yes = await t.make_video_clip({...args, name: 'clips/shot5'}); assert.equal(yes.made, true); assert.equal(yes.reelSpent, 1.75); assert.equal(yes.reelLimit, 1.75);
  const saved = await readFile(join(dir, 'team', 'eds/bagel/video/clips/shot1.mp4')); assert.equal(saved.length, clip.length);
  assert.ok((await readFile(join(dir, 'team', 'eds/bagel/video/clips/shot1-sheet.jpg'))).length > 1000);
  assert.equal(yes.frames.length, 10); assert.match(yes.frames[0], /shot5-frames\/0\.0s\.jpg$/);
  assert.match(await readFile(join(dir, 'team', 'samples', `credits-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}.md`), 'utf8'), /month total \$1\.750/);
  const noKey = await tools({teamFolder: team, connections: {apiKey: () => null}, cropToRatio: async b => b, ledger, approve: async () => true, fetchImpl}).make_video_clip(args);
  assert.match(noKey.reason, /no fal connection/);
  await rm(dir, {recursive: true, force: true});
});

test('make_sound: several takes, measured, the single-hit take is not picked', async () => {
  const dir = await tmp(), team = new TeamFolder(join(dir, 'team')); await mkdir(join(dir, 'team'), {recursive: true});
  const takes = [await mp3(sine(3, 2.4, 2.8, 0.5)), await mp3(sine(3, 0.05, 2.9, 0.3))]; let n = 0, sent;
  const fetchImpl = async (url, opts) => { sent = [url, opts.headers['xi-api-key'], JSON.parse(opts.body)]; return new Response(takes[n++ % 2], {headers: {'character-cost': '51'}}); };
  const t = tools({teamFolder: team, connections: {apiKey: k => k === 'elevenlabs' ? 'xi' : null}, fetchImpl});
  const r = await t.make_sound({folder: 'v/sound', name: 'tear', kind: 'effect', prompt: 'Soft warm bread pulled apart by hand, gentle crackle, no clicks, no taps', seconds: 3, action: 2, takes: 2, why: 'hook'});
  assert.equal(r.made, true); assert.equal(r.pick, 'v/sound/tear-2.mp3');
  assert.deepEqual(sent.slice(0, 2), ['https://api.elevenlabs.io/v1/sound-generation', 'xi']); assert.equal(sent[2].duration_seconds, 3);
  assert.match(await readFile(join(dir, 'team', 'v/sound/tear-takes.md'), 'utf8'), /Pick: v\/sound\/tear-2\.mp3/);
  const harsh = await t.make_sound({folder: 'v/sound', name: 'lid', kind: 'effect', prompt: 'Iron lid lifted with a loud clang', seconds: 3, why: 'lid'}); assert.equal(harsh.made, false);
  const m = await t.make_sound({folder: 'v/sound', name: 'bed', kind: 'music', prompt: 'Warm sunny acoustic kitchen groove, instrumental, no vocals', seconds: 20, takes: 1, why: 'bed'});
  assert.equal(sent[0], 'https://api.elevenlabs.io/v1/music'); assert.equal(sent[2].force_instrumental, true); assert.equal(sent[2].music_length_ms, 20000); assert.equal(m.made, true);
  const none = await tools({teamFolder: team, connections: {apiKey: () => null}, fetchImpl}).make_sound({folder: 'v', name: 'x1', kind: 'effect', prompt: 'soft whoosh of air', seconds: 1, why: 'cut'});
  assert.match(none.reason, /named "elevenlabs"/);
  await rm(dir, {recursive: true, force: true});
});

test('connections: the ElevenLabs key is a key, not an MCP server; the fal key comes from the fal connection', async () => {
  const dir = await tmp();
  const c = await new Connections({directory: dir, encrypt: async s => Buffer.from(s), decrypt: async b => b.toString()}).init();
  await c.configure({customAdd: {name: 'fal', url: 'https://mcp.fal.ai/mcp', token: 'falkey'}});
  await c.configure({customAdd: {name: 'elevenlabs', url: 'https://api.elevenlabs.io', token: 'xikey'}});
  assert.equal(c.apiKey('fal'), 'falkey'); assert.equal(c.apiKey('elevenlabs'), 'xikey');
  assert.deepEqual(Object.keys(c.customMcp()), ['fal']); assert.ok(!c.customAskFirst().has('elevenlabs'));
  await rm(dir, {recursive: true, force: true});
});

test('team files: deep folders are listed; videos and large text files are described, not refused', async () => {
  const dir = await tmp(), team = new TeamFolder(dir), deep = 'ebooks/s/editions/h/video/v2/clips';
  await mkdir(join(dir, deep), {recursive: true}); await writeFile(join(dir, deep, 'a.mp4'), Buffer.alloc(300000)); await writeFile(join(dir, deep, 'big.html'), '<p>' + 'x'.repeat(250000) + '<img src="data:image/jpeg;base64,' + 'A'.repeat(100000) + '">');
  assert.ok((await team.list()).some(f => f.path.replace(/\\/g, '/') === deep + '/a.mp4'));
  assert.match((await team.content(null, deep + '/a.mp4')).content[0].text, /contact sheet/);
  const big = (await team.content(null, deep + '/big.html')).content[0].text; assert.match(big, /^<p>x/); assert.ok(big.length < 260000);
  await rm(dir, {recursive: true, force: true});
});
