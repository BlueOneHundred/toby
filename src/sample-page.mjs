// Toby build 50 (Tavin, 23 Nov 2026): one private page per creator, instead of email attachments.
// First emails with 17 attachments called 01.jpg look unprofessional and do not get through spam filters, so the
// app makes each approved creator a private page on our own domain, next to her app:
//   <app link>kit/   (for example https://app.blueonehundred.com/without-the-pressure-thesourdoughnerd-k4xa9h5j/kit/)
// It holds her book and a big "Open your book and app" button, her 2 launch carousels shown like Instagram (swipe,
// download, caption), what she could earn (from her checked breakdown, with a PDF made from the same numbers), how
// it works, and "Reply to Dan". Not listed anywhere, noindex, no tracking, no outside requests (fonts are files).
// The look was approved by Tavin as a mockup on 23 Nov 2026 (doc 85). Pure functions build the page; SamplePages
// reads the team folder, renders the cover and the PDF, and publishes everything in one commit.
import {readFile, readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {crc32} from 'node:zlib';
import {palette as paletteOf, PALETTE_NAMES} from './palettes.mjs';
import {publishFiles} from './app-publisher.mjs';
import {parseSendSheetEntry} from './outreach-mail.mjs';
import {spellingFor} from './package-check.mjs';
import {stamp} from './creator-log.mjs';

export const KIT = 'kit';
export const OPEN_BUTTON = 'Open your book and app';
const FONT_FILES = ['outfit-400', 'outfit-600', 'outfit-700', 'outfit-800', 'source-serif-400', 'source-serif-600'];
const FONT_DIR = new URL('./book-fonts/', import.meta.url);

export const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const key = h => String(h || '').replace(/^@/, '').trim().toLowerCase();
const num = s => Number(String(s).replace(/[^\d.]/g, ''));
const fmt = n => Math.round(n).toLocaleString('en-US');
const money = (n, sign = '$') => sign + fmt(n);

/** The kit page link for an app link: the app's own folder plus "kit/". */
export function kitLink(appLink) {
  const m = String(appLink || '').match(/^(https:\/\/[^/\s]+)\/([a-z0-9-]{4,60})\/?$/);
  return m ? {url: `${m[1]}/${m[2]}/${KIT}/`, folder: `${m[2]}/${KIT}`, appFolder: m[2], site: m[1]} : null;
}

/** app-check.md: title, chapters, plan days, sources, trackers, palette, book type. */
export function parseAppCheck(md) {
  const t = String(md || ''), n = re => { const m = t.match(re); return m ? Number(m[1]) : 0; };
  return {title: (t.match(/^# App check:\s*(.+?)\s*\(@[^)]+\)\s*$/m) || [])[1] || '', passed: /Result:\s*PASSED/.test(t),
    chapters: n(/Chapters:\s*(\d+)/), planDays: n(/plan days:\s*(\d+)/), sources: n(/sources:\s*(\d+)/),
    trackers: ((t.match(/^- Trackers:\s*(.+)$/m) || [])[1] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
    palette: ((t.match(/^- Palette:\s*(\w+)/m) || [])[1] || '').toLowerCase(), project: /Book type:\s*project/i.test(t)};
}

/** The app in a few plain words, from its trackers: "the 14-day plan, trackers, a planner and lists". */
export function appWords(app, us = true) {
  const parts = [];
  if (app.planDays > 0) parts.push(`the ${app.planDays}-day plan`);
  if (app.trackers.includes('progress') || app.project) parts.push('a progress tracker for every project');
  if (app.trackers.some(x => ['tracker', 'potty', 'social'].includes(x))) parts.push('trackers');
  if (app.trackers.includes('social')) parts.push(us ? 'a socializing checklist' : 'a socialising checklist');
  if (app.trackers.includes('planner')) parts.push('a planner');
  if (app.trackers.includes('list')) parts.push('lists');
  if (!parts.length) parts.push('every chapter, with its own tools');
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
}

/** The checked breakdown (outreach/breakdown-<handle>.html): followers, rates, price, and pounds rows for UK creators. */
export function parseBreakdown(html) {
  const t = String(html || '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
  const f = t.match(/Buyers \(([\d,]+) followers x ([\d.]+)%, ([\d.]+)%, ([\d.]+)%/i), price = t.match(/buyers x \$(\d+)/i);
  if (!f || !price) return null;
  const followers = num(f[1]), rates = f.slice(2, 5).map(Number), p = Number(price[1]);
  const buyers = rates.map(r => Math.floor(followers * r / 100)), sales = buyers.map(b => b * p);
  // Rounded only at the end, as the checked breakdown does (Brynn's Middle: $13,296, not $13,295).
  const exactFees = sales.map((s, i) => s * 0.06 + 0.3 * buyers[i]), fees = exactFees.map(Math.round);
  const left = sales.map((s, i) => Math.round(s - exactFees[i])), share = sales.map((s, i) => Math.round((s - exactFees[i]) * 0.6));
  const gbpPrice = t.match(/in pounds \(£(\d+) a sale\)/i);
  let gbp = null;
  if (gbpPrice) {
    const rows = [...t.matchAll(/in pounds(?: \([^)]*\))? \(£([\d,]+)\) \(£([\d,]+)\) \(£([\d,]+)\)/gi)].map(m => m.slice(1, 4).map(num));
    const fee = t.match(/6% plus £([\d.]+) a sale/i);
    if (rows.length >= 4) gbp = {price: Number(gbpPrice[1]), fee: fee ? Number(fee[1]) : null, sales: rows[0], fees: rows[1], left: rows[2], share: rows[3]};
  }
  const ideas = []; const ideaBlock = String(html).match(/Two more ideas[\s\S]*?<ol>([\s\S]*?)<\/ol>/i);
  if (ideaBlock) for (const li of ideaBlock[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)) ideas.push(li[1].replace(/<b>([\s\S]*?)<\/b>/i, '$1').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  return {followers, rates, price: p, buyers, sales, fees, left, share, gbp, ideas,
    country: ((t.match(/Country ([A-Za-z ,()]+?) Date checked/) || [])[1] || '').trim(), checked: (t.match(/Date checked (\d{4}-\d{2}-\d{2})/) || [])[1] || '',
    madeFor: ((t.match(/made for ([^@]*?)\s*\(?@/) || [])[1] || '').trim()};
}

/** Each "### Carousel X: title" caption in captions.md (creator part only), with its "Before posting" note. */
export function parseCaptions(md) {
  const text = String(md || '').replace(/\r\n/g, '\n'), a = text.search(/^##\s+Captions for\b/m), b = text.search(/^##\s+Notes\b/m);
  const mine = a < 0 ? text : text.slice(a, b > a ? b : undefined);
  return mine.split(/^###\s+/m).slice(1).map(block => {
    const lines = block.split('\n'), head = lines[0].trim(), m = head.match(/^Carousel\s+([A-Z])\s*:\s*(.+?)(?:\s*\(\d+ slides?\))?\s*$/i);
    const rest = lines.slice(1).join('\n'), cut = rest.search(/^---\s*$/m);
    const caption = (cut < 0 ? rest : rest.slice(0, cut)).trim(), after = cut < 0 ? '' : rest.slice(cut).replace(/^---\s*/, '').trim();
    return {letter: m ? m[1].toUpperCase() : '', title: m ? m[2].trim() : head, caption, note: (after.match(/^Before posting:.*$/m) || [''])[0].trim()};
  }).filter(c => c.caption);
}

/** "Hi Brynn," at the top of Email 1 gives her first name. */
export const greetingName = email1 => ((String(email1 || '').match(/^\s*Hi\s+([^,\n]{1,40}),/) || [])[1] || '').trim();

/** A plain zip (stored, not compressed: the slides are already JPEGs). */
export function zipStore(files) {
  const locals = [], centrals = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), crc = crc32(f.bytes) >>> 0, size = f.bytes.length;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0x00210000, 10); local.writeUInt32LE(crc, 14); local.writeUInt32LE(size, 18); local.writeUInt32LE(size, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0x00210000, 12); central.writeUInt32LE(crc, 16); central.writeUInt32LE(size, 20); central.writeUInt32LE(size, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, f.bytes); centrals.push(central, name); offset += 30 + name.length + size;
  }
  const dir = Buffer.concat(centrals), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

const ICON = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M19 19v2H6"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  down: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pdf: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M12 12v6"/><path d="M9 15l3 3 3-3"/>',
  left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
  heart: '<path d="M12 20s-7-4.4-9.3-8.6C1.2 8.6 3 5 6.4 5c2 0 3.3 1.1 4 2.3.4.7 1 .7 1.4 0C12.6 6.1 14 5 16 5c3.4 0 5.2 3.6 3.7 6.4C19 15.6 12 20 12 20z"/>',
  comment: '<path d="M20 12a8 8 0 1 1-3.1-6.3A8 8 0 0 1 20 12z"/><path d="M20 20l-2.4-2.4"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>', save: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
};
const icon = (n, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

/** Everything the page shows, gathered from her files. Returns {data} or {problems}. */
export function kitData({handle, base, appLinkMd, appCheckMd, captionsMd, carousels, breakdownHtml, email1, voice}) {
  const problems = [], link = (String(appLinkMd).match(/^- Link:\s*(https:\/\/\S+)/m) || [])[1] || '';
  const kit = kitLink(link); if (!kit) problems.push('app/app-link.md has no app link');
  const app = parseAppCheck(appCheckMd); if (!app.title) problems.push('app/app-check.md is missing or has no title');
  const caps = parseCaptions(captionsMd);
  const cars = [...carousels].sort((x, y) => x.name.localeCompare(y.name)).map((c, i) => {
    const letter = (c.name.match(/^([A-Z])-/) || [])[1] || String.fromCharCode(65 + i);
    const cap = caps.find(x => x.letter === letter) || caps[i];
    if (!cap) problems.push(`captions.md has no caption for carousel ${c.name}`);
    if (!c.slides.length) problems.push(`carousel ${c.name} has no slides`);
    return {...c, letter, title: cap?.title || c.title, caption: cap?.caption || '', note: cap?.note || ''};
  });
  if (cars.length !== 2) problems.push(`found ${cars.length} carousels (2 needed)`);
  const money = parseBreakdown(breakdownHtml); if (!money) problems.push(`outreach/breakdown-${handle}.html is missing or unreadable`);
  const pal = PALETTE_NAMES.includes(app.palette) ? app.palette : (PALETTE_NAMES.includes(cars[0]?.palette) ? cars[0].palette : 'pine');
  if (problems.length) return {problems};
  return {data: {handle: key(handle), base, title: app.title, appLink: link, kit, app, carousels: cars, money, palette: pal, us: spellingFor(voice) === 'US' || !money.gbp && /USA|United States/i.test(money.country),
    name: greetingName(email1) || money.madeFor || ''}};
}

const priceText = m => m.gbp ? `$${m.price} (£${m.gbp.price})` : `$${m.price}`;
const shareText = (m, i) => m.gbp ? `${money(m.share[i])} (£${fmt(m.gbp.share[i])})` : money(m.share[i]);

/** The page itself (index.html). Files it links to sit next to it: cover.jpg, A-01.jpg, carousel-A.zip, breakdown.pdf, fonts/. */
export function pageHtml(d) {
  const P = paletteOf(d.palette).book, main = P.pine, deep = P.pineDeep, accent = P.marigold, line = P.line, ink = P.ink, muted = '#5F6B77', butter = '#FDF6EA', blush = P.blush;
  const m = d.money, colorWord = d.us ? 'colors' : 'colours', firstName = d.name && !d.name.startsWith('@') ? d.name : '';
  const fontCss = [['Outfit', 'outfit-400', 400], ['Outfit', 'outfit-600', 600], ['Outfit', 'outfit-700', 700], ['Outfit', 'outfit-800', 800], ['Source Serif 4', 'source-serif-400', 400], ['Source Serif 4', 'source-serif-600', 600]]
    .map(([f, file, w]) => `@font-face{font-family:'${f}';src:url(fonts/${file}.woff2) format('woff2');font-weight:${w};font-display:swap}`).join('');
  const tile = (label, i) => `<div class="tile${i === 1 ? ' mid' : ''}"><span class="tl">${label}</span><span class="tv">${esc(money(m.share[i]))}</span>${m.gbp ? `<span class="tg">(£${fmt(m.gbp.share[i])})</span>` : ''}<span class="tb">${fmt(m.buyers[i])} buyers</span></div>`;
  const rows = [[`Buyers (${m.rates.map(r => r + '%').join(', ')} of followers)`, m.buyers.map(fmt), null],
    [`Sales (buyers × $${m.price}, ebook + app)`, m.sales.map(x => money(x)), m.gbp && m.gbp.sales],
    ['Less store fees (6% + $0.30 a sale)', m.fees.map(x => money(x)), m.gbp && m.gbp.fees],
    ['Left after fees', m.left.map(x => money(x)), m.gbp && m.gbp.left],
    ['Your 60%', m.share.map(x => money(x)), m.gbp && m.gbp.share]];
  const table = rows.map(([label, v, g], r) => `<tr${r === 4 ? ' class="total"' : ''}><td>${esc(label)}</td>${v.map((x, i) => `<td class="n">${esc(x)}${g ? `<br><span class="gbp">(£${fmt(g[i])})</span>` : ''}</td>`).join('')}</tr>`).join('');
  const steps = [['We write it', 'We write and design the book and build the app in your style.'], ['You approve every word', 'Nothing is sold until you say so.'], ['You post', 'We set up the store and write your launch posts. You post them.'], ['Whop pays you 60%', 'The store pays you 60% of each sale directly.']];
  const carousel = c => {
    const paras = c.caption.split(/\n\s*\n/), short = paras.slice(1, 3).join('\n\n') || paras[0];
    return `<section class="car" data-car>
  <div class="carhead"><h3>${esc(c.title)}</h3><span>Carousel ${esc(c.letter)} · ${c.slides.length} slides</span></div>
  <div class="post">
    <div class="who"><span class="av" aria-hidden="true">${esc((firstName || d.handle)[0].toUpperCase())}</span><span><b>${esc(d.handle)}</b><small>Paid partnership</small></span></div>
    <div class="strip" tabindex="0" aria-label="Carousel ${esc(c.letter)}: swipe or use the arrows">${c.slides.map((s, i) => `<img src="${esc(c.letter)}-${String(i + 1).padStart(2, '0')}.jpg" width="1080" height="1350" alt="Slide ${i + 1} of ${c.slides.length}"${i ? ' loading="lazy"' : ''}>`).join('')}</div>
    <button class="arr prev" type="button" aria-label="Previous slide" hidden>${icon('left')}</button><button class="arr next" type="button" aria-label="Next slide">${icon('right')}</button>
    <div class="bar"><span class="ic">${icon('heart', 22)}${icon('comment', 22)}${icon('send', 22)}</span><span class="dots">${c.slides.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span><span class="ic">${icon('save', 22)}</span></div>
    <details class="cap"><summary><b>${esc(d.handle)}</b> ${esc(short)} <span class="more">... more</span></summary><div><b>${esc(d.handle)}</b> ${esc(c.caption)}</div></details>
  </div>
  <div class="btns"><a class="btn2" href="carousel-${esc(c.letter)}.zip" download>${icon('down', 18)}Download this carousel</a><button class="btn2 copy" type="button" data-text="${esc(c.caption)}">${icon('copy', 18)}<span>Copy caption</span></button></div>
  <p class="small">${c.slides.length} full-size images, 1080 × 1350, ready for Instagram.${c.note ? ' ' + esc(c.note) : ''}</p>
</section>`;
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<title>${esc(d.title)}: made for @${esc(d.handle)}</title>
<style>
${fontCss}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:${butter};color:${ink};font-family:'Source Serif 4',Georgia,serif;font-size:17px;line-height:1.55}
a{color:${main}}h1,h2,h3,.ui{font-family:Outfit,Arial,sans-serif}
.top{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid ${line};font-family:Outfit,Arial,sans-serif;font-size:16px}
.top b{font-weight:700}.top span{color:${muted};font-size:14px;display:flex;gap:5px;align-items:center}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.hero{display:flex;flex-direction:column;gap:16px;padding-top:24px}
.cover{width:230px;height:auto;align-self:center;border-radius:6px;box-shadow:0 14px 30px rgba(0,0,0,.22)}
.kick{font-family:Outfit,Arial,sans-serif;font-weight:600;font-size:14px;color:${main}}
h1{margin:0;font-size:34px;line-height:1.08;font-weight:700}
.sub{margin:0;font-family:Outfit,Arial,sans-serif;font-size:18px;color:${deep}}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips span{padding:6px 12px;border-radius:20px;background:${blush};font-family:Outfit,Arial,sans-serif;font-size:14px;color:${deep}}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:60px;padding:0 24px;border-radius:14px;background:${main};color:#fff;font-family:Outfit,Arial,sans-serif;font-weight:600;font-size:19px;text-decoration:none}
.btn:hover{background:${deep};color:#fff}
.small{margin:0;font-family:Outfit,Arial,sans-serif;font-size:13px;color:${muted};line-height:1.5}
.lock{display:flex;gap:6px;align-items:center}
section.part{padding-top:56px;display:flex;flex-direction:column;gap:18px}
.eyebrow{font-family:Outfit,Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${main}}
h2{margin:4px 0 0;font-size:28px;line-height:1.15;font-weight:700}
.cars{display:flex;flex-direction:column;gap:40px}
.car{display:flex;flex-direction:column;gap:14px;min-width:0}
.carhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.carhead h3{margin:0;font-size:19px;font-weight:600}.carhead span{font-family:Outfit,Arial,sans-serif;font-size:13px;color:${muted};white-space:nowrap}
.post{position:relative;background:#fff;border:1px solid ${line};border-radius:14px;overflow:hidden}
.who{display:flex;gap:10px;align-items:center;padding:10px 12px;font-family:Outfit,Arial,sans-serif;line-height:1.2}.who b{display:block;font-size:14px}.who small{font-size:12px;color:${muted}}
.av{width:34px;height:34px;border-radius:50%;background:${main};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;background:#eee}.strip::-webkit-scrollbar{display:none}
.strip img{flex:0 0 100%;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;scroll-snap-align:start;display:block}
.arr{position:absolute;top:calc(57px + (100% - 57px - 120px)/2);width:44px;height:44px;margin-top:-22px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:${ink};display:flex;align-items:center;justify-content:center;cursor:pointer}
.arr[hidden]{display:none}.prev{left:8px}.next{right:8px}
.bar{position:relative;display:flex;align-items:center;justify-content:space-between;padding:10px 12px 4px}.ic{display:flex;gap:14px}
.dots{position:absolute;left:0;right:0;display:flex;justify-content:center;gap:5px;pointer-events:none}.dots i{width:6px;height:6px;border-radius:50%;background:#D5C6C1}.dots i.on{width:7px;height:7px;background:${main}}
.cap{padding:6px 12px 14px;font-family:Outfit,Arial,sans-serif;font-size:14px;line-height:1.45;white-space:pre-line}
.cap summary{list-style:none;cursor:pointer}.cap summary::-webkit-details-marker{display:none}.cap[open] summary{display:none}.more{color:${muted}}
.btns{display:flex;gap:10px}
.btn2{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;min-height:48px;padding:0 10px;white-space:nowrap;border-radius:12px;background:#fff;color:${deep};border:1.5px solid ${line};font-family:Outfit,Arial,sans-serif;font-weight:600;font-size:14px;text-decoration:none;cursor:pointer}.btn2 svg{flex:none}
.btn2:hover{border-color:${main};color:${deep}}
.gets{background:#fff;border:1px solid ${line};border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.gets .row{display:flex;gap:12px;align-items:flex-start;color:${main}}.gets .row svg{flex:none;width:22px;height:22px;margin-top:2px}.gets .row span{color:${ink};font-size:16px}.gets b{font-family:Outfit,Arial,sans-serif;color:${deep}}
.tiles{display:flex;gap:8px}
.tile{flex:1;min-width:0;background:#fff;border:1px solid ${line};border-radius:14px;padding:14px 6px;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:Outfit,Arial,sans-serif;text-align:center}
.tile .tl{font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${muted}}.tile .tv{font-size:24px;font-weight:700;color:${main}}.tile .tg{font-size:14px;color:${muted}}.tile .tb{font-size:12px;color:${muted}}
.tile.mid{background:${main};border-color:${main}}.tile.mid .tl,.tile.mid .tg,.tile.mid .tb{color:#fff}.tile.mid .tv{color:#fff}
details.work summary{font-family:Outfit,Arial,sans-serif;font-weight:600;color:${main};text-decoration:underline;cursor:pointer;min-height:44px;display:flex;align-items:center}
.tablebox{background:#fff;border:1px solid ${line};border-radius:12px;padding:6px 10px;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-family:Outfit,Arial,sans-serif;font-size:13px}th{font-size:12px;color:${muted};text-align:right;padding:6px}th:first-child{text-align:left}
td{padding:8px 6px;border-top:1px solid ${line}}td.n{text-align:right;white-space:nowrap}.total td{font-weight:700}.gbp{color:${muted};font-weight:400}
ol.steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px}
ol.steps li{display:flex;gap:14px;align-items:flex-start}ol.steps .n{flex:none;width:34px;height:34px;border-radius:50%;background:${accent};color:${deep};display:flex;align-items:center;justify-content:center;font-family:Outfit,Arial,sans-serif;font-weight:700}
ol.steps b{display:block;font-family:Outfit,Arial,sans-serif;font-size:17px;padding-top:4px}
.yours{background:#fff;border:1.5px solid ${accent};border-radius:14px;padding:16px 18px}.yours b{display:block;font-family:Outfit,Arial,sans-serif;font-size:17px;color:${deep};margin-bottom:4px}
.pills{display:flex;flex-wrap:wrap;gap:8px}.pills div{flex:1 1 100%;background:${blush};border-radius:12px;padding:12px 14px;font-family:Outfit,Arial,sans-serif;font-size:15px}.pills b{color:${deep}}
.reply{margin-top:56px;background:${deep};color:#fff;border-radius:20px;padding:28px 22px;display:flex;flex-direction:column;gap:18px}
.reply h2{color:#fff;font-size:26px}.reply p{margin:0;color:#FBEAE5}.reply .btn{background:${accent};color:${deep}}.reply .btn:hover{background:#fff;color:${deep}}
footer{padding:28px 0 36px;text-align:center;display:flex;flex-direction:column;gap:6px;font-family:Outfit,Arial,sans-serif;font-size:14px}footer span+span{color:${muted};font-size:13px}
@media (min-width:900px){
 .wrap{padding:0 40px}.top{padding:14px 64px}
 .hero{flex-direction:row;gap:64px;align-items:center;padding-top:64px}.cover{width:340px;align-self:center;flex:none}.hero .text{display:flex;flex-direction:column;gap:18px}
 h1{font-size:52px}.sub{font-size:22px}.btn.open{align-self:flex-start;min-width:360px}
 section.part{padding-top:88px}h2{font-size:36px}
 .cars{flex-direction:row;gap:64px;align-items:flex-start}.car{flex:1}
 .split{display:flex;gap:64px;align-items:flex-start}.split>section{flex:1;min-width:0}
 .tile .tv{font-size:32px}.pills div{flex:1 1 0}
 .reply{flex-direction:row;align-items:center;padding:40px 48px;gap:40px}.reply .btn{flex:none}.reply h2{font-size:34px}
}
@media (max-width:899px){.hero .text{display:contents}}
</style>
</head>
<body>
<header class="top"><b>Blueprints <span style="display:inline;color:${muted};font-weight:500;font-size:16px">by Blue One Hundred</span></b><span>${icon('lock', 14)}Private</span></header>
<main class="wrap">
<div class="hero">
  <img class="cover" src="cover.jpg" alt="Book cover: ${esc(d.title)}, by @${esc(d.handle)}">
  <div class="text">
  <span class="kick">Made for @${esc(d.handle)} by Dan at Blueprints</span>
  <h1>${esc(d.title)}</h1>
  ${d.subtitle ? `<p class="sub">${esc(d.subtitle)}</p>` : ''}
  <p style="margin:0">${firstName ? `Hi ${esc(firstName)}. ` : 'Hi. '}We made this book and its own app for you, in your voice, from your public posts. Everything is on this page.</p>
  <div class="chips">${d.app.chapters ? `<span>${d.app.chapters} short chapters</span>` : ''}${d.app.planDays ? `<span>A ${d.app.planDays}-day plan</span>` : ''}<span>The companion app</span></div>
  <a class="btn open" href="${esc(d.appLink)}">${icon('book', 22)}${OPEN_BUTTON}</a>
  <span class="small lock">${icon('lock', 15)}Private link, made only for you. Opens on your phone or laptop.</span>
  </div>
</div>
<section class="part">
  <div><div class="eyebrow">Your launch posts</div><h2>Your 2 launch carousels</h2></div>
  <p style="margin:0;max-width:760px">2 examples of what your launch carousels could look like. Swipe through each one. If you like them, we'd make a launch reel together from your own clips.</p>
  <div class="cars">${d.carousels.map(carousel).join('')}</div>
</section>
<div class="split">
<section class="part">
  <div><div class="eyebrow">Estimate, not a forecast</div><h2>What you could earn</h2></div>
  <p style="margin:0">If only ${m.rates.map(r => r + '%').join(', ').replace(/, ([^,]*)$/, ' or $1')} of your ${fmt(m.followers)} Instagram followers purchased your book (with its companion app) at ${esc(priceText(m))}, this is your 60% after store fees.</p>
  <div class="gets">
    <div class="eyebrow">What your buyers get for ${esc(priceText(m))}</div>
    <div class="row">${icon('book', 22)}<span><b>A high-quality ebook</b> in your voice: ${d.app.chapters ? `${d.app.chapters} chapters, ` : ''}${d.app.sources ? `built from ${d.app.sources} trusted sources, ` : ''}designed to read well on any screen or to print.</span></div>
    <div class="row">${icon('phone', 22)}<span><b>Its own companion app</b>, made only for this book: ${esc(appWords(d.app, d.us))}, on their phone.</span></div>
  </div>
  <div class="tiles">${tile('Low', 0)}${tile('Middle', 1)}${tile('High', 2)}</div>
  <details class="work"><summary>See the working</summary><div class="tablebox"><table><tr><th>Step</th><th>Low</th><th>Middle</th><th>High</th></tr>${table}</table></div></details>
  <p class="small">Estimate, not a forecast. The real number could be lower than Low. Sales tax, where it applies, comes off before the split.${m.checked ? ` Followers checked ${esc(m.checked)}.` : ''} General information, not financial advice.</p>
  <a class="btn2" style="flex:none;align-self:flex-start" href="breakdown.pdf" download>${icon('pdf', 18)}Download as PDF</a>
</section>
<section class="part">
  <div><div class="eyebrow">Simple and free</div><h2>How it works</h2></div>
  <ol class="steps">${steps.map(([t, s], i) => `<li><span class="n">${i + 1}</span><div><b>${t}</b>${s}</div></li>`).join('')}</ol>
  <div class="yours"><b>Your ${colorWord} and your fonts</b>This sample uses our house look. If you go ahead, we can make the book, the app and all your launch posts in your own ${d.us ? 'color' : 'colour'} palette and the fonts you choose.</div>
  <div class="pills"><div><b>No cost to you,</b> before, now or later.</div><div><b>No contract to look.</b> One short agreement only if you say yes.</div><div><b>Your name and content</b> stay yours. Your free content stays free.</div></div>
</section>
</div>
<div class="reply">
  <div style="display:flex;flex-direction:column;gap:8px;flex:1"><h2 style="margin:0">Questions? Reply to Dan</h2><p>Tell me what you think, ask anything, or say yes and we'll talk through next steps. No is fine too.</p></div>
  <a class="btn" href="mailto:dan@blueonehundred.com?subject=${encodeURIComponent(d.title)}">${icon('mail', 20)}Reply to Dan</a>
</div>
<footer><span>Dan · Blueprints by Blue One Hundred · <a href="https://www.blueonehundred.com">www.blueonehundred.com</a></span><span>A private page made only for you. Not listed anywhere, no tracking.</span></footer>
</main>
<script>
for(const car of document.querySelectorAll('[data-car]')){
  const strip=car.querySelector('.strip'),prev=car.querySelector('.prev'),next=car.querySelector('.next'),dots=[...car.querySelectorAll('.dots i')],n=dots.length;
  const at=()=>Math.round(strip.scrollLeft/strip.clientWidth);
  const show=()=>{const i=at();dots.forEach((d,j)=>d.classList.toggle('on',j===i));prev.hidden=i<=0;next.hidden=i>=n-1;};
  const go=i=>strip.scrollTo({left:Math.max(0,Math.min(n-1,i))*strip.clientWidth,behavior:'smooth'});
  prev.addEventListener('click',()=>go(at()-1));next.addEventListener('click',()=>go(at()+1));
  strip.addEventListener('scroll',()=>requestAnimationFrame(show),{passive:true});
}
for(const b of document.querySelectorAll('.copy'))b.addEventListener('click',async()=>{const label=b.querySelector('span');try{await navigator.clipboard.writeText(b.dataset.text);label.textContent='Caption copied';}catch{label.textContent='Select and copy the caption above';}setTimeout(()=>{label.textContent='Copy caption';},2500);});
</script>
</body>
</html>
`;
}

/** The one-page breakdown PDF (printed from this HTML), made from the same numbers as the page. */
export function breakdownHtml(d) {
  const P = paletteOf(d.palette).book, m = d.money, who = d.name && !d.name.startsWith('@') ? `${d.name} (@${d.handle})` : `@${d.handle}`;
  const g = (k, i) => m.gbp ? `<br><span class="gbp">(£${fmt(m.gbp[k][i])})</span>` : '';
  const row = (label, vals, k, bold) => `<tr${bold ? ' class="b"' : ''}><td>${label}</td>${vals.map((v, i) => `<td class="n">${v}${k ? g(k, i) : ''}</td>`).join('')}</tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.title)}: what you could earn</title><style>
@page{size:Letter;margin:0.5in}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:${P.ink};font-size:10pt;line-height:1.4;margin:0}
header{background:${P.pine};color:#fff;padding:12px 16px;border-radius:6px}header h1{margin:0;font-size:18pt}header p{margin:4px 0 0;font-size:9.6pt}
h2{font-size:10.4pt;color:${P.pineDeep};margin:14px 0 5px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid ${P.line};padding-bottom:2px}
.cols{display:flex;gap:18px}.cols>section{flex:1}table{border-collapse:collapse;width:100%}td,th{border:1px solid ${P.line};padding:4px 7px;text-align:left;font-size:9.6pt;vertical-align:top}
th{background:${P.mint};font-weight:bold}td.n,th.n{text-align:right;white-space:nowrap;width:17%}tr.b td{font-weight:bold}.gbp{font-weight:normal;color:#55626C;font-size:9pt}
ol{margin:2px 0 0 18px;padding:0}li{margin-bottom:3px}p{margin:3px 0}.note{font-size:8.6pt;color:#55626C}
.band{display:flex;gap:10px;margin-top:12px}.band div{flex:1;background:${P.mint};padding:7px 9px;font-size:9.5pt;border-radius:4px}
footer{margin-top:12px;font-size:8.6pt;color:#55626C;border-top:1px solid ${P.line};padding-top:4px}
</style></head><body>
<header><h1>${esc(d.title)}</h1><p>A high-quality ebook and its own companion app, made for ${esc(who)} by Blueprints by Blue One Hundred</p></header>
<div class="cols"><section>
<h2>What your buyers get for ${esc(priceText(m))}</h2>
<p><b>A high-quality ebook</b> in your voice${d.app.chapters ? `: ${d.app.chapters} chapters` : ''}${d.app.sources ? `, built from ${d.app.sources} trusted sources` : ''}, designed to read well on any screen or to print.</p>
<p><b>Its own companion app</b>, made only for this book: ${esc(appWords(d.app, d.us))}, on their phone.</p>
<h2>Your public numbers</h2>
<table><tr><th>Instagram followers</th><td class="n">${fmt(m.followers)}</td></tr>${m.country ? `<tr><th>Country</th><td class="n">${esc(m.country)}</td></tr>` : ''}${m.checked ? `<tr><th>Date checked</th><td class="n">${esc(m.checked)}</td></tr>` : ''}</table>
<p class="note">Public Instagram profile figure only. Other channels not counted.</p>
</section><section>
${m.ideas.length ? `<h2>Two more ideas from your themes</h2><ol>${m.ideas.slice(0, 2).map(i => `<li>${esc(i)}</li>`).join('')}</ol><p class="note">Ideas only. You choose what, if anything, comes next.</p>` : ''}
<h2>How it works</h2><ol><li>We write and design the book and build the app in your style.</li><li>You read and approve every word. Nothing is sold until you say so.</li><li>We set up the store and write your launch posts.</li><li>You post, and the store (Whop) pays you 60% of each sale directly.</li></ol>
</section></div>
<h2>What you could earn: estimate, not a forecast</h2>
<p>If only ${m.rates.map(r => r + '%').join(', ').replace(/, ([^,]*)$/, ' or $1')} of your ${fmt(m.followers)} Instagram followers purchased your book (with its companion app) at ${esc(priceText(m))}, this is your 60% after store fees.</p>
<table><tr><th>Step</th><th class="n">Low</th><th class="n">Middle</th><th class="n">High</th></tr>
${row(`Buyers (${fmt(m.followers)} followers x ${m.rates.join('%, ')}%, rounded down)`, m.buyers.map(fmt))}
${row(`Sales (buyers x $${m.price} for the ebook with its companion app)`, m.sales.map(x => money(x)), 'sales')}
${row(`Less estimated fees (6% plus $0.30 a sale${m.gbp?.fee ? `; £${m.gbp.fee}` : ''})`, m.fees.map(x => money(x)), 'fees')}
${row('Left after fees', m.left.map(x => money(x)), 'left')}
${row('Your 60%', m.share.map(x => money(x)), 'share', true)}</table>
<p class="note">Estimate, not a forecast. The real number could be lower than the Low column. Sales tax, where it applies, also comes off before the split. General information, not financial advice.</p>
<div class="band"><div><b>Your name and your content stay yours.</b></div><div><b>No cost to you</b>, before, now or later.</div><div><b>No contract</b> is needed to look. One short agreement only if you say yes.</div></div>
<footer>Dan · Blueprints by Blue One Hundred · dan@blueonehundred.com · www.blueonehundred.com</footer>
</body></html>`;
}

const readText = async p => { try { return await readFile(p, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return ''; throw e; } };
const list = async p => { try { return await readdir(p, {withFileTypes: true}); } catch (e) { if (e.code === 'ENOENT') return []; throw e; } };

/** Reads one creator's files from the team folder. Returns {data, files, hash} or {problems}. */
export async function gatherKit(root, {handle, base}) {
  handle = key(handle); const ed = join(root, 'ebooks', base, 'editions', handle);
  const carousels = [];
  for (const e of await list(join(ed, 'carousel'))) {
    if (!e.isDirectory() || e.name.startsWith('_')) continue;
    const dir = join(ed, 'carousel', e.name), json = await readText(join(dir, 'slides.json')); if (!json) continue;
    let saved = {}; try { saved = JSON.parse(json); } catch {}
    const names = (await list(dir)).map(x => x.name).filter(n => /^\d{2}\.jpg$/.test(n)).sort();
    carousels.push({name: e.name, title: saved.title || e.name, palette: saved.palette, slides: names, dir, passed: /Result:\s*PASSED/.test(await readText(join(dir, 'carousel-check.md')))});
  }
  let email1 = '';
  for (const n of (await list(join(root, 'outreach'))).map(x => x.name).filter(n => /^send-sheet-\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().reverse()) {
    const entry = parseSendSheetEntry(await readText(join(root, 'outreach', n)), handle); if (entry?.email1) { email1 = entry.email1; break; }
  }
  const input = {handle, base, appLinkMd: await readText(join(ed, 'app', 'app-link.md')), appCheckMd: await readText(join(ed, 'app', 'app-check.md')),
    captionsMd: await readText(join(ed, 'carousel', 'captions.md')), carousels, breakdownHtml: await readText(join(root, 'outreach', `breakdown-${handle}.html`)),
    email1, voice: await readText(join(root, 'creators', 'voice', handle + '.md'))};
  const res = kitData(input); if (res.problems) return res;
  const failed = carousels.filter(c => !c.passed).map(c => c.name);
  if (failed.length) return {problems: failed.map(n => `carousel ${n} has not passed make_carousel (carousel-check.md)`)};
  const appJson = await readText(join(ed, 'app.json')) || await readText(join(root, 'ebooks', base, 'app.json'));
  try { res.data.subtitle = JSON.parse(appJson || '{}').subtitle || ''; } catch { res.data.subtitle = ''; }
  // What the page is made from: when any of it changes, the page is made again.
  const h = createHash('sha256'); h.update(JSON.stringify({...input, carousels: carousels.map(c => [c.name, c.slides])}));
  for (const c of carousels) for (const n of c.slides) h.update(String((await stat(join(c.dir, n))).mtimeMs));
  h.update(String((await stat(join(ed, 'book.html')).catch(() => ({mtimeMs: 0}))).mtimeMs));
  h.update('page-v1');
  return {data: res.data, edition: ed, hash: h.digest('hex').slice(0, 16)};
}

/** The sample page record the app writes: pipeline/<handle>/sample-page.md. */
export function recordMd({handle, url, folder, live, when, hash, files, bytes, problems}) {
  if (problems) return `# Sample page: @${handle}\n\n- Status: NOT MADE\n- Checked: ${when}\n\n## Why\n${problems.map(p => '- ' + p).join('\n')}\n\n## For Toby\nTell Tavin in the brief what is missing, with the bot that fixes it.\n`;
  return `# Sample page: @${handle}\n\n- Link: ${url}\n- Folder: ${folder}\n- Published: ${when}\n- Live when checked: ${live ? 'yes' : 'not yet (the site rebuilds in about a minute)'}\n- Files: ${files} (${Math.round(bytes / 1024)} KB)\n- Made from: ${hash}\n\nPrivate link, not listed anywhere: it goes only in Dan's first email to her. The app makes it again by itself when her carousels, captions, breakdown, app or book change.\n\n## For Toby\nnothing\n`;
}
export const recordLink = md => ({url: (String(md).match(/^- Link:\s*(https:\/\/\S+)/m) || [])[1] || '', hash: (String(md).match(/^- Made from:\s*(\w+)/m) || [])[1] || '', live: /^- Live when checked: yes/m.test(String(md))});

export class SamplePages {
  constructor({teamRoot, teamFolder, publisher, renderPage, makePdf, fetchImpl, wait, now = Date.now}) {
    Object.assign(this, {teamRoot, teamFolder, publisher, renderPage, makePdf, fetchImpl, wait, now}); this.busy = false; this.last = 0; this.lastTried = {};
  }
  async record(handle) { return readText(join(this.teamRoot, 'pipeline', key(handle), 'sample-page.md')); }
  /** Make (or remake) one creator's page and publish it. Returns {ok, url, live} or {ok:false, why}. */
  async make({handle, base, force = false, signal}) {
    handle = key(handle);
    const when = stamp(this.now()), path = `pipeline/${handle}/sample-page.md`;
    const g = await gatherKit(this.teamRoot, {handle, base});
    if (g.problems) { await this.teamFolder.write(null, path, recordMd({handle, when, problems: g.problems})); return {ok: false, why: g.problems.join('; ')}; }
    const old = recordLink(await this.record(handle));
    if (!force && old.hash === g.hash && old.url === g.data.kit.url && old.live) return {ok: true, url: old.url, live: true, unchanged: true};
    const publisher = this.publisher?.(); if (!publisher?.token) return {ok: false, why: 'App publishing is not set up (the app_publisher connection).'};
    if (publisher.site.replace(/\/+$/, '') !== g.data.kit.site) return {ok: false, why: `her app is on ${g.data.kit.site}, but the publisher serves ${publisher.site}`};
    const d = g.data, files = [];
    files.push({path: 'index.html', bytes: Buffer.from(pageHtml(d))});
    const cover = await this.renderPage({file: join(g.edition, 'book.html'), width: 672, height: 960, clipSelector: '.cover', quality: 88, scale: 1.5, signal});
    files.push({path: 'cover.jpg', bytes: Buffer.from(cover.jpeg)});
    for (const c of d.carousels) {
      const slides = [];
      for (const [i, n] of c.slides.entries()) { const bytes = await readFile(join(c.dir, n)); slides.push({name: `${handle}-${c.name}-${String(i + 1).padStart(2, '0')}.jpg`, bytes}); files.push({path: `${c.letter}-${String(i + 1).padStart(2, '0')}.jpg`, bytes}); }
      files.push({path: `carousel-${c.letter}.zip`, bytes: zipStore(slides)});
    }
    const htmlPath = `pipeline/${handle}/sample-breakdown.html`;
    await this.teamFolder.write(null, htmlPath, breakdownHtml(d));
    const pdf = await this.makePdf({file: await this.teamFolder.target(null, htmlPath), pageSize: 'Letter', signal});
    await this.teamFolder.writeBytes(null, `pipeline/${handle}/sample-breakdown.pdf`, pdf);
    files.push({path: 'breakdown.pdf', bytes: Buffer.from(pdf)});
    for (const f of FONT_FILES) files.push({path: `fonts/${f}.woff2`, bytes: await readFile(new URL(f + '.woff2', FONT_DIR))});
    const r = await publishFiles({publisher, folder: d.kit.folder, files, message: `Sample page for @${handle}`, fetchImpl: this.fetchImpl, signal, wait: this.wait});
    await this.teamFolder.write(null, path, recordMd({handle, url: r.url, folder: r.folder, live: r.live, when, hash: g.hash, files: r.files, bytes: r.bytes}));
    const t = stamp(this.now());
    await this.teamFolder.append(`board/runs-${t.slice(0, 10)}.md`, `${t.slice(11)} | Sample page | done: @${handle} private page published (${r.url}, ${r.files} files, live: ${r.live ? 'yes' : 'not yet'}) | cost: $0.00 | problems: none\n`).catch(() => {});
    return {ok: true, url: r.url, live: r.live, files: r.files};
  }
  /** Every approved package gets its page; a page is made again when its files change. Runs at most every 10 minutes. */
  async tick(runs) {
    if (this.busy || this.now() - this.last < 600000 || !this.publisher?.()?.token) return; this.busy = true; this.last = this.now();
    try {
      for (const run of (runs || []).filter(r => r.status === 'approved' && r.handle && r.base)) {
        const h = key(run.handle);
        if (this.lastTried[h] && this.now() - this.lastTried[h] < 3600000 && !(await this.record(h)).includes('- Link:')) continue;
        this.lastTried[h] = this.now();
        await this.make({handle: h, base: run.base}).catch(async e => { const t = stamp(this.now()); await this.teamFolder.append(`board/runs-${t.slice(0, 10)}.md`, `${t.slice(11)} | Sample page | failed: @${h} | cost: $0.00 | problems: ${e.message.slice(0, 200)}\n`).catch(() => {}); });
      }
    } finally { this.busy = false; }
  }
}
