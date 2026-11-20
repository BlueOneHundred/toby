// Toby build 38: the creator progress log. One row per creator Creator Partnerships has found, with the stage
// each one is at in Tavin's process. Lives in the team folder as creators/creators-log.csv (the record) and
// creators/creators-log.html (the page Tavin reads). The app keeps it up to date by itself:
// - new ranked creators from Creator Partnerships' daily file (creators/<date>.md, "## Ranked list") are added as "Found";
// - a package run sets "Picked" when it starts and moves the row on each time a step passes its automatic check;
// - approve_package sets "Approved"; Toby's set_creator_stage records Sent, Replied, Yes, No and later stages.
// The log is only written by code, never by a bot, so no step can be forgotten.
import {readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';

export const LOG_CSV = 'creators/creators-log.csv';
export const LOG_HTML = 'creators/creators-log.html';
export const STAGES = ['Found', 'Picked', 'Voice file', 'Look', 'Book', 'App', 'Carousels', 'Visual Check',
  'Pitch draft', 'Approved', 'Sent', 'Replied', 'Yes', 'Store + launch kit', 'Live on Whop'];
export const COLUMNS = ['handle', 'name', 'niche', 'country', 'followers', 'score', 'contact_route', 'contact', 'found_date', 'found_file',
  'base_book', 'stage_no', 'stage', 'stage_updated', 'waiting_on', 'next_step', 'app_link', 'notes'];
// Package step id -> the stage reached when that step passes.
export const STEP_STAGE = {voice: 3, look: 4, edition: 5, app: 6, carousels: 7, visual: 8, email: 9, dm: 9};
// Stages Toby may set when Tavin tells him (set_creator_stage).
export const TAVIN_STAGES = ['Sent', 'Replied', 'Yes', 'No', 'Store + launch kit', 'Live on Whop'];

const pad = n => String(n).padStart(2, '0');
export const stamp = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const clean = v => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
const key = h => String(h || '').replace(/^@/, '').trim().toLowerCase();

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some(x => x !== '')) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(COLUMNS.map(col => [col, r[head.indexOf(col)] ?? ''])));
}
const field = v => { v = clean(v); return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
export const toCsv = rows => [COLUMNS.join(','), ...rows.map(r => COLUMNS.map(c => field(r[c])).join(','))].join('\r\n') + '\r\n';

// Creator Partnerships' "## Ranked list" table in creators/<date>.md.
export function rankedCreators(markdown, file) {
  const text = String(markdown || ''), start = text.search(/^##\s+Ranked list/m);
  if (start < 0) return [];
  const block = text.slice(start).split(/\n(?=## )/)[0], out = [];
  const date = (file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  for (const line of block.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(s => s.trim());
    if (cells.length < 8 || !/^\d+$/.test(cells[0])) continue;
    const handle = cells[1].replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
    if (!handle) continue;
    const contact = cells[7], email = contact.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    const fits = cells[8] || '';
    out.push({handle, name: '', niche: cells[2], country: cells[3], followers: cells[4].replace(/[^\d]/g, ''), score: cells[5],
      contact_route: email ? (/talent|agen|manager/i.test(contact) ? 'email (talent manager)' : 'email') : 'DM',
      contact: email || `https://www.instagram.com/${handle}/`, found_date: date, found_file: file,
      base_book: /^no\b/i.test(fits) || !fits ? 'none ready' : fits});
  }
  return out;
}

export class CreatorLog {
  constructor({teamRoot, teamFolder, now = Date.now}) { Object.assign(this, {teamRoot, teamFolder, now}); this.chain = Promise.resolve(); this.lastScan = 0; this.seenFiles = new Map(); }
  async read() { try { return parseCsv(await readFile(join(this.teamRoot, LOG_CSV), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } }
  // One change at a time, so two updates never overwrite each other.
  update(fn) {
    const job = async () => { const rows = await this.read(); const changed = await fn(rows); if (changed === false) return rows; await this.teamFolder.write(null, LOG_CSV, toCsv(rows)); await this.teamFolder.write(null, LOG_HTML, renderLogHtml(rows, this.now())); return rows; };
    this.chain = this.chain.then(job, job); return this.chain;
  }
  row(rows, handle, extra = {}) {
    let r = rows.find(x => key(x.handle) === key(handle));
    if (!r) { r = Object.fromEntries(COLUMNS.map(c => [c, ''])); r.handle = String(handle).replace(/^@/, '').trim(); r.found_date = stamp(this.now()).slice(0, 10); Object.assign(r, extra); rows.push(r); }
    return r;
  }
  setStage(rows, r, n, fields = {}) {
    r.stage_no = String(n); r.stage = n === 0 ? 'No' : STAGES[n - 1]; r.stage_updated = stamp(this.now());
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) r[k] = clean(v);
  }
  // Build 40: a creator started from outside a ranked list (a near miss, or someone Tavin named) still gets her
  // details: the newest creators/<date>.md table row that names her (ranked list or near misses).
  async details(handle) {
    let names = []; try { names = (await readdir(join(this.teamRoot, 'creators'))).filter(n => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(n)).sort().reverse(); } catch { return null; }
    const want = '@' + key(handle);
    for (const n of names) {
      let text = ''; try { text = await readFile(join(this.teamRoot, 'creators', n), 'utf8'); } catch { continue; }
      const ranked = rankedCreators(text, 'creators/' + n).find(f => key(f.handle) === key(handle)); if (ranked) return ranked;
      for (const line of text.split('\n')) {
        const cells = line.split('|').slice(1, -1).map(s => s.trim()); if (cells.length < 4) continue;
        const first = cells[0].toLowerCase(); if (!(first === want || first.startsWith(want + ' '))) continue;
        const email = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
        return {name: cells[0].match(/\(([^)]+)\)/)?.[1] || '', niche: cells[1], followers: cells[2].replace(/[^\d]/g, ''), score: 'near miss: ' + cells[3].slice(0, 80),
          contact_route: email ? 'email' : 'DM', contact: email || `https://www.instagram.com/${key(handle)}/`, found_date: (n.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '', found_file: 'creators/' + n};
      }
    }
    return null;
  }
  // Package runs
  async started(run) {
    const found = await this.details(run.handle).catch(() => null);
    return this.update(rows => { const r = this.row(rows, run.handle);
      if (found) for (const [k, v] of Object.entries(found)) if (!r[k] && v) r[k] = v; if (!r.base_book || r.base_book === 'none ready') r.base_book = run.base; if (!r.contact_route) r.contact_route = run.contact === 'dm' ? 'DM' : 'email';
      this.setStage(rows, r, 2, {base_book: run.base, waiting_on: 'Package run (automatic)', next_step: 'Creator Partnerships: voice file and photos'}); });
  }
  stepPassed(run, stepId, nextLabel, appLink) {
    const n = STEP_STAGE[stepId]; if (!n) return this.chain;
    return this.update(rows => { const r = this.row(rows, run.handle);
      this.setStage(rows, r, n, {waiting_on: nextLabel ? 'Package run (automatic)' : 'Tavin: review', next_step: nextLabel || `Open pipeline/${run.handle}/review.html, then tell Toby "approve @${run.handle}" or what to change`, app_link: appLink || r.app_link}); });
  }
  stopped(run, reason) {
    return this.update(rows => { const r = this.row(rows, run.handle); r.waiting_on = 'Tavin: package run stopped'; r.next_step = `See pipeline/${run.handle}/status.md: ${clean(reason).slice(0, 160)}`; r.stage_updated = stamp(this.now()); });
  }
  approved(run) {
    return this.update(rows => { const r = this.row(rows, run.handle); this.setStage(rows, r, 10, {waiting_on: 'Tavin: send', next_step: 'Tavin sends the draft himself, then tells Toby "sent @' + run.handle + '"'}); });
  }
  // Toby, when Tavin tells him
  async setByTavin(handle, stage, note = '') {
    const want = TAVIN_STAGES.find(s => s.toLowerCase() === String(stage).trim().toLowerCase());
    if (!want) throw new Error(`stage must be one of: ${TAVIN_STAGES.join(', ')}.`);
    const rows = await this.update(rows => { const r = rows.find(x => key(x.handle) === key(handle)); if (!r) throw new Error(`@${key(handle)} is not in the creator log.`);
      const n = want === 'No' ? 0 : STAGES.indexOf(want) + 1;
      const next = {Sent: ['Creator', 'Wait for her reply; follow-up after 3 days'], Replied: ['Tavin', 'Read her reply; tell Toby "yes @handle" or "no @handle"'], Yes: ['Store Manager and Marketing Kit', 'Whop product and launch kit'], No: ['nobody', 'none'], 'Store + launch kit': ['Tavin', 'Whop clicks, then go live'], 'Live on Whop': ['nobody', 'Selling']}[want];
      this.setStage(rows, r, n, {waiting_on: next[0], next_step: next[1].replace('@handle', '@' + r.handle)});
      if (note) r.notes = clean((r.notes ? r.notes + '; ' : '') + `${stamp(this.now()).slice(0, 10)}: ${note}`).slice(0, 600); });
    // Build 44: every send is also one line in outreach/sent-<month>.md, so "Sent today: X of 2" is counted, not guessed.
    if (want === 'Sent') { const t = stamp(this.now()); await this.teamFolder.append(`outreach/sent-${t.slice(0, 7)}.md`, `${t} | @${key(handle)} | ${clean(note).replace(/\|/g, '/').slice(0, 200) || 'sent by Tavin'}\n`).catch(() => {}); }
    return rows.find(x => key(x.handle) === key(handle));
  }
  // Build 44: how many creators Tavin has sent to today (outreach/sent-<month>.md), and who.
  async sentToday() {
    const t = stamp(this.now()), today = t.slice(0, 10); let text = '';
    try { text = await readFile(join(this.teamRoot, `outreach/sent-${t.slice(0, 7)}.md`), 'utf8'); } catch {}
    const who = [...new Set(text.split('\n').filter(l => l.startsWith(today)).map(l => l.split('|')[1]?.trim()).filter(Boolean))];
    return {date: today, count: who.length, target: 2, who};
  }
  // New ranked creators from Creator Partnerships' daily files. Cheap: only reads files that changed.
  async scanFound() {
    let names = []; try { names = (await readdir(join(this.teamRoot, 'creators'))).filter(n => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(n)); } catch { return 0; }
    const found = [];
    for (const n of names) {
      let t = 0; try { t = (await stat(join(this.teamRoot, 'creators', n))).mtimeMs; } catch { continue; }
      if (this.seenFiles.get(n) === t) continue; this.seenFiles.set(n, t);
      try { found.push(...rankedCreators(await readFile(join(this.teamRoot, 'creators', n), 'utf8'), 'creators/' + n)); } catch {}
    }
    if (!found.length) return 0;
    let added = 0;
    await this.update(rows => { for (const f of found) { if (rows.some(x => key(x.handle) === key(f.handle))) continue; const r = this.row(rows, f.handle, f); this.setStage(rows, r, 1, {waiting_on: 'Tavin: pick in the brief', next_step: `If picked: tell Toby "Make a package for @${f.handle}"`}); r.stage_updated = f.found_date || r.stage_updated; added++; } return added ? undefined : false; });
    return added;
  }
  async tick() { if (this.now() - this.lastScan < 60000) return; this.lastScan = this.now(); await this.scanFound().catch(() => {}); }
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const num = r => { const n = Number(r.stage_no); return Number.isFinite(n) ? n : 0; };
export function groupOf(r) {
  const s = num(r);
  if (r.stage === 'No') return 'Said no or dropped';
  if (s >= 10) return 'Out with the creator';
  if (s >= 9) return 'Pitch ready, not sent';
  if (s >= 2) return 'Package being made';
  if (/^Tavin/.test(r.waiting_on)) return 'Found: waiting on your decision';
  return 'Found: not shortlisted';
}
const ORDER = ['Package being made', 'Pitch ready, not sent', 'Out with the creator', 'Found: waiting on your decision', 'Found: not shortlisted', 'Said no or dropped'];
export function renderLogHtml(rows, when) {
  const track = r => '<ol class="track">' + STAGES.map((name, i) => `<li class="${i + 1 < num(r) ? 'done' : i + 1 === num(r) ? 'now' : ''}" title="${i + 1}. ${esc(name)}"><span>${i + 1}</span></li>`).join('') + '</ol>';
  const fmt = v => /^\d+$/.test(v) ? Number(v).toLocaleString('en-US') : esc(v);
  const card = r => `<article class="row"><div class="who"><b>@${esc(r.handle)}</b><span>${esc(r.name)}</span><small>${esc(r.niche)} · ${esc(r.country)} · ${fmt(r.followers)} followers · score ${esc(r.score)}</small></div>
<div class="stage"><div class="label">${esc(r.stage_no)}. ${esc(r.stage)} <em>${esc(r.stage_updated)}</em></div>${track(r)}</div>
<div class="next"><div><b>Waiting on:</b> ${esc(r.waiting_on)}</div><div><b>Next:</b> ${esc(r.next_step)}</div>
<small>${esc(r.contact_route)}: ${/^https?:/.test(r.contact) ? `<a href="${esc(r.contact)}">Instagram</a>` : esc(r.contact)} · book: ${esc(r.base_book)}${r.app_link ? ` · <a href="${esc(r.app_link)}">open app</a>` : ''}</small>
<small class="notes">${esc(r.notes)}</small></div></article>`;
  const groups = ORDER.map(g => [g, rows.filter(r => groupOf(r) === g).sort((a, b) => num(b) - num(a) || String(a.found_date).localeCompare(String(b.found_date)))]).filter(([, rs]) => rs.length);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Creator progress log</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>
:root{--ink:#1f2328;--muted:#5b6470;--line:#e3e0da;--bg:#faf8f5;--card:#fff;--acc:#b5542f;--done:#2f7d5b}
*{box-sizing:border-box}body{margin:0;font:18px/1.5 system-ui,Segoe UI,sans-serif;color:var(--ink);background:var(--bg)}
header{padding:28px 40px 8px}h1{margin:0;font-size:32px}header p{color:var(--muted);margin:6px 0}
.stats{display:flex;gap:14px;flex-wrap:wrap;padding:8px 40px 4px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 16px;color:var(--muted)}.stat b{display:block;font-size:26px;color:var(--ink)}
.legend{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;padding:10px 40px;margin:0;color:var(--muted);font-size:16px}.legend span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#eee;margin-right:6px;font-size:13px;color:var(--ink)}
section{padding:6px 40px 18px}h2{font-size:22px;margin:18px 0 10px}h2 span{color:var(--muted);font-weight:400}
.row{display:grid;grid-template-columns:minmax(260px,1.1fr) minmax(520px,2fr) minmax(320px,1.4fr);gap:24px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin-bottom:10px}
.who b{display:block;font-size:19px}.who span{display:block}small{display:block;color:var(--muted);font-size:15px;margin-top:4px}
.label{font-weight:600;margin-bottom:8px}.label em{font-weight:400;color:var(--muted);font-style:normal;font-size:15px;margin-left:8px}
.track{list-style:none;display:flex;gap:4px;padding:0;margin:0}.track li{flex:1;height:30px;border-radius:6px;background:#efece7;display:grid;place-items:center;font-size:13px;color:#8a8f96}
.track li.done{background:var(--done);color:#fff}.track li.now{background:var(--acc);color:#fff;font-weight:700}
.next div{margin-bottom:4px}.notes{font-style:italic}a{color:var(--acc)}footer{padding:10px 40px 40px;color:var(--muted);font-size:15px}
</style></head><body>
<header><h1>Creator progress log</h1><p>Every creator Creator Partnerships has found, and the stage each one is at. Updated ${esc(stamp(when))} by the Toby app from <code>creators\\creators-log.csv</code>.</p></header>
<div class="stats">${groups.map(([g, rs]) => `<div class="stat"><b>${rs.length}</b>${esc(g)}</div>`).join('')}</div>
<ol class="legend">${STAGES.map((s, i) => `<li><span>${i + 1}</span>${esc(s)}</li>`).join('')}</ol>
${groups.map(([g, rs]) => `<section><h2>${esc(g)} <span>${rs.length}</span></h2>${rs.map(card).join('')}</section>`).join('')}
<footer>Green = stage done · orange = current stage. The app updates this page by itself: new creators each morning, every package step that passes, approvals, and anything you tell Toby (sent, replied, yes, no).</footer>
</body></html>`;
}
