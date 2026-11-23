// Toby build 50 (Tavin, 23 Nov 2026): one brown per carousel and a hard edge.
import test from 'node:test';
import assert from 'node:assert/strict';
import {slideHtml, carouselColours} from '../src/carousel-builder.mjs';
import {PALETTE_NAMES, contrast} from '../src/palettes.mjs';

const slide = type => ({type, image: 'p.jpg', kicker: 'Kick', title: 'Loaf came out **dense**?', body: 'Body words here.', label: '1', source: 'Source: X'});
test('build 50: every slide of both layouts uses the main colour, never the deep shade, and no fade', () => {
  for (const name of PALETTE_NAMES) {
    const C = carouselColours(name);
    for (const layout of ['panel', 'card']) for (const type of ['cover', 'point', 'flag']) {
      const html = slideHtml({slide: slide(type), index: 2, total: 8, layout, paletteName: name, handle: '@x', images: {'p.jpg': 'data:image/jpeg;base64,AA'}});
      const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>')).replace(/@font-face\{[^}]*\}/g, '');
      const body = html.slice(html.indexOf('<body>'));
      assert.ok(!/gradient/.test(html), `${name} ${layout} ${type}: no fade`);
      for (const bg of [...(css + body).matchAll(/background:(#[0-9A-F]{6})/gi)].map(m => m[1].toUpperCase()))
        assert.notEqual(bg, C.deep.toUpperCase(), `${name} ${layout} ${type}: deep shade used as a background`);
    }
    assert.ok(contrast(C.card, C.main) >= 4.5, name + ' small cream words on main');
    assert.ok(contrast(C.accent, C.main) >= 3, name + ' big accent word on main');
  }
});
test('build 50: the panel photo ends on a hard line where the main panel starts', () => {
  const cover = slideHtml({slide: slide('cover'), index: 1, total: 8, layout: 'panel', paletteName: 'terracotta', handle: '@x', images: {'p.jpg': 'x'}});
  assert.match(cover, /height:760px;object-position/); assert.match(cover, /class="shade" style="top:760px;background:#9C4129"/);
  const point = slideHtml({slide: slide('point'), index: 2, total: 8, layout: 'panel', paletteName: 'terracotta', handle: '@x', images: {'p.jpg': 'x'}});
  assert.match(point, /height:720px;object-position/); assert.match(point, /class="shade" style="top:720px;background:#9C4129"/);
});

// ---- the private sample page (synthetic creator, no real data) ----
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {crc32} from 'node:zlib';
import {kitLink, parseAppCheck, appWords, parseBreakdown, parseCaptions, greetingName, zipStore, pageHtml, breakdownHtml, gatherKit, SamplePages, recordLink, OPEN_BUTTON} from '../src/sample-page.mjs';
import {publishFiles} from '../src/app-publisher.mjs';
import {TeamFolder} from '../src/team-folder.mjs';
import {checkEmailText, CAROUSEL_LINE, pageLinkFor} from '../src/package-check.mjs';

const APP = 'https://app.blueonehundred.com/bread-book-pipbakes-abcd2345/';
const APPCHECK = '# App check: Bread Book (@pipbakes)\n\n- Result: PASSED\n- Chapters: 12, plan days: 14, sources: 42, words: 15000\n- Trackers: tracker, planner, list\n- Palette: terracotta\n';
const BREAKDOWN = (uk) => `<html><head><style>h1{x}</style></head><body><header><h1>Bread Book</h1><p>A book and its own companion app, made for Pip (@pipbakes) by Blueprints</p></header>
<table><tr><th>Instagram followers</th><td>10,000</td></tr><tr><th>Country</th><td>${uk ? 'UK' : 'USA (Ohio)'}</td></tr><tr><th>Date checked</th><td>2026-01-10</td></tr></table>
<h2>Two more ideas from your themes</h2><ol><li><b>Idea One:</b> first idea.</li><li><b>Idea Two:</b> second idea.</li></ol>
<table><tr><td>Buyers (10,000 followers x 0.1%, 0.25%, 0.5%, rounded down)</td><td>10</td><td>25</td><td>50</td></tr>
<tr><td>Sales (buyers x $47)</td><td>$470</td><td>$1,175</td><td>$2,350</td></tr>${uk ? '<tr><td>&nbsp;&nbsp;in pounds (£36 a sale)</td><td>(£358)</td><td>(£895)</td><td>(£1,790)</td></tr>' : ''}
<tr><td>Less estimated fees (6% plus $0.30 a sale)</td><td>$31</td><td>$78</td><td>$156</td></tr>${uk ? '<tr><td>&nbsp;&nbsp;in pounds (6% plus £0.23 a sale)</td><td>(£24)</td><td>(£59)</td><td>(£119)</td></tr>' : ''}
<tr><td>Left after fees</td><td>$439</td><td>$1,097</td><td>$2,194</td></tr>${uk ? '<tr><td>&nbsp;&nbsp;in pounds</td><td>(£334)</td><td>(£836)</td><td>(£1,671)</td></tr>' : ''}
<tr><td>Your 60%</td><td>$263</td><td>$658</td><td>$1,316</td></tr>${uk ? '<tr><td>&nbsp;&nbsp;in pounds</td><td>(£201)</td><td>(£501)</td><td>(£1,003)</td></tr>' : ''}</table><p>Estimate, not a forecast.</p></body></html>`;
const CAPTIONS = '# Captions\n\n## Captions for Pip\n\n### Carousel A: Dense loaf? (8 slides)\n\nPaid partnership. Quick note: I earn from each sale of this.\n\nDense loaf? Check these\n\nLine three.\n\n---\nBefore posting: turn on Instagram\'s "Paid partnership" label.\n\n### Carousel B: Sticky dough?\n\nPaid partnership.\n\nSticky dough caption.\n\n---\n\n## Notes (internal)\n\nNot for Pip.\n';

test('build 50 page: links, app check, app words, captions, greeting', () => {
  assert.deepEqual(kitLink(APP), {url: APP + 'kit/', folder: 'bread-book-pipbakes-abcd2345/kit', appFolder: 'bread-book-pipbakes-abcd2345', site: 'https://app.blueonehundred.com'});
  assert.equal(pageLinkFor(APP), APP + 'kit/'); assert.equal(kitLink('not a link'), null);
  const a = parseAppCheck(APPCHECK); assert.deepEqual([a.title, a.chapters, a.planDays, a.sources, a.palette, a.passed], ['Bread Book', 12, 14, 42, 'terracotta', true]);
  assert.equal(appWords(a), 'the 14-day plan, trackers, a planner and lists');
  assert.equal(appWords({planDays: 0, trackers: ['progress', 'list'], project: true}), 'a progress tracker for every project and lists');
  assert.equal(appWords({planDays: 30, trackers: ['social', 'potty', 'list']}, false), 'the 30-day plan, trackers, a socialising checklist and lists');
  const c = parseCaptions(CAPTIONS); assert.equal(c.length, 2); assert.equal(c[0].letter, 'A'); assert.equal(c[0].title, 'Dense loaf?');
  assert.match(c[0].note, /^Before posting/); assert.ok(!c[1].caption.includes('Not for Pip'), 'internal notes stay off the page');
  assert.equal(greetingName('Hi Pip,\n\nText'), 'Pip'); assert.equal(greetingName('Hello'), '');
});

test('build 50 page: the breakdown numbers match the checked breakdown, with pounds for UK creators', () => {
  const us = parseBreakdown(BREAKDOWN(false));
  assert.deepEqual([us.followers, us.price, us.buyers, us.share, us.gbp], [10000, 47, [10, 25, 50], [263, 658, 1316], null]);
  assert.deepEqual(us.ideas, ['Idea One: first idea.', 'Idea Two: second idea.']); assert.equal(us.checked, '2026-01-10');
  const uk = parseBreakdown(BREAKDOWN(true)); assert.equal(uk.gbp.price, 36); assert.deepEqual(uk.gbp.share, [201, 501, 1003]);
  // Rounded only at the end (a real case: $13,296, not $13,295).
  const real = parseBreakdown(BREAKDOWN(false).replace('10,000 followers', '202,263 followers').replace('$47)', '$47)'));
  assert.deepEqual(real.share, [5318, 13296, 26618]);
});

test('build 50 page: zip is a valid stored zip', () => {
  const files = [{name: 'a-01.jpg', bytes: Buffer.from('hello')}, {name: 'a-02.jpg', bytes: Buffer.from('world!')}];
  const z = zipStore(files);
  assert.equal(z.readUInt32LE(0), 0x04034b50); assert.equal(z.readUInt32LE(14), crc32(Buffer.from('hello')) >>> 0);
  const end = z.length - 22; assert.equal(z.readUInt32LE(end), 0x06054b50); assert.equal(z.readUInt16LE(end + 10), 2);
  const cd = z.readUInt32LE(end + 16); assert.equal(z.readUInt32LE(cd), 0x02014b50); assert.equal(z.readUInt32LE(cd + 42), 0);
});

async function fixture(uk = false) {
  const root = await mkdtemp(join(tmpdir(), 'toby50-')), ed = join(root, 'ebooks/b/editions/pipbakes');
  for (const d of ['app', 'carousel/A-dense', 'carousel/B-sticky', 'outreach', 'board', 'pipeline/pipbakes', 'creators/voice']) await mkdir(d.startsWith('outreach') || d.startsWith('board') || d.startsWith('pipeline') || d.startsWith('creators') ? join(root, d) : join(ed, d), {recursive: true});
  await writeFile(join(ed, 'app/app-link.md'), `# App link\n\n- Link: ${APP}\n- Folder: bread-book-pipbakes-abcd2345\n`);
  await writeFile(join(ed, 'app/app-check.md'), APPCHECK); await writeFile(join(ed, 'app.json'), '{"subtitle":"From Flour to Loaf"}');
  await writeFile(join(ed, 'carousel/captions.md'), CAPTIONS); await writeFile(join(ed, 'book.html'), '<section class="cover">x</section>');
  for (const c of ['A-dense', 'B-sticky']) { await writeFile(join(ed, 'carousel', c, 'slides.json'), '{"title":"T","palette":"terracotta","slides":[]}'); await writeFile(join(ed, 'carousel', c, 'carousel-check.md'), '- Result: PASSED\n'); for (let i = 1; i <= 8; i++) await writeFile(join(ed, 'carousel', c, `0${i}.jpg`), 'jpg' + i); }
  await writeFile(join(root, 'outreach/breakdown-pipbakes.html'), BREAKDOWN(uk));
  await writeFile(join(root, 'outreach/send-sheet-2026-01-12.md'), `# Sheet\n\n### @pipbakes\n- **To:** pip@example.com\n\n**Email 1**\n\nHi Pip,\n\nText\n\nDan\n`);
  await writeFile(join(root, 'creators/voice/pipbakes.md'), uk ? 'Based in UK' : 'Based in Ohio, USA');
  return root;
}

test('build 50 page: the page has her book, the button, both carousels, the earnings, no tracking and no outside requests', async () => {
  const root = await fixture();
  try {
    const g = await gatherKit(root, {handle: 'pipbakes', base: 'b'}); assert.ok(!g.problems, String(g.problems));
    const html = pageHtml(g.data);
    assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
    assert.ok(html.includes(`href="${APP}"`) && html.includes(OPEN_BUTTON));
    assert.match(html, /Made for @pipbakes by Dan at Blueprints/); assert.match(html, /Hi Pip\./);
    for (const f of ['A-01.jpg', 'A-08.jpg', 'B-08.jpg', 'carousel-A.zip', 'carousel-B.zip', 'breakdown.pdf', 'cover.jpg', 'fonts/outfit-400.woff2']) assert.ok(html.includes(f), f);
    assert.match(html, /If only 0\.1%, 0\.25% or 0\.5% of your 10,000 Instagram followers purchased your book \(with its companion app\) at \$47, this is your 60% after store fees\./);
    assert.match(html, /What your buyers get for \$47/); assert.match(html, /A high-quality ebook<\/b> in your voice: 12 chapters, built from 42 trusted sources/);
    assert.match(html, /Its own companion app<\/b>, made only for this book: the 14-day plan, trackers, a planner and lists/);
    assert.match(html, /Your colors and your fonts/); assert.match(html, /mailto:dan@blueonehundred\.com/);
    assert.ok(!html.includes('Not for Pip'));
    const urls = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map(m => m[1]);
    assert.deepEqual([...new Set(urls)].sort(), [APP, 'https://www.blueonehundred.com'].sort(), 'only her app and our website are linked; nothing is loaded from outside');
    assert.ok(!/google|analytics|gtag|pixel/i.test(html));
    const pdf = breakdownHtml(g.data); assert.match(pdf, /A high-quality ebook and its own companion app, made for Pip \(@pipbakes\)/); assert.match(pdf, /for the ebook with its companion app/);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('build 50 page: UK creators see pounds and UK spelling', async () => {
  const root = await fixture(true);
  try {
    const g = await gatherKit(root, {handle: 'pipbakes', base: 'b'}); const html = pageHtml(g.data);
    assert.match(html, /at \$47 \(£36\), this is your 60%/); assert.match(html, /\(£501\)/); assert.match(html, /Your colours and your fonts/);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('build 50 page: a carousel that has not passed, or missing files, stops the page and says why', async () => {
  const root = await fixture();
  try {
    await writeFile(join(root, 'ebooks/b/editions/pipbakes/carousel/A-dense/carousel-check.md'), '- Result: NEEDS FIXES\n');
    assert.match((await gatherKit(root, {handle: 'pipbakes', base: 'b'})).problems.join(), /A-dense has not passed/);
    await rm(join(root, 'outreach/breakdown-pipbakes.html'));
    assert.match((await gatherKit(root, {handle: 'pipbakes', base: 'b'})).problems.join(), /breakdown-pipbakes\.html/);
  } finally { await rm(root, {recursive: true, force: true}); }
});

function fakeGitHub(index) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null});
    const ok = body => ({status: 200, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0)});
    if (url.endsWith('/kit/')) return {status: 200, arrayBuffer: async () => index.bytes?.buffer.slice(index.bytes.byteOffset, index.bytes.byteOffset + index.bytes.length) || new ArrayBuffer(0)};
    if (url.endsWith('/repos/o/r')) return ok({default_branch: 'main'});
    if (url.includes('/git/ref/heads/main')) return ok({object: {sha: 'head'}});
    if (url.includes('/git/commits/head')) return ok({tree: {sha: 'tree0'}});
    if (url.endsWith('/git/blobs')) return {status: 201, json: async () => ({sha: 'b' + calls.length})};
    if (url.endsWith('/git/trees')) return {status: 201, json: async () => ({sha: 'tree1'})};
    if (url.endsWith('/git/commits')) return {status: 201, json: async () => ({sha: 'c1'})};
    if (url.includes('/git/refs/heads/main')) return ok({});
    return {status: 404, json: async () => ({})};
  };
  return {calls, fetchImpl};
}

test('build 50: the page is published in one commit next to her app, recorded, and not made again when nothing changed', async () => {
  const root = await fixture(), index = {};
  try {
    const gh = fakeGitHub(index), teamFolder = new TeamFolder(root);
    const pages = new SamplePages({teamRoot: root, teamFolder, publisher: () => ({owner: 'o', repo: 'r', token: 't', site: 'https://app.blueonehundred.com'}),
      renderPage: async () => ({jpeg: Buffer.from('cover')}), makePdf: async () => Buffer.from('%PDF-1.4'), fetchImpl: async (u, o) => { const r = await gh.fetchImpl(u, o); return r; }, wait: async () => {}});
    // The live check compares the page size: hand the fake site the index the publisher uploads.
    const realPublish = gh.fetchImpl; void realPublish;
    const res = await pages.make({handle: 'pipbakes', base: 'b'});
    assert.ok(res.ok, res.why);
    const blobs = gh.calls.filter(c => c.url.endsWith('/git/blobs')), tree = gh.calls.find(c => c.url.endsWith('/git/trees'));
    assert.equal(gh.calls.filter(c => c.url.includes('/git/refs/heads/main') && c.method === 'PATCH').length, 1, 'one commit');
    const paths = tree.body.tree.map(t => t.path);
    for (const p of ['index.html', 'cover.jpg', 'A-01.jpg', 'B-08.jpg', 'carousel-A.zip', 'carousel-B.zip', 'breakdown.pdf', 'fonts/outfit-400.woff2']) assert.ok(paths.includes('bread-book-pipbakes-abcd2345/kit/' + p), p);
    assert.equal(blobs.length, paths.length); assert.equal(tree.body.base_tree, 'tree0', 'nothing else in the site changes');
    const rec = await readFile(join(root, 'pipeline/pipbakes/sample-page.md'), 'utf8');
    assert.equal(recordLink(rec).url, APP + 'kit/'); assert.match(await readFile(join(root, 'pipeline/pipbakes/sample-breakdown.pdf'), 'utf8'), /%PDF/);
    // Not live in this fake (sizes differ): the next run tries again; once live and unchanged, nothing is published.
    await writeFile(join(root, 'pipeline/pipbakes/sample-page.md'), rec.replace(/- Live when checked: .*/, '- Live when checked: yes'));
    const before = gh.calls.length; const again = await pages.make({handle: 'pipbakes', base: 'b'});
    assert.ok(again.unchanged); assert.equal(gh.calls.length, before);
    // A remade slide makes the page again.
    await new Promise(r => setTimeout(r, 20)); await writeFile(join(root, 'ebooks/b/editions/pipbakes/carousel/A-dense/01.jpg'), 'new');
    const third = await pages.make({handle: 'pipbakes', base: 'b'}); assert.ok(third.ok && !third.unchanged);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('build 50: publishFiles refuses bad names and needs an index.html', async () => {
  const publisher = {owner: 'o', repo: 'r', token: 't', site: 'https://x.com'};
  await assert.rejects(publishFiles({publisher, folder: 'abc-defg/kit', files: [{path: '../x', bytes: Buffer.from('x')}]}), /Bad file name/);
  await assert.rejects(publishFiles({publisher, folder: 'abc-defg/kit', files: [{path: 'a.jpg', bytes: Buffer.from('x')}]}), /index\.html/);
  await assert.rejects(publishFiles({publisher, folder: '../etc', files: [{path: 'index.html', bytes: Buffer.from('x')}]}), /folder name/);
});

test('build 50: the package check wants the page link as the one link, no attachments, a short subject and never "PDF"', () => {
  const sheet = (body, attach = '- **Attach:** none', subject = 'A book for you') => `# S\n\n### @pipbakes\n${attach}\n\n**Subject options**\n1. ${subject}\n\n**Email 1**\n\n${body}\n\n**Follow-up**\n\nHi.\n`;
  const good = `Hi Pip,\n\nI'm Dan. Everything is on one private page:\n\n${APP}kit/\n\n${CAROUSEL_LINE}\n\nDan\nBlueprints by Blue One Hundred\nhttps://www.blueonehundred.com`;
  const run = (s) => { const r = {items: []}; checkEmailText(r, {sheet: s, handle: 'pipbakes', voice: '', appLink: APP, title: '', boxes: [], spelling: ''}); return r.items.filter(i => i.level === 'fail').map(i => i.message).join('\n'); };
  assert.equal(run(sheet(good)), '');
  assert.match(run(sheet(good.replace(`${APP}kit/`, APP))), /private sample page link/);
  assert.match(run(sheet(good + `\n\nAlso ${APP}`)), /another link/);
  assert.match(run(sheet(good, '- **Attach:**\n  - outreach/breakdown-pipbakes.pdf')), /Attach:\*\* none/);
  assert.match(run(sheet(good.replace('Dan\nBlue', 'The attached breakdown is an estimate.\n\nDan\nBlue'))), /attachment/);
  assert.match(run(sheet(good.replace('Everything', 'A PDF and everything'))), /never "a PDF"/);
  assert.match(run(sheet(good, undefined, 'Your overproofed bagels, and a book we made for you')), /2 to 5 words/);
  assert.match(run(sheet(good.replace(CAROUSEL_LINE, "Here are 2 examples of what the launch carousels could look like."))), /carousel line/);
});
