// Toby: sound and video helpers built on the ffmpeg that ships inside Toby (ffmpeg-static, unpacked from the
// app archive so Windows can run it). Used by make_reel, make_video_clip and make_sound. Everything here works
// on files in the team folder; nothing goes to the network.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';

const require = createRequire(import.meta.url);
export const SR = 48000;

let cached = null;
export function ffmpegPath() {
  if (cached) return cached;
  let found = process.env.TOBY_FFMPEG || '';
  if (!found) { try { found = require('ffmpeg-static') || ''; } catch { found = ''; } }
  // Inside the packaged app the binary is unpacked next to the archive (electron-builder asarUnpack).
  found = found.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  if (!found || !existsSync(found)) throw new Error('The video maker (ffmpeg) is missing from this Toby build.');
  return (cached = found);
}

// Run ffmpeg. input (Buffer) goes to stdin; returns stdout as a Buffer and stderr as text.
export function ffmpeg(args, {input, signal, onSpawn} = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawn(ffmpegPath(), ['-hide_banner', ...(input || onSpawn ? [] : ['-nostdin']), ...args],{windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']}); }
    catch (error) { return reject(error); }
    const out = [], err = [];
    const abort = () => { try { child.kill(); } catch {} };
    signal?.addEventListener('abort', abort, {once: true});
    child.stdout.on('data', d => out.push(d));
    child.stderr.on('data', d => { err.push(d); if (err.length > 400) err.splice(0, 200); });
    child.on('error', reject);
    child.on('close', code => {
      signal?.removeEventListener('abort', abort);
      const stderr = Buffer.concat(err).toString('utf8');
      if (signal?.aborted) return reject(new Error('Stopped.'));
      if (code !== 0) return reject(new Error('ffmpeg failed: ' + stderr.trim().split(/\r?\n/).slice(-3).join(' ').slice(0, 400)));
      resolve({stdout: Buffer.concat(out), stderr});
    });
    child.stdin.on('error', () => {});
    if (onSpawn) onSpawn(child);
    else if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

// Length of a media file in seconds (read from ffmpeg's own report).
export async function duration(file, {signal} = {}) {
  let stderr = '';
  try { ({stderr} = await ffmpeg(['-i', file, '-f', 'null', '-t', '0', '-'], {signal})); }
  catch (error) { stderr = String(error.message); }
  const m = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error('Could not read the length of ' + file.split(/[\\/]/).pop() + '.');
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// Decode any sound (or a video's sound) to mono 48 kHz floats.
export async function decodeAudio(file, {signal} = {}) {
  const {stdout} = await ffmpeg(['-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {signal});
  return new Float32Array(stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + stdout.byteLength));
}

export const db = x => 20 * Math.log10(Math.max(1e-9, x));
export const fromDb = d => Math.pow(10, d / 20);

// Measure a sound take so a bot can pick one without hearing it. All levels in dBFS.
//  peakDb, rmsDb; leadSilence: seconds before the sound starts (first 10 ms window within 30 dB of the peak);
//  coverage: share of the take (between start and end) that stays within 30 dB of the peak;
//  spikes: sudden hits (a 10 ms window more than 15 dB above the average of the 200 ms before it and within
//  10 dB of the peak): clicks, taps and knocks; crest: peak to average in dB (high = hard hits on a quiet bed).
export function measureSound(samples, sr = SR) {
  const n = samples.length, win = Math.max(1, Math.round(sr * 0.01));
  const levels = [];
  for (let i = 0; i < n; i += win) { let p = 0; for (let j = i; j < Math.min(n, i + win); j++) p = Math.max(p, Math.abs(samples[j])); levels.push(p); }
  let peak = 0, sum = 0; for (let i = 0; i < n; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; sum += samples[i] * samples[i]; }
  const rms = Math.sqrt(sum / Math.max(1, n));
  const floor = peak * fromDb(-30);
  const first = levels.findIndex(l => l >= floor), last = levels.length - 1 - [...levels].reverse().findIndex(l => l >= floor);
  const active = first < 0 ? 0 : levels.slice(first, last + 1).filter(l => l >= floor).length / Math.max(1, last - first + 1);
  const spikes = [];
  for (let i = 20; i < levels.length; i++) {
    let avg = 0; for (let k = i - 20; k < i; k++) avg += levels[k]; avg /= 20;
    if (levels[i] >= peak * fromDb(-10) && db(levels[i]) - db(avg) > 15 && (!spikes.length || i * 0.01 - spikes[spikes.length - 1] > 0.15)) spikes.push(+(i * 0.01).toFixed(2));
  }
  return {
    seconds: +(n / sr).toFixed(2), peakDb: +db(peak).toFixed(1), rmsDb: +db(rms).toFixed(1), crest: +(db(peak) - db(rms)).toFixed(1),
    leadSilence: first < 0 ? +(n / sr).toFixed(2) : +(first * 0.01).toFixed(2), soundEnds: first < 0 ? 0 : +((last + 1) * 0.01).toFixed(2),
    coverage: +active.toFixed(2), soundSeconds: +(levels.filter(l => l >= floor).length * win / sr).toFixed(2), spikes,
  };
}

// Pick the best take for an action that lasts `action` seconds, by measurement only (nobody on the team can
// hear). Calibrated on Jane's reel (17 Nov): the takes Tavin rejected ("mechanical", "like someone hitting
// something") had sound for about 0.5 s (one hit), or started a second late; the takes he picked had sound for
// 3 s or more and started at once. Rules: starts within 0.3 s; audible for at least 60% of the action; then
// the most sound, fewest hard hits and the lowest crest win. Returns the takes in order with reasons.
export function rankTakes(takes, action) {
  const need = Math.max(0.2, action * 0.6);
  const scored = takes.map(t => {
    const m = t.measure, problems = [];
    if (m.leadSilence > 0.3) problems.push(`starts ${m.leadSilence} s late`);
    if (m.soundSeconds < need) problems.push(`sound lasts only ${m.soundSeconds} s of the ${action} s action (sounds like a single hit)`);
    if (m.spikes.length > Math.max(3, action * 1.5)) problems.push(`${m.spikes.length} hard hits (clicks or knocks)`);
    const score = Math.min(m.soundSeconds, action * 1.5) / Math.max(0.2, action) * 10 - m.spikes.length * 0.5 - Math.max(0, m.crest - 25) * 0.2 - m.leadSilence * 4;
    return {...t, ok: problems.length === 0, problems, score: +score.toFixed(2)};
  });
  return scored.sort((a, b) => (b.ok - a.ok) || (b.score - a.score));
}

// Integrated loudness (LUFS) and true peak of a finished file.
export async function loudness(file, {signal} = {}) {
  const {stderr} = await ffmpeg(['-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], {signal});
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  const i = summary.match(/I:\s+(-?[\d.]+) LUFS/), p = summary.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/);
  return {lufs: i ? Number(i[1]) : null, truePeakDb: p ? Number(p[1]) : null};
}

// 16-bit stereo WAV from a mono float signal.
export function wav(mono, sr = SR) {
  const n = mono.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { const v = Math.max(-32768, Math.min(32767, Math.round(mono[i] * 32767))); buf.writeInt16LE(v, 44 + i * 4); buf.writeInt16LE(v, 46 + i * 4); }
  return buf;
}
