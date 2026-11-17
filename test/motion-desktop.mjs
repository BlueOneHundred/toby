// Toby: proves make_reel works inside the packaged app (run by release-smoke.mjs on the Windows build):
// the bundled ffmpeg is unpacked and runs, Electron draws the reel offscreen frame by frame, the sound is
// mixed to about -14 LUFS and both MP4s and the contact sheet are written. Synthetic files only.
import {launchTestApp} from './electron-fixture.mjs';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const directory = await mkdtemp(join(tmpdir(), 'toby-motion-'));
const app = await launchTestApp({directory, executablePath: process.env.GRATIS_TEST_APP});
try {
  await (await app.firstWindow()).locator('#new-bot').waitFor();
  const result = await app.evaluate(async ({app: electronApp}, dir) => {
    const require = process.getBuiltinModule('module').createRequire(electronApp.getAppPath() + '/package.json');
    const fs = process.getBuiltinModule('fs/promises'), path = process.getBuiltinModule('path');
    const src = electronApp.getAppPath() + '/src/';
    const {TeamFolder} = require(src + 'team-folder.mjs'), {makeReel} = require(src + 'reel-maker.mjs'), media = require(src + 'media.mjs');
    const pdf = require(src + 'pdf-maker.cjs');
    const team = path.join(dir, 'team'); await fs.mkdir(join2(team, 'pics'), {recursive: true});
    function join2(...p) { return path.join(...p); }
    const colours = ['#9C4129', '#35444F', '#496e57', '#806549'];
    for (const [k, c] of colours.entries()) await media.ffmpeg(['-y', '-f', 'lavfi', '-i', `color=c=${c}:s=900x1400`, '-vf', 'drawbox=x=300:y=500:w=300:h=400:color=0xF4CE8A:t=fill', '-frames:v', '1', join2(team, 'pics', `p${k}.jpg`)]);
    const sr = 48000, tone = new Float32Array(sr * 6); for (let i = 0; i < tone.length; i++) tone[i] = 0.3 * Math.sin(2 * Math.PI * 220 * i / sr) * (0.5 + 0.5 * Math.sin(i / sr * 3));
    await fs.writeFile(join2(team, 'pics', 'tone.wav'), media.wav(tone));
    const teamFolder = new TeamFolder(team);
    const shots = [0, 1, 2, 3].map(k => ({type: 'photo', seconds: 1.5, image: `pics/p${k}.jpg`, words: [{text: 'Shot **' + (k + 1) + '**', at: 0, size: 'big', y: 400}]}));
    shots.push({type: 'end', seconds: 1.5, image: 'pics/p0.jpg', cover: 'pics/p1.jpg', words: [{text: 'Comment **TEST**', at: 0.1, size: 'mid', y: 1220}]});
    const board = {folder: 'reel', name: 'smoke', palette: 'terracotta', mode: 'animatic', shots, sounds: [{file: 'pics/tone.wav', at: 0, to: 1, peakDb: -6}], music: {file: 'pics/tone.wav'}};
    const started = Date.now();
    const out = await makeReel({board, teamFolder, signal: new AbortController().signal,
      renderPage: input => pdf.renderPage({root: team, ...input}), renderFrames: input => pdf.renderFrames({root: team, ...input})});
    const sizes = {}; for (const f of out.files || []) sizes[f] = (await fs.stat(join2(team, f))).size;
    return {out, sizes, ms: Date.now() - started, ffmpeg: media.ffmpegPath()};
  }, directory);
  console.log(JSON.stringify({motion: result.out.passed, ms: result.ms, loudness: result.out.loudness, ffmpeg: result.ffmpeg, toFix: result.out.toFix}));
  assert.equal(result.out.passed, true, JSON.stringify(result.out.toFix));
  assert.match(result.ffmpeg, /app\.asar\.unpacked|node_modules/);
  assert.ok(result.sizes['reel/smoke.mp4'] > 20000 && result.sizes['reel/smoke-no-music.mp4'] > 20000 && result.sizes['reel/smoke-sheet.jpg'] > 5000);
  for (const l of Object.values(result.out.loudness)) assert.ok(l.lufs > -16 && l.lufs < -12, JSON.stringify(l));
} finally { await app.close(); await rm(directory, {recursive: true, force: true}); }
