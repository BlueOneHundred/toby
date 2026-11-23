import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Gmail, parseClientFile, buildMime, GMAIL_SCOPES} from '../src/gmail.mjs';
import {OutreachMail, parseSendSheetEntry, expandAttach, notDanReason, attachmentName} from '../src/outreach-mail.mjs';
import {CreatorLog, toCsv, COLUMNS} from '../src/creator-log.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {checkEmailText, CAROUSEL_LINE} from '../src/package-check.mjs';

// Made-up creators and addresses only: real ones never go into this public repository.
const here = dirname(fileURLToPath(import.meta.url));
const CLIENT = JSON.stringify({installed: {client_id: '123-abc.apps.googleusercontent.com', client_secret: 'made-up-secret', project_id: 'toby-test', redirect_uris: ['http://localhost']}});

test('build 48: Toby has no way to send mail, only to draft and read', async () => {
  const src = await readFile(join(here, '../src/gmail.mjs'), 'utf8') + await readFile(join(here, '../src/outreach-mail.mjs'), 'utf8');
  assert.ok(!/\/send\b|messages\/send|drafts\/send|auth\/gmail\.send/i.test(src.replace(/^\s*\/\/.*$/gm, '')), 'no send address or send scope in the Gmail code');
  assert.deepEqual(GMAIL_SCOPES, ['https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.readonly']);
});

test('build 48: the Google key file is checked before anything else', () => {
  assert.equal(parseClientFile(CLIENT).client_id, '123-abc.apps.googleusercontent.com');
  assert.throws(() => parseClientFile('{nope'), /does not read as JSON/);
  assert.throws(() => parseClientFile(JSON.stringify({web: {client_id: 'x.apps.googleusercontent.com', client_secret: 's'}})), /Desktop app/);
});

test('build 48: a draft email has Dan as sender, an encoded subject, both bodies and the attachments', () => {
  const mime = buildMime({from: 'Dan <dan@blueonehundred.com>', to: 'pip@example.com', subject: 'your book’s here', text: 'Hi Pip,\n\nLink https://example.com/x\n\nDan', attachments: [{name: 'a.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF')}], boundary: 'B'});
  assert.match(mime, /^From: Dan <dan@blueonehundred\.com>\r\nTo: pip@example\.com\r\nSubject: =\?UTF-8\?B\?/);
  assert.match(mime, /multipart\/mixed; boundary="mixB"/);
  assert.match(mime, /text\/plain; charset=UTF-8/); assert.match(mime, /text\/html; charset=UTF-8/);
  assert.match(mime, /filename="a\.pdf"/);
});

const SHEET = (who) => `# Send sheet, 2026-01-12

## First emails

### @pipbakes (Pip Baker), real pitch, I9 step 8: email
- **To:** pip@example.com (public, in her bio)
- **From:** dan@blueonehundred.com
- **Attach:**
  - outreach/breakdown-pipbakes.pdf (1 page)
  - ebooks/b/editions/pipbakes/carousel/A-x/01.jpg to 02.jpg
  - Do not attach the sheet.jpg files or any reel.

**Subject options** (word counts checked)
1. your crusty loaf (3 words)
2. a book for you (4 words)

**Email 1 (about 60 words)**

Hi Pip,

I'm ${who}. Your page: https://app.blueonehundred.com/b-pip-abcd1234/kit/

${CAROUSEL_LINE}

${who}
Blueprints by Blue One Hundred
https://www.blueonehundred.com

Not interested? Reply 'no thanks' and I won't email you again.

(Tavin's own email template footer carries the business contact details, D3 answer 2026-11-18.)

**Follow-up (3 days after a real send, same thread; about 20 words)**

Hi Pip,

The book is still ready. No reply needed if it's a no.

${who}

**Last email (10 days after Email 1)**

Hi Pip,

I'll leave it here.

${who}

**Why this is safe to send**
- stuff
`;

test('build 48: a send sheet entry is read into the email Gmail gets', () => {
  const e = parseSendSheetEntry(SHEET('Dan'), '@PipBakes');
  assert.equal(e.to, 'pip@example.com');
  assert.deepEqual(e.subjects, ['your crusty loaf', 'a book for you']);
  assert.deepEqual(e.attach, ['outreach/breakdown-pipbakes.pdf (1 page)', 'ebooks/b/editions/pipbakes/carousel/A-x/01.jpg to 02.jpg']);
  assert.deepEqual(e.attach.flatMap(expandAttach), ['outreach/breakdown-pipbakes.pdf', 'ebooks/b/editions/pipbakes/carousel/A-x/01.jpg', 'ebooks/b/editions/pipbakes/carousel/A-x/02.jpg']);
  assert.ok(e.email1.startsWith('Hi Pip,') && e.email1.endsWith("won't email you again."), 'template note left out');
  assert.match(e.followUp, /still ready/); assert.match(e.last, /leave it here/);
  assert.equal(notDanReason(e.email1), '');
  assert.match(notDanReason(parseSendSheetEntry(SHEET('Tavin'), 'pipbakes').email1), /Tavin/);
});

test('build 48: the package check fails an email that is not from Dan', () => {
  const report = {items: []}, run = who => { const r = {items: []}; checkEmailText(r, {sheet: SHEET(who), handle: 'pipbakes', voice: '', appLink: '', title: '', boxes: [], spelling: ''}); return r.items.map(i => i.text || i.message || JSON.stringify(i)).join('\n'); };
  void report;
  assert.match(run('Tavin'), /every creator email is from Dan/);
  assert.doesNotMatch(run('Dan'), /from Dan|signed "Dan"/);
});

function fakeGmail() {
  const g = {drafts: [], sent: [], inbox: [],
    status: () => ({connected: true, account: 'hello@blueonehundred.com'}),
    sendAsFor: e => e === 'dan@blueonehundred.com' ? {email: e, name: 'Dan', signature: '<b>Blueprints</b>'} : null,
    async createDraft(d) { g.drafts.push(d); return {draftId: 'd' + g.drafts.length, messageId: 'm' + g.drafts.length, threadId: d.threadId || 't' + g.drafts.length}; },
    async draftExists(id) { return g.drafts.some((_, i) => 'd' + (i + 1) === id); },
    async search(q) { return q.startsWith('in:sent') ? g.sent : g.inbox; }};
  return g;
}

test('build 48: approved creators get a Gmail draft from Dan; Sent, replies and the day-3 follow-up are picked up', async () => {
  const root = await mkdtemp(join(tmpdir(), 'toby48-')), data = await mkdtemp(join(tmpdir(), 'toby48d-'));
  try {
    await mkdir(join(root, 'outreach'), {recursive: true}); await mkdir(join(root, 'creators'), {recursive: true}); await mkdir(join(root, 'board'), {recursive: true});
    await mkdir(join(root, 'ebooks/b/editions/pipbakes/carousel/A-x'), {recursive: true});
    for (const f of ['outreach/breakdown-pipbakes.pdf', 'ebooks/b/editions/pipbakes/carousel/A-x/01.jpg', 'ebooks/b/editions/pipbakes/carousel/A-x/02.jpg']) await writeFile(join(root, f), 'x');
    await writeFile(join(root, 'outreach/send-sheet-2026-01-12.md'), SHEET('Tavin'));
    const row = Object.fromEntries(COLUMNS.map(c => [c, ''])); Object.assign(row, {handle: 'pipbakes', contact_route: 'email', contact: 'pip@example.com', stage_no: '10', stage: 'Approved'});
    await writeFile(join(root, 'creators/creators-log.csv'), toCsv([row]));
    const clock = {now: Date.UTC(2026, 0, 12, 3)}, teamFolder = new TeamFolder(root), log = new CreatorLog({teamRoot: root, teamFolder, now: () => clock.now});
    const g = fakeGmail(), mail = await new OutreachMail({gmail: g, teamRoot: root, teamFolder, log, directory: data, now: () => clock.now}).init();

    let res = await mail.draftApproved();
    assert.equal(g.drafts.length, 0); assert.match(res[0].why, /still says "Tavin"/);

    await writeFile(join(root, 'outreach/send-sheet-2026-01-13.md'), SHEET('Dan'));
    clock.now += 2 * 3600000; res = await mail.draftApproved();
    assert.equal(g.drafts.length, 0); assert.match(res[0].why, /sample page is not made yet/, 'build 50: no draft before her page exists');
    await mkdir(join(root, 'pipeline/pipbakes'), {recursive: true});
    await writeFile(join(root, 'pipeline/pipbakes/sample-page.md'), '# Sample page: @pipbakes\n\n- Link: https://app.blueonehundred.com/b-pip-abcd1234/kit/\n- Live when checked: yes\n');
    clock.now += 2 * 3600000; res = await mail.draftApproved();
    assert.equal(g.drafts.length, 1, res[0]?.why); const d = g.drafts[0];
    assert.equal(d.from, 'Dan <dan@blueonehundred.com>'); assert.equal(d.to, 'pip@example.com'); assert.equal(d.subject, 'your crusty loaf');
    assert.equal(d.signature, '<b>Blueprints</b>'); assert.deepEqual(d.attachments, [], 'build 50: no attachments'); assert.match(d.text, /\/kit\//);
    assert.equal((await mail.draftApproved()).length, 0, 'never a second draft');

    g.sent.push({id: 's1', threadId: 't1', at: clock.now, from: 'Dan <dan@blueonehundred.com>', to: 'Pip <pip@example.com>', subject: 'your crusty loaf', messageId: '<m1@x>'});
    await mail.watch();
    let csv = await readFile(join(root, 'creators/creators-log.csv'), 'utf8'); assert.match(csv, /,Sent,/);
    assert.match(await readFile(join(root, 'outreach/sent-2026-01.md'), 'utf8'), /@pipbakes/);

    clock.now += 3 * 86400000 + 1000; await mail.watch();
    assert.equal(g.drafts.length, 2); assert.equal(g.drafts[1].threadId, 't1'); assert.equal(g.drafts[1].subject, 'Re: your crusty loaf'); assert.match(g.drafts[1].text, /still ready/);

    g.inbox.push({id: 'r1', threadId: 't1', at: clock.now, from: 'Pip Baker <pip@example.com>', to: 'dan@blueonehundred.com', subject: 'Re: your crusty loaf', snippet: 'Love it! Tell me more', messageId: '<r1@x>'});
    await mail.watch();
    csv = await readFile(join(root, 'creators/creators-log.csv'), 'utf8'); assert.match(csv, /,Replied,/);
    assert.match(await readFile(join(root, 'outreach/replies-2026-01.md'), 'utf8'), /@pipbakes \| Re: your crusty loaf \| Love it/);
    clock.now += 8 * 86400000; await mail.watch();
    assert.equal(g.drafts.length, 2, 'no last email after a reply');
  } finally { await rm(root, {recursive: true, force: true}); await rm(data, {recursive: true, force: true}); }
});

test('build 48: the one-off Google sign-in keeps a lasting sign-in, encrypted, and reads Dan\'s send-as', async () => {
  const data = await mkdtemp(join(tmpdir(), 'toby48g-'));
  try {
    const calls = [];
    const request = async (url, init = {}) => {
      calls.push(url);
      const json = body => ({ok: true, status: 200, json: async () => body});
      if (url.startsWith('https://oauth2.googleapis.com/token')) { const p = new URLSearchParams(init.body); assert.equal(p.get('code'), 'the-code'); assert.ok(p.get('code_verifier')); return json({access_token: 'at', refresh_token: 'rt', expires_in: 3600}); }
      if (url.endsWith('/profile')) return json({emailAddress: 'hello@blueonehundred.com'});
      if (url.endsWith('/settings/sendAs')) return json({sendAs: [{sendAsEmail: 'dan@blueonehundred.com', displayName: 'Dan', signature: 'sig'}]});
      return {ok: false, status: 404, json: async () => ({})};
    };
    const openExternal = async url => { const u = new URL(url); assert.equal(u.searchParams.get('code_challenge_method'), 'S256'); assert.match(u.searchParams.get('scope'), /gmail\.compose/);
      const back = new URL(u.searchParams.get('redirect_uri')); back.searchParams.set('code', 'the-code'); back.searchParams.set('state', u.searchParams.get('state')); await fetch(back); };
    const g = await new Gmail({directory: data, encrypt: async s => Buffer.from('E' + s), decrypt: async b => String(b).slice(1), openExternal, request}).init();
    const st = await g.connect(CLIENT, {loginHint: 'hello@blueonehundred.com'});
    assert.equal(st.connected, true); assert.equal(st.account, 'hello@blueonehundred.com'); assert.equal(g.sendAsFor('dan@blueonehundred.com').name, 'Dan');
    const saved = await readFile(join(data, 'gmail.secure'), 'utf8'); assert.ok(saved.startsWith('E') && saved.includes('"refresh_token":"rt"'));
    const again = await new Gmail({directory: data, encrypt: async s => s, decrypt: async b => String(b).slice(1), request}).init();
    assert.equal(again.status().connected, true);
    await g.disconnect(); assert.equal(g.status().connected, false);
  } finally { await rm(data, {recursive: true, force: true}); }
});

test('build 49: slides get their carousel in the file name, and no signature means no draft', async () => {
  assert.equal(attachmentName('ebooks/b/editions/x/carousel/B-like-a-baker/03.jpg'), 'B-like-a-baker-03.jpg');
  assert.equal(attachmentName('outreach/breakdown-x.pdf'), 'breakdown-x.pdf');
});
