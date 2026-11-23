// Toby build 48: creator emails through Gmail, from Dan <dan@blueonehundred.com>. The app (not a bot):
// 1. turns an approved creator's pitch (Email 1 in the newest send sheet) into a Gmail draft with Dan's Gmail
//    signature (build 50: no attachments; her private sample page link is in the text);
// 2. watches Sent: an email from dan@ to a creator's address marks her "Sent" in the creator log (no more
//    "sent @handle" for email), starts the follow-up clock and writes outreach/sent-<month>.md;
// 3. after 3 days with no reply, drafts the follow-up in the same thread; after 10 days, the last email;
// 4. watches the inbox: a reply from a creator marks her "Replied" and lists it in outreach/replies-<month>.md.
// Nothing is ever sent by Toby. A draft is refused if it still says "Tavin" or names hello@ (all outreach is Dan's).
// Build 50 (Tavin, 23 Nov 2026): no attachments. Email 1 carries ONE link, her private sample page (<app link>kit/,
// made by sample-page.mjs), and the draft is refused until that page is published and live.
import {readFile, readdir, writeFile, mkdir, rename} from 'node:fs/promises';
import {join, basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {stamp} from './creator-log.mjs';

export const OUTREACH_FROM = {name: 'Dan', email: 'dan@blueonehundred.com'};
const DAY = 86400000;
const key = h => String(h || '').replace(/^@/, '').trim().toLowerCase();
const emailIn = s => (String(s || '').match(/[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/) || [''])[0].toLowerCase();

/** One creator's email entry from a send sheet: to, subjects, Email 1, follow-up, last email, attachments. */
export function parseSendSheetEntry(text, handle) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n'), want = '### @' + key(handle);
  let start = -1;
  lines.forEach((l, i) => { const t = l.trim().toLowerCase(); if (t === want || t.startsWith(want + ' ')) start = i; });
  if (start < 0) return null;
  let end = lines.length; for (let i = start + 1; i < lines.length; i++) if (/^#{1,3} /.test(lines[i])) { end = i; break; }
  const part = lines.slice(start, end);
  const to = emailIn((part.find(l => /^\s*-\s*\*\*To:\*\*/.test(l)) || ''));
  const block = (re) => {
    const i = part.findIndex(l => re.test(l.trim())); if (i < 0) return '';
    const out = []; for (let j = i + 1; j < part.length; j++) { const t = part[j].trim(); if (/^\*\*[^*]+\*\*/.test(t) || /^#{1,4} /.test(t)) break; out.push(part[j]); }
    return out.join('\n').replace(/^\s*\(Tavin's own email template[^\n]*\)\s*$/gim, '').replace(/^\s*\([^)\n]*template footer[^)\n]*\)\s*$/gim, '').replace(/^\s*\*Note:[^\n]*\*\s*$/gim, '').replace(/^\s*\(Note:[^\n]*\)\s*$/gim, '').trim();
  };
  const subjects = []; const si = part.findIndex(l => /^\*\*Subject options\*\*/i.test(l.trim()));
  if (si >= 0) for (let j = si + 1; j < part.length; j++) { const m = part[j].match(/^\s*\d+\.\s+(.+?)\s*(\(\d+ words?\))?\s*$/); if (m) subjects.push(m[1].trim()); else if (part[j].trim() && subjects.length) break; else if (/^\*\*/.test(part[j].trim())) break; }
  const attach = []; const ai = part.findIndex(l => /^\s*-\s*\*\*Attach:\*\*/.test(l));
  if (ai >= 0) for (let j = ai + 1; j < part.length; j++) { const m = part[j].match(/^\s{2,}-\s+(\S.*)$/); if (!m) break; const item = m[1].trim(); if (/^(do not|not the)\b/i.test(item) || !item.includes('/')) continue; attach.push(item); }
  return {handle: key(handle), to, subjects, email1: block(/^\*\*Email 1\b(?!\s+sign-off)/), followUp: block(/^\*\*Follow-up\b/), last: block(/^\*\*Last email\b/), attach};
}
/** "path/01.jpg to 08.jpg" -> the eight paths; a plain path -> itself. */
export function expandAttach(item) {
  const m = item.match(/^(.*\/)?(\d+)(\.\w+)\s+to\s+(\d+)\3$/);
  if (!m) return [item.split(/\s+\(/)[0].trim()];
  const out = []; for (let n = +m[2]; n <= +m[4]; n++) out.push(`${m[1] || ''}${String(n).padStart(m[2].length, '0')}${m[3]}`);
  return out;
}
/** A clear attachment name: carousel slides keep their carousel's folder ("A-what-went-wrong-01.jpg"), so the
 * creator does not get two files called 01.jpg. */
export function attachmentName(path) {
  const m = String(path).match(/carousel\/([^/]+)\/([^/]+)$/);
  return m ? `${m[1]}-${m[2]}` : basename(path);
}
/** Why a text must not go out as Dan's draft, or '' if it is fine. */
export function notDanReason(text) {
  if (/\bTavin\b/.test(text)) return 'it still says "Tavin" (all creator emails come from Dan)';
  if (/hello@blueonehundred\.com/i.test(text)) return 'it names hello@blueonehundred.com (creator emails use dan@)';
  if (!/\bDan\b/.test(text)) return 'it is not signed "Dan"';
  return '';
}

export class OutreachMail {
  constructor({gmail, teamRoot, teamFolder, log, directory, now = Date.now}) {
    Object.assign(this, {gmail, teamRoot, teamFolder, log, directory, now}); this.state = {creators: {}, seen: {}, lastWatch: 0}; this.busy = false;
  }
  file() { return join(this.directory, 'outreach-mail.json'); }
  async init() { try { const d = JSON.parse(await readFile(this.file(), 'utf8')); if (d && typeof d === 'object') this.state = {creators: {}, seen: {}, lastWatch: 0, ...d}; } catch {} return this; }
  async save() { await mkdir(this.directory, {recursive: true}); const tmp = this.file() + '.' + randomUUID(); await writeFile(tmp, JSON.stringify(this.state, null, 1)); await rename(tmp, this.file()); }
  connected() { return this.gmail?.status().connected; }
  from() { const s = this.gmail.sendAsFor(OUTREACH_FROM.email); return {header: `${s?.name || OUTREACH_FROM.name} <${OUTREACH_FROM.email}>`, signature: s?.signature || '', found: Boolean(s)}; }
  async runLine(what, problems = 'none') { const t = stamp(this.now()); await this.teamFolder.append(`board/runs-${t.slice(0, 10)}.md`, `${t.slice(11)} | Gmail | done: ${what} | cost: $0.00 | problems: ${problems}\n`).catch(() => {}); }
  async newestEntry(handle) {
    let names = []; try { names = (await readdir(join(this.teamRoot, 'outreach'))).filter(n => /^send-sheet-\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().reverse(); } catch { return null; }
    for (const n of names) { const e = parseSendSheetEntry(await readFile(join(this.teamRoot, 'outreach', n), 'utf8').catch(() => ''), handle); if (e) return {...e, sheet: 'outreach/' + n}; }
    return null;
  }

  /** Make the pitch draft for one approved creator. Returns {ok, why?, draftId?}. Never twice for the same creator. */
  async draftPitch(handle) {
    handle = key(handle); const c = this.state.creators[handle] || {};
    if (c.draftId && await this.gmail.draftExists(c.draftId)) return {ok: true, already: true, draftId: c.draftId};
    if (c.sentAt) return {ok: false, why: 'she is already marked as sent'};
    const e = await this.newestEntry(handle);
    if (!e) return {ok: false, why: 'no send sheet has an entry for her'};
    if (!e.to) return {ok: false, why: `${e.sheet} has no **To:** address for her`};
    if (!e.email1) return {ok: false, why: `${e.sheet} has no Email 1 for her`};
    const bad = notDanReason(e.email1); if (bad) return {ok: false, why: `Email 1 in ${e.sheet} is not ready: ${bad}. Outreach Writer rewrites it as Dan.`};
    const from = this.from(); if (!from.found) return {ok: false, why: 'Gmail has no "send mail as" entry for dan@blueonehundred.com'};
    const page = await readFile(join(this.teamRoot, 'pipeline', handle, 'sample-page.md'), 'utf8').catch(() => '');
    const pageUrl = (page.match(/^- Link:\s*(https:\/\/\S+)/m) || [])[1] || '';
    if (!pageUrl) return {ok: false, why: `her private sample page is not made yet (pipeline/${handle}/sample-page.md): the app makes it after approval; Toby can run sample_page`};
    if (!/^- Live when checked: yes/m.test(page)) return {ok: false, why: `her sample page ${pageUrl} is not live yet; Toby can run sample_page again`};
    if (!e.email1.includes(pageUrl)) return {ok: false, why: `Email 1 in ${e.sheet} does not carry her sample page link ${pageUrl}. Outreach Writer rewrites it (one link: the page).`};
    const attachments = [];
    if (!from.signature.trim()) return {ok: false, why: 'dan@blueonehundred.com has no Gmail signature yet (it carries the business contact details under every email). Add it in Gmail: Settings > General > Signature, for dan@'};
    const subject = e.subjects[0] || 'A book we made for you';
    const d = await this.gmail.createDraft({from: from.header, to: e.to, subject, text: e.email1, signature: from.signature, attachments});   // build 50: always none
    this.state.creators[handle] = {...c, blockedWhy: undefined, blockedAt: undefined, to: e.to, subject, sheet: e.sheet, draftId: d.draftId, draftMessageId: d.messageId, threadId: d.threadId, draftedAt: this.now()};
    await this.save(); await this.runLine(`Gmail draft for @${handle} from ${OUTREACH_FROM.email} ("${subject}", no attachments, her page ${pageUrl}, ${e.sheet}); nothing sent`);
    return {ok: true, draftId: d.draftId, attachments: 0, page: pageUrl, subject};
  }

  /** Every approved email creator without a draft gets one (the first run after approval, or after connecting). */
  async draftApproved() {
    const rows = await this.log.read(), out = [];
    if (this.gmail.refreshSendAs && this.now() - (this.lastSendAs || 0) > 300000) { this.lastSendAs = this.now(); await this.gmail.refreshSendAs().catch(() => {}); }
    for (const r of rows) {
      if (r.stage !== 'Approved' || !/email/i.test(r.contact_route || '')) continue;
      const c = this.state.creators[key(r.handle)] || {};
      if (c.draftId || c.sentAt) continue;
      if (c.blockedWhy && this.now() - (c.blockedAt || 0) < 3600000) continue;   // a blocked draft is tried again hourly
      const res = await this.draftPitch(r.handle).catch(e => ({ok: false, why: e.message}));
      if (!res.ok) { this.state.creators[key(r.handle)] = {...(this.state.creators[key(r.handle)] || {}), blockedWhy: res.why, blockedAt: this.now()}; await this.save(); }
      out.push({handle: r.handle, ...res});
    }
    return out;
  }

  /** Sent folder and inbox: who was sent to, who replied. Then the day-3 and day-10 drafts. */
  async watch() {
    const rows = await this.log.read();
    const byEmail = new Map(rows.filter(r => emailIn(r.contact)).map(r => [emailIn(r.contact), r]));
    for (const c of Object.entries(this.state.creators)) if (c[1].to && !byEmail.has(c[1].to)) { const r = rows.find(x => key(x.handle) === c[0]); if (r) byEmail.set(c[1].to, r); }
    const sent = await this.gmail.search(`in:sent from:${OUTREACH_FROM.email} newer_than:30d`, 50);
    for (const m of sent.reverse()) {
      if (this.state.seen[m.id]) continue; this.state.seen[m.id] = this.now();
      const r = byEmail.get(emailIn(m.to)); if (!r) continue;
      const h = key(r.handle), c = this.state.creators[h] || {};
      if (!c.sentAt) {
        this.state.creators[h] = {...c, sentAt: m.at || this.now(), threadId: m.threadId, sentMessageId: m.messageId, draftId: undefined};
        if (['Approved', 'Pitch draft'].includes(r.stage)) await this.log.setByTavin(h, 'Sent', `Gmail: sent from ${OUTREACH_FROM.email}, "${m.subject}"`).catch(() => {});
        await this.runLine(`@${h} marked Sent from Gmail (email from ${OUTREACH_FROM.email}, "${m.subject}")`);
      } else if (c.followUpDraftId && !c.followUpSentAt && m.threadId === c.threadId) { c.followUpSentAt = m.at; this.state.creators[h] = c; }
      else if (c.lastDraftId && !c.lastSentAt && m.threadId === c.threadId) { c.lastSentAt = m.at; this.state.creators[h] = c; }
    }
    const inbox = await this.gmail.search(`in:inbox to:${OUTREACH_FROM.email} newer_than:30d`, 50);
    for (const m of inbox.reverse()) {
      if (this.state.seen[m.id]) continue; this.state.seen[m.id] = this.now();
      const r = byEmail.get(emailIn(m.from)); if (!r) continue;
      const h = key(r.handle), c = this.state.creators[h] || {};
      if (!c.repliedAt) {
        this.state.creators[h] = {...c, repliedAt: m.at || this.now(), threadId: c.threadId || m.threadId};
        if (['Sent', 'Approved'].includes(r.stage)) await this.log.setByTavin(h, 'Replied', `Gmail: reply "${m.subject}"`).catch(() => {});
        const t = stamp(m.at || this.now());
        await this.teamFolder.append(`outreach/replies-${t.slice(0, 7)}.md`, `${t} | @${h} | ${m.subject.replace(/\|/g, '/')} | ${m.snippet.replace(/[|\n]/g, ' ').slice(0, 240)}\n`).catch(() => {});
        await this.runLine(`@${h} replied (Gmail, "${m.subject}"); listed in outreach/replies-${t.slice(0, 7)}.md for Tavin`);
      }
    }
    // Follow-ups: day 3 and day 10 after Email 1, only with no reply of any kind.
    for (const [h, c] of Object.entries(this.state.creators)) {
      if (!c.sentAt || c.repliedAt || !c.threadId) continue;
      const age = this.now() - c.sentAt, which = !c.followUpDraftId && age >= 3 * DAY ? 'followUp' : c.followUpDraftId && !c.lastDraftId && age >= 10 * DAY ? 'last' : '';
      if (!which) continue;
      const e = await this.newestEntry(h); const text = e?.[which];
      if (!text) { c[which + 'Why'] = 'no text in the send sheet'; continue; }
      if (notDanReason(text)) { c[which + 'Why'] = notDanReason(text); continue; }
      const from = this.from();
      const d = await this.gmail.createDraft({from: from.header, to: c.to, subject: 'Re: ' + (c.subject || ''), text, signature: from.signature, threadId: c.threadId, inReplyTo: c.sentMessageId || ''});
      c[which === 'followUp' ? 'followUpDraftId' : 'lastDraftId'] = d.draftId; this.state.creators[h] = c;
      await this.runLine(`Gmail: ${which === 'followUp' ? 'day-3 follow-up' : 'day-10 last email'} drafted for @${h} in the same thread; nothing sent`);
    }
    const keep = Object.entries(this.state.seen).filter(([, t]) => this.now() - t < 40 * DAY); this.state.seen = Object.fromEntries(keep);
    this.state.lastWatch = this.now(); await this.save();
  }

  /** Called from the package-run timer (every 5 s): drafts at most every minute, the mailbox every 5 minutes. */
  async tick() {
    if (this.busy || !this.connected()) return; this.busy = true;
    try {
      if (this.now() - (this.lastDraftPass || 0) > 60000) { this.lastDraftPass = this.now(); await this.draftApproved().catch(() => {}); }
      if (this.now() - (this.state.lastWatch || 0) > 300000) await this.watch().catch(async e => { this.state.lastWatch = this.now(); await this.runLine('Gmail check', e.message.slice(0, 200)); });
    } finally { this.busy = false; }
  }
  /** For Toby and the dashboard. */
  summary() {
    return Object.entries(this.state.creators).map(([h, c]) => ({handle: h, to: c.to || '', drafted: Boolean(c.draftId), blocked: c.blockedWhy || '', sentAt: c.sentAt ? stamp(c.sentAt) : '', repliedAt: c.repliedAt ? stamp(c.repliedAt) : '', followUp: c.followUpDraftId ? 'drafted' : '', last: c.lastDraftId ? 'drafted' : ''}));
  }
}
