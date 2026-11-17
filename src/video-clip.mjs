// Toby: AI video clips on fal (make_video_clip) and the spending record behind the $1.50-a-reel cap.
// The cap lives in code: the record is kept in Toby's own data folder (bots cannot edit it), and going over it
// needs Tavin's yes in Toby's approval prompt. Every paid call is also written to samples/credits-<month>.md.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

// Models make_video_clip may use, with fal's price per second of video (checked 17 Nov 2026 with fal's
// pricing API). A model not listed here cannot be used, so the cap is always counted on a known price.
export const VIDEO_MODELS = {
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': {perSecond: 0.07, seconds: ['5', '10'], label: 'Kling 2.5 Turbo Pro'},
};
export const DEFAULT_VIDEO_MODEL = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
export const REEL_LIMIT = 1.5;
export const NEGATIVE = 'blur, distort, low quality, morphing, extra fingers, deformed hands, text, letters, watermark, logo, faces';

const money = x => Math.round(x * 1000) / 1000;
const stamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// The spending record: {reels: {"<reel folder>": {limit, items: [{when, what, cost}]}}}.
export class SpendLedger {
  constructor(file) { this.file = file; this.queue = Promise.resolve(); }
  async read() { try { return JSON.parse(await readFile(this.file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return {reels: {}}; throw new Error('The fal spending record could not be read.'); } }
  async reel(folder) { const all = await this.read(), r = all.reels[folder] || {limit: REEL_LIMIT, items: []}; return {limit: r.limit, items: r.items, total: money(r.items.reduce((n, i) => n + i.cost, 0))}; }
  update(fn) { const run = this.queue.then(async () => { const all = await this.read(); const out = await fn(all); await mkdir(dirname(this.file), {recursive: true}); await writeFile(this.file, JSON.stringify(all, null, 1)); return out; }); this.queue = run.catch(() => {}); return run; }
  add(folder, item) { return this.update(all => { const r = all.reels[folder] ||= {limit: REEL_LIMIT, items: []}; r.items.push(item); return money(r.items.reduce((n, i) => n + i.cost, 0)); }); }
  raise(folder, limit) { return this.update(all => { const r = all.reels[folder] ||= {limit: REEL_LIMIT, items: []}; r.limit = Math.max(r.limit, limit); return r.limit; }); }
}

// Add a line to samples/credits-<month>.md, keeping the running month total of dollars.
export async function logCredits(teamFolder, {what, model, cost, credits}, now = new Date()) {
  const path = `samples/credits-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.md`;
  let old = '';
  try { old = (await readFile(await teamFolder.target(null, path))).toString('utf8'); } catch {}
  const totals = [...old.matchAll(/month total \$([\d.]+)/g)], before = totals.length ? Number(totals[totals.length - 1][1]) : 0;
  const total = money(before + (cost || 0));
  const line = `${stamp(now)} | ${what} | ${model} | ${cost != null ? '$' + cost.toFixed(2) : credits + ' ElevenLabs credits'} | month total $${total.toFixed(3)}\n`;
  await teamFolder.append(path, (old && !old.endsWith('\n') ? '\n' : '') + line);
  return {path, total};
}

// fal's queue: submit, wait, fetch the result. key is Toby's fal key (from the fal connection).
export async function runFalQueue({endpoint, input, key, resume, fetchImpl = fetch, signal, wait = ms => new Promise(r => setTimeout(r, ms)), timeoutMs = 10 * 60000, onProgress = () => {}}) {
  const headers = {Authorization: 'Key ' + key, 'Content-Type': 'application/json'};
  // The model's own app id (owner/name) is what fal's request URLs use: fal-ai/kling-video/... -> fal-ai/kling-video.
  const app = endpoint.split('/').slice(0, 2).join('/');
  let body = {request_id: resume};
  if (!resume) {
    const res = await fetchImpl('https://queue.fal.run/' + endpoint, {method: 'POST', headers, body: JSON.stringify(input), signal});
    body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) throw new Error('fal refused Toby\'s key. Ask Tavin to check the fal connection in Toby (Connected apps).');
    if (!res.ok || !body.request_id) throw new Error('fal did not accept the clip: ' + (body.detail ? JSON.stringify(body.detail).slice(0, 300) : res.status));
  }
  const {request_id: id} = body;
  const statusUrl = body.status_url || `https://queue.fal.run/${app}/requests/${id}/status`;
  const responseUrl = body.response_url || `https://queue.fal.run/${app}/requests/${id}`;
  const start = Date.now();
  for (;;) {
    await wait(5000);
    signal?.throwIfAborted?.();
    const s = await (await fetchImpl(statusUrl, {headers, signal})).json().catch(() => ({}));
    if (s.status === 'COMPLETED') break;
    if (s.status && !['IN_QUEUE', 'IN_PROGRESS'].includes(s.status)) throw new Error('fal stopped the clip: ' + s.status);
    onProgress(s.status || 'waiting');
    if (Date.now() - start > timeoutMs) throw new Error(`fal has not finished after ${Math.round(timeoutMs / 60000)} minutes. The request id is ${id}: do not submit again; try make_video_clip later with resume "${id}".`);
  }
  const out = await fetchImpl(responseUrl, {headers, signal});
  const result = await out.json().catch(() => ({}));
  if (!out.ok) throw new Error('fal finished but the result could not be read: ' + JSON.stringify(result.detail || out.status).slice(0, 300));
  return {id, result};
}

// Before a paid clip: is it inside this reel's limit? Returns {ok, total, limit, cost, after}.
export async function budgetCheck(ledger, folder, cost) {
  const r = await ledger.reel(folder);
  return {ok: money(r.total + cost) <= r.limit + 1e-9, total: r.total, limit: r.limit, cost, after: money(r.total + cost)};
}
