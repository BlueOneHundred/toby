// Toby build 48: a direct Gmail connection (no third party). Toby can make drafts and read mail; it can NEVER send.
// There is deliberately no send function in this file (test/toby-build48.test.mjs checks that no ".../send"
// address appears here): Tavin opens each draft in Gmail and presses Send himself.
// Sign-in: Google's flow for desktop apps (a one-off browser sign-in, answered on 127.0.0.1, with PKCE). The client
// key file comes from Tavin's own Google Cloud project ("Toby", Internal), and the refresh token is kept encrypted.
import {createServer} from 'node:http';
import {randomBytes, createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {steadyRename} from './storage-safety.mjs';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.readonly'];
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth', TOKEN = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me', UPLOAD = 'https://gmail.googleapis.com/upload/gmail/v1/users/me';
const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** The client key file Google lets you download for a "Desktop app" OAuth client. */
export function parseClientFile(text) {
  let data; try { data = JSON.parse(String(text)); } catch { throw new Error('That file is not the Google key file (it does not read as JSON).'); }
  const c = data.installed || data.web;
  if (!c || !c.client_id || !c.client_secret) throw new Error('That file has no client ID and secret. Download the JSON of the "Toby desktop" OAuth client in Google Cloud.');
  if (!data.installed) throw new Error('That key is not a "Desktop app" client. Create an OAuth client of type Desktop app.');
  if (!/\.apps\.googleusercontent\.com$/.test(c.client_id)) throw new Error('That client ID is not a Google one.');
  return {client_id: c.client_id, client_secret: c.client_secret, project_id: c.project_id || ''};
}

// RFC 2047 for a header with non-ASCII text (subjects with a curly apostrophe, names).
const header = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;
const wrap76 = s => s.replace(/(.{76})/g, '$1\r\n');
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export function textToHtml(text) {
  return String(text).trim().split(/\n{2,}/).map(p => `<p>${escHtml(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join('\n');
}
/** One email as RFC 822 text: plain and HTML bodies (the HTML one carries the Gmail signature), attachments. */
export function buildMime({from, to, subject, text, html = '', attachments = [], inReplyTo = '', boundary = randomUUID().replace(/-/g, '')}) {
  if (!from || !to) throw new Error('An email needs From and To.');
  const head = [`From: ${from}`, `To: ${to}`, `Subject: ${header(subject || '')}`, 'MIME-Version: 1.0'];
  if (inReplyTo) head.push(`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`);
  const alt = 'alt' + boundary, mixed = 'mix' + boundary;
  const body = [`--${alt}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(Buffer.from(text, 'utf8').toString('base64')),
    `--${alt}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrap76(Buffer.from(`<div dir="ltr">${html || textToHtml(text)}</div>`, 'utf8').toString('base64')), `--${alt}--`];
  if (!attachments.length) return [...head, `Content-Type: multipart/alternative; boundary="${alt}"`, '', ...body, ''].join('\r\n');
  const parts = [`--${mixed}`, `Content-Type: multipart/alternative; boundary="${alt}"`, '', ...body];
  for (const a of attachments) parts.push(`--${mixed}`, `Content-Type: ${a.type || 'application/octet-stream'}; name="${a.name}"`, `Content-Disposition: attachment; filename="${a.name}"`, 'Content-Transfer-Encoding: base64', '', wrap76(Buffer.from(a.bytes).toString('base64')));
  parts.push(`--${mixed}--`);
  return [...head, `Content-Type: multipart/mixed; boundary="${mixed}"`, '', ...parts, ''].join('\r\n');
}

export class Gmail {
  constructor({directory, encrypt, decrypt, openExternal = async () => {}, request = fetch, now = Date.now, listen = createServer}) {
    Object.assign(this, {directory, encrypt, decrypt, openExternal, request, now, listen}); this.value = {}; this.token = null; this.pending = null;
  }
  file() { return join(this.directory, 'gmail.secure'); }
  async init() { try { this.value = JSON.parse(await this.decrypt(await readFile(this.file()))); } catch (e) { if (e.code !== 'ENOENT') this.value = {}; } return this; }
  async save() { await mkdir(this.directory, {recursive: true}); const tmp = join(this.directory, `.gmail-${randomUUID()}`); await writeFile(tmp, await this.encrypt(JSON.stringify(this.value)), {mode: 0o600}); await steadyRename(tmp, this.file()); }
  status() { return {connected: Boolean(this.value.refresh_token), account: this.value.account || '', sendAs: this.value.sendAs || [], connectedAt: this.value.connectedAt || null, signingIn: Boolean(this.pending)}; }
  async disconnect() { this.value = {}; this.token = null; await rm(this.file(), {force: true}); return this.status(); }

  /** The one-off sign-in. clientText: the key file's text. Resolves when Google sends the browser back to Toby. */
  async connect(clientText, {loginHint = '', timeoutMs = 600000} = {}) {
    const client = parseClientFile(clientText);
    if (this.pending) throw new Error('A Gmail sign-in is already open in your browser. Finish it or wait for it to time out.');
    const verifier = b64url(randomBytes(48)), challenge = b64url(createHash('sha256').update(verifier).digest()), state = b64url(randomBytes(16));
    let server;
    const code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { server?.close(); reject(new Error('The Gmail sign-in timed out. Press Connect Gmail again.')); }, timeoutMs); timer.unref?.();
      server = this.listen((req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname !== '/') { res.writeHead(404); res.end(); return; }
        const ok = url.searchParams.get('state') === state && url.searchParams.get('code');
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(`<!doctype html><meta charset="utf-8"><title>Toby</title><body style="font-family:system-ui;padding:40px"><h1>${ok ? 'Gmail is connected to Toby.' : 'Gmail was not connected.'}</h1><p>You can close this tab and go back to Toby.</p></body>`);
        clearTimeout(timer); server.close();
        if (ok) resolve(url.searchParams.get('code')); else reject(new Error(url.searchParams.get('error') === 'access_denied' ? 'Gmail access was not allowed.' : 'The Gmail sign-in did not come back correctly. Try again.'));
      });
      server.listen(0, '127.0.0.1', () => {
        this.redirect = `http://127.0.0.1:${server.address().port}`;
        const q = new URLSearchParams({client_id: client.client_id, redirect_uri: this.redirect, response_type: 'code', scope: GMAIL_SCOPES.join(' '), access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256', state, ...(loginHint ? {login_hint: loginHint} : {})});
        this.pending = {startedAt: this.now()};
        Promise.resolve(this.openExternal(`${AUTH}?${q}`)).catch(reject);
      });
      server.on('error', reject);
    }).finally(() => { this.pending = null; });
    const tokens = await this.tokenCall({client_id: client.client_id, client_secret: client.client_secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: this.redirect});
    if (!tokens.refresh_token) throw new Error('Google did not give Toby a lasting sign-in. Remove Toby in your Google account\'s third-party access, then connect again.');
    this.value = {client, refresh_token: tokens.refresh_token, connectedAt: this.now()};
    this.token = {access: tokens.access_token, expires: this.now() + (tokens.expires_in || 3000) * 1000};
    const profile = await this.api('GET', '/profile'); this.value.account = profile.emailAddress || '';
    await this.refreshSendAs();
    await this.save(); return this.status();
  }
  async tokenCall(params) {
    const res = await this.request(TOKEN, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(params).toString()});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error === 'invalid_grant' ? 'Gmail sign-in has expired or was removed. Connect Gmail again in Settings > Connections.' : `Google refused the sign-in (${data.error || res.status}).`);
    return data;
  }
  async accessToken() {
    if (!this.value.refresh_token) throw new Error('Gmail is not connected. Settings > Connections > Connect Gmail.');
    if (this.token && this.token.expires - 60000 > this.now()) return this.token.access;
    const t = await this.tokenCall({client_id: this.value.client.client_id, client_secret: this.value.client.client_secret, refresh_token: this.value.refresh_token, grant_type: 'refresh_token'});
    this.token = {access: t.access_token, expires: this.now() + (t.expires_in || 3000) * 1000}; return this.token.access;
  }
  async api(method, path, body, {upload = false, contentType = 'application/json'} = {}) {
    const res = await this.request((upload ? UPLOAD : API) + path, {method, headers: {Authorization: `Bearer ${await this.accessToken()}`, ...(body !== undefined ? {'Content-Type': contentType} : {})}, ...(body !== undefined ? {body: contentType === 'application/json' ? JSON.stringify(body) : body} : {})});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Gmail said ${res.status}: ${data.error?.message || 'no reason given'}`);
    return data;
  }
  async refreshSendAs() {
    const list = await this.api('GET', '/settings/sendAs').catch(() => ({sendAs: []}));
    this.value.sendAs = (list.sendAs || []).map(s => ({email: s.sendAsEmail, name: s.displayName || '', signature: s.signature || '', verified: s.verificationStatus ? s.verificationStatus === 'accepted' : true}));
    return this.value.sendAs;
  }
  sendAsFor(email) { return (this.value.sendAs || []).find(s => s.email.toLowerCase() === String(email).toLowerCase()) || null; }

  /** A draft (never sent). With attachments it goes through Gmail's upload address (up to 35 MB). */
  async createDraft({from, to, subject, text, signature = '', attachments = [], threadId = '', inReplyTo = ''}) {
    const html = textToHtml(text) + (signature ? `<br><div class="gmail_signature">${signature}</div>` : '');
    const mime = buildMime({from, to, subject, text, html, attachments, inReplyTo});
    let draft;
    if (attachments.length && !threadId) draft = await this.api('POST', '/drafts?uploadType=media', mime, {upload: true, contentType: 'message/rfc822'});
    else draft = await this.api('POST', '/drafts', {message: {raw: b64url(Buffer.from(mime, 'utf8')), ...(threadId ? {threadId} : {})}});
    return {draftId: draft.id, messageId: draft.message?.id || '', threadId: draft.message?.threadId || threadId};
  }
  async draftExists(draftId) { try { await this.api('GET', `/drafts/${encodeURIComponent(draftId)}?format=minimal`); return true; } catch { return false; } }
  /** Messages matching a Gmail search, newest first, with the headers Toby needs. */
  async search(q, max = 50) {
    const list = await this.api('GET', `/messages?${new URLSearchParams({q, maxResults: String(max)})}`);
    const out = [];
    for (const m of list.messages || []) {
      const full = await this.api('GET', `/messages/${m.id}?${new URLSearchParams([['format', 'metadata'], ['metadataHeaders', 'From'], ['metadataHeaders', 'To'], ['metadataHeaders', 'Subject'], ['metadataHeaders', 'Message-ID']])}`);
      const h = name => (full.payload?.headers || []).find(x => x.name.toLowerCase() === name.toLowerCase())?.value || '';
      out.push({id: m.id, threadId: full.threadId, at: Number(full.internalDate || 0), from: h('From'), to: h('To'), subject: h('Subject'), messageId: h('Message-ID'), snippet: full.snippet || '', labels: full.labelIds || []});
    }
    return out;
  }
}
