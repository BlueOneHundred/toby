// Toby: assemble a designed, print-ready ebook from Markdown parts in the team folder.
// Bots write chapters as Markdown with a few labelled blocks; this turns them into one
// self-contained HTML book (cover, contents, chapter openers, visual blocks, tables, sources)
// that make_pdf prints with Chromium. No scripts: everything is static HTML and CSS.
import {marked} from 'marked';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip = html => String(html).replace(/<[^>]+>/g, '');
const slug = value => strip(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
const cite = html => html.replace(/\[(S\d+(?:\s*,\s*S\d+)*)\]/g, '<span class="cite">[$1]</span>');
const clean = html => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+="[^"]*"/gi, '');
const listItems = html => (html.match(/<li>[\s\S]*?<\/li>/g) || []).map(li => li.replace(/^<li>|<\/li>$/g, '').trim());
const withoutList = html => html.replace(/<(ol|ul)>[\s\S]*<\/\1>/, '').trim();

export const PAGE_SIZES = {Letter: ['215.9mm', '279.4mm'], A4: ['210mm', '297mm'], A5: ['148mm', '210mm']};

// Labelled boxes: "> Label: text". Colour boxes keep their colour; visual blocks get their own layout.
const BOXES = {
  'the short version': 'short', 'try tonight': 'try', 'try this': 'try', 'remember': 'remember',
  'safety note': 'safety', 'red flag': 'red', 'tip': 'tip',
};
const VISUAL = {stat: 'stat', steps: 'steps', before: 'before', after: 'after', checklist: 'checklist', timeline: 'timeline', quote: 'quote', 'key idea': 'key-idea'};

function labelOf(token) {
  if (!token || token.type !== 'blockquote') return null;
  const first = token.tokens?.find(t => t.type === 'paragraph');
  if (!first) return null;
  const match = /^\s*(?:\*\*)?([^:*\n]{2,60}?)(?:\*\*)?:(?:\*\*)?[ \t]*/.exec(first.raw || first.text || '');
  if (!match) return null;
  const name = match[1].trim(), key = name.toLowerCase();
  if (BOXES[key]) return {name, kind: BOXES[key], skip: match[0].length};
  if (VISUAL[key]) return {name, kind: VISUAL[key], skip: match[0].length};
  if (/^from\b/i.test(name)) return {name, kind: 'from', skip: match[0].length};
  return null;
}

// A blockquote's content without its leading "Label:" text.
function boxBody(token, label) {
  const tokens = structuredClone(token.tokens);
  const first = tokens.find(t => t.type === 'paragraph');
  const index = tokens.indexOf(first);
  const rest = (first.raw || first.text).slice(label.skip).trim();
  if (rest) tokens.splice(index, 1, ...marked.lexer(rest).filter(t => t.type !== 'space'));
  else tokens.splice(index, 1);
  return marked.parser(tokens);
}

function renderBox(token, label) {
  const body = boxBody(token, label);
  switch (label.kind) {
    case 'stat': {
      const inner = body.replace(/^\s*<p>|<\/p>\s*$/g, '');
      const cut = inner.indexOf('|');
      const number = cut >= 0 ? strip(inner.slice(0, cut)).trim() : strip(inner).trim().split(/\s+/)[0];
      const caption = cut >= 0 ? inner.slice(cut + 1).trim() : inner.slice(inner.indexOf(number) + number.length).trim();
      return `<div class="stat"><div class="stat-number">${esc(number)}</div><div class="stat-caption">${caption}</div></div>`;
    }
    case 'steps': {
      const intro = withoutList(body);
      const steps = listItems(body).map((item, i) => `<div class="step"><div class="step-n">${i + 1}</div><div class="step-t">${item}</div></div>`);
      return `<div class="steps">${intro ? `<div class="steps-intro">${intro}</div>` : ''}<div class="steps-row n${steps.length > 4 ? 5 : steps.length}">${steps.join('')}</div></div>`;
    }
    case 'checklist': {
      const items = listItems(body).map(item => `<li><span class="tick"></span><span>${item}</span></li>`);
      return `<div class="checklist"><p class="box-label">${esc(label.name)}</p>${withoutList(body)}<ul>${items.join('')}</ul></div>`;
    }
    case 'timeline': {
      const items = listItems(body).map(item => {
        const m = /^(?:<strong>)?([^:<]{1,40}):(?:<\/strong>)?\s*([\s\S]*)$/.exec(item);
        return m ? `<div class="tl-item"><div class="tl-when">${m[1]}</div><div class="tl-what">${m[2]}</div></div>` : `<div class="tl-item"><div class="tl-what">${item}</div></div>`;
      });
      const intro = withoutList(body);
      return `<div class="timeline">${intro ? `<div class="tl-intro">${intro}</div>` : ''}${items.join('')}</div>`;
    }
    case 'quote': return `<blockquote class="pull">${body}</blockquote>`;
    case 'key-idea': return `<div class="key-idea"><p class="box-label">Key idea</p>${body}</div>`;
    case 'before': case 'after':
      return `<div class="ba-side ba-${label.kind}"><p class="box-label">${esc(label.name)}</p>${body}</div>`;
    default:
      return `<blockquote class="box box-${label.kind}"><p class="box-label">${esc(label.name)}</p>${body}</blockquote>`;
  }
}

function table(t) {
  const html = marked.parser([t]);
  const small = t.rows.length <= 8;
  const blankRows = t.rows.filter(r => r.slice(1).every(c => !strip(c.text).trim())).length;
  const fill = t.rows.length >= 3 && blankRows >= t.rows.length * 0.6;
  return html.replace('<table>', `<table class="${small ? 'small' : 'long'}${fill ? ' fill-in' : ''}">`);
}

function block(t) {
  if (t.type === 'blockquote') { const label = labelOf(t); return label ? renderBox(t, label) : `<blockquote>${marked.parser(t.tokens)}</blockquote>`; }
  if (t.type === 'table') return table(t);
  return marked.parser([t]);
}

const leadsIn = (t, next) => t?.type === 'paragraph' && /:\s*$/.test(t.text) && next && ((next.type === 'list' && next.items.length <= 8) || (next.type === 'table' && next.rows.length <= 8));

// Turn the token stream into HTML, grouping blocks that must stay on the same page.
function renderTokens(tokens, state) {
  const out = [];
  const list = tokens.filter(t => t.type !== 'space');
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.type === 'heading' && t.depth <= 2) {
      const text = marked.parseInline(t.text);
      const plain = strip(text).trim();
      if (/^(table of )?contents$/i.test(plain)) { // the book makes its own contents page
        while (i + 1 < list.length && !(list[i + 1].type === 'heading' && list[i + 1].depth <= 2)) i++;
        continue;
      }
      const id = slug(plain) + '-' + state.toc.length;
      const chapter = /^chapter\s+(\d+)\s*[:.]?\s*(.*)$/i.exec(plain);
      state.inSources = /^(sources|references)\b/i.test(plain);
      if (chapter) {
        const n = chapter[1], name = chapter[2] || plain;
        state.toc.push({id, number: n, title: name});
        const art = state.chapterImages[String(Number(n))];
        out.push(`<section class="opener" id="${id}">${art ? `<div class="opener-art" style="background-image:url('${art}')"></div>` : '<div class="opener-band"></div>'}<p class="opener-label">Chapter ${esc(n)}</p><h2 class="chapter">${esc(name)}</h2></section>`);
      } else {
        state.toc.push({id, number: '', title: plain});
        out.push(`<h2 id="${id}" class="section-open">${text}</h2>`);
      }
      continue;
    }
    if (state.inSources && t.type === 'paragraph') {
      out.push(t.text.split(/\n+/).map(x => x.trim()).filter(Boolean).map(line => `<p class="source">${marked.parseInline(line).replace(/<a /g, '<a class="url" ')}</p>`).join(''));
      continue;
    }
    if (state.inSources && t.type === 'list') { out.push(`<div class="source-list">${marked.parser([t]).replace(/<a /g, '<a class="url" ')}</div>`); continue; }
    if (t.type === 'blockquote') {
      const label = labelOf(t);
      if (label?.kind === 'stat') {
        const group = [renderBox(t, label)];
        while (labelOf(list[i + 1])?.kind === 'stat' && group.length < 3) { i++; group.push(renderBox(list[i], labelOf(list[i]))); }
        out.push(`<div class="stats n${group.length}">${group.join('')}</div>`);
        continue;
      }
      if (label?.kind === 'before' && labelOf(list[i + 1])?.kind === 'after') {
        out.push(`<div class="ba">${renderBox(t, label)}<div class="ba-arrow">&#8594;</div>${renderBox(list[i + 1], labelOf(list[i + 1]))}</div>`);
        i++;
        continue;
      }
      out.push(block(t));
      continue;
    }
    if (t.type === 'heading' && t.depth >= 3) { out.push(marked.parser([t]).replace(/^<h(\d)>/, '<h$1 class="kw">')); continue; }
    if (leadsIn(t, list[i + 1])) { out.push(`<div class="keep">${block(t)}${block(list[++i])}</div>`); continue; }
    if (t.type === 'paragraph' && /:\s*$/.test(t.text)) { out.push(marked.parser([t]).replace(/^<p>/, '<p class="kw">')); continue; }
    out.push(block(t));
  }
  return out.join('\n');
}

export function bookHTML({title, subtitle = '', author = '', tagline = '', badge = '', parts = [], coverDataUrl = '', chapterImages = {}, accent = '#2f6f5e', pageSize = 'Letter'}) {
  if (!title) throw new Error('Give the book a title.');
  if (!Array.isArray(parts) || !parts.length) throw new Error('Give at least one Markdown part.');
  if (!/^#[0-9a-f]{6}$/i.test(accent)) accent = '#2f6f5e';
  const size = PAGE_SIZES[pageSize] ? pageSize : 'Letter';
  const [pageW, pageH] = PAGE_SIZES[size];
  const state = {toc: [], inSources: false, chapterImages};
  const body = parts.map(part => { state.inSources = false; return renderTokens(marked.lexer(String(part || ''), {gfm: true}), state); }).join('\n');
  const html = cite(clean(body));
  const cover = coverDataUrl ? `<div class="cover-art" style="background-image:url('${coverDataUrl}')"></div>` : '<div class="cover-art cover-plain"></div>';
  const toc = state.toc.map(item => `<li><a href="#${item.id}"><span class="toc-n">${item.number ? esc(String(item.number).padStart(2, '0')) : ''}</span><span class="toc-t">${esc(item.title)}</span></a></li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:${size};margin:17mm 17mm 19mm;@bottom-center{content:counter(page);font:9pt 'Segoe UI',Arial,sans-serif;color:#8a8a8a}}
@page cover{margin:0;@bottom-center{content:none}}
:root{--accent:${accent};--ink:#1f2328;--soft:color-mix(in srgb,var(--accent) 9%,#fff);--line:#e4e2dc}
*{box-sizing:border-box}
html{font-size:11.5pt}
body{margin:0;font-family:Georgia,'Times New Roman',serif;line-height:1.55;color:var(--ink)}
h1,h2,h3,h4,.box-label,.toc,th,.opener-label,.stat-number,.step-n,.tl-when,.badge,.toc-n{font-family:'Segoe UI',Arial,Helvetica,sans-serif}
a{color:var(--accent);text-decoration:none}

.cover{page:cover;position:relative;width:${pageW};height:${pageH};break-after:page;overflow:hidden;color:#fff}
.cover-art{position:absolute;left:0;right:0;top:0;height:71%;background-size:cover;background-position:center 35%}
.cover-plain{background:var(--accent)}
.cover-panel{position:absolute;left:0;right:0;bottom:0;height:29%;background:#15191d;border-top:2.2mm solid var(--accent)}
.cover-text{position:absolute;left:0;right:0;bottom:0;height:29%;padding:0 16mm;display:flex;flex-direction:column;justify-content:center}
.badge{position:absolute;top:14mm;left:16mm;background:#ffffff;color:var(--accent);font-weight:800;font-size:9pt;letter-spacing:.08em;text-transform:uppercase;padding:2.4mm 4.2mm;border-radius:10mm}
.cover h1{font-size:40pt;line-height:1.02;margin:0 0 4mm;font-weight:800;letter-spacing:-.01em}
.cover .sub{font-size:16pt;line-height:1.3;margin:0 0 4mm;font-family:'Segoe UI',Arial,sans-serif;font-weight:500}
.cover .tag{font-size:11.5pt;line-height:1.45;margin:0 0 5mm;color:#d9dde1;max-width:160mm}
.cover .rule{width:22mm;height:1.2mm;background:var(--accent);margin:0 0 3.5mm;border-radius:1mm}
.cover .by{font-size:10.5pt;letter-spacing:.14em;text-transform:uppercase;color:#d9dde1;margin:0;font-family:'Segoe UI',Arial,sans-serif}

.toc{break-after:page}
.toc h2{font-size:26pt;margin:0 0 7mm;color:var(--accent)}
.toc ol{list-style:none;padding:0;margin:0}
.toc li{border-bottom:1px solid var(--line);margin:0}
.toc a{display:flex;gap:5mm;align-items:baseline;padding:2.7mm 0;color:var(--ink)}
.toc-n{width:9mm;flex:0 0 9mm;color:var(--accent);font-weight:800;font-size:12pt}
.toc-t{font-size:12pt}

.opener{break-before:page;margin:0 0 6mm}
.opener-band{height:9mm;background:var(--accent);border-radius:2mm;margin:0 0 7mm}
.opener-art{height:78mm;background-size:cover;background-position:center;border-radius:3mm;margin:0 0 7mm}
.opener-label{margin:0 0 1mm;color:var(--accent);font-weight:800;letter-spacing:.16em;text-transform:uppercase;font-size:10pt}
h2.chapter{font-size:28pt;line-height:1.08;margin:0;color:var(--ink);font-weight:800}
h2.section-open{break-before:page;font-size:24pt;line-height:1.1;color:var(--accent);margin:0 0 6mm;padding-top:4mm;border-top:2.5mm solid var(--accent)}
h3{font-size:14pt;margin:6.5mm 0 2mm;color:var(--ink);font-weight:700}
h3::before{content:'';display:inline-block;width:2.4mm;height:2.4mm;background:var(--accent);border-radius:50%;margin:0 2.5mm .6mm 0;vertical-align:middle}
h4{font-size:11.5pt;margin:5mm 0 1mm}
p{margin:0 0 3mm;orphans:3;widows:3}
ul,ol{margin:0 0 3.5mm;padding-left:6mm}
li{margin:0 0 1.2mm}
li::marker{color:var(--accent);font-weight:700}
.keep{break-inside:avoid}
.kw{break-after:avoid}
.cite{font-size:7.5pt;color:#8b8b8b;vertical-align:super;line-height:0;font-family:'Segoe UI',Arial,sans-serif}

table{width:100%;border-collapse:collapse;margin:3mm 0 5mm;font-size:10pt}
table.small{break-inside:avoid}
thead{display:table-header-group}
tr{break-inside:avoid}
th{background:var(--accent);color:#fff;text-align:left;padding:2.2mm 2.6mm;font-weight:600}
td{border-bottom:1px solid var(--line);padding:2.2mm 2.6mm;vertical-align:top}
tr:nth-child(even) td{background:#f7f6f2}
table.fill-in td{height:9mm;background:#fff}
table.fill-in td:first-child{background:var(--soft)}

blockquote{margin:4mm 0;padding:3.6mm 4.6mm;border-left:1.6mm solid #ccc;background:#f6f6f4;break-inside:avoid;border-radius:0 2mm 2mm 0}
blockquote p:last-child,blockquote ul:last-child,blockquote ol:last-child{margin-bottom:0}
.box-label{font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:8.5pt;margin:0 0 1.6mm}
.box-short{background:var(--soft);border-left-color:var(--accent);font-size:12.5pt;line-height:1.5}
.box-short .box-label{color:var(--accent)}
.box-try{background:#fff6df;border-left-color:#e0a100}.box-try .box-label{color:#9a6b00}
.box-remember{background:#edf2fb;border-left-color:#3d6fb6}.box-remember .box-label{color:#2c5491}
.box-safety{background:#fdf0ec;border-left-color:#c8553d}.box-safety .box-label{color:#a5402b}
.box-red{background:#fbe8e8;border-left-color:#b3261e}.box-red .box-label{color:#b3261e}
.box-tip{background:#eef7f1;border-left-color:#3f8f5f}.box-tip .box-label{color:#2f7049}
.box-from{background:#f5effa;border-left-color:#7a4fa3}.box-from .box-label{color:#5f3a85}

.stats{display:grid;gap:4mm;margin:5mm 0;break-inside:avoid}
.stats.n1{grid-template-columns:1fr}.stats.n2{grid-template-columns:1fr 1fr}.stats.n3{grid-template-columns:1fr 1fr 1fr}
.stat{background:var(--accent);color:#fff;border-radius:3mm;padding:5mm 5mm 4.5mm}
.stats.n1 .stat{display:flex;gap:6mm;align-items:center}
.stat-number{font-size:30pt;font-weight:800;line-height:1;margin:0 0 2mm;white-space:nowrap}
.stats.n1 .stat-number{margin:0}
.stat-caption{font-size:10.5pt;line-height:1.4}
.stat-caption p{margin:0}.stat .cite{color:#dfe9e5}
.steps{margin:5mm 0;break-inside:avoid}
.steps-intro p{font-weight:700;margin-bottom:2.5mm}
.steps-row{display:grid;gap:3mm}
.steps-row.n1{grid-template-columns:1fr}.steps-row.n2{grid-template-columns:1fr 1fr}.steps-row.n3{grid-template-columns:1fr 1fr 1fr}.steps-row.n4{grid-template-columns:1fr 1fr 1fr 1fr}.steps-row.n5{grid-template-columns:1fr 1fr 1fr}
.step{background:var(--soft);border-radius:3mm;padding:4mm 3.5mm;font-size:10.2pt;line-height:1.4}
.step-n{width:8mm;height:8mm;border-radius:50%;background:var(--accent);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 0 2.5mm;font-size:11pt}
.step-t p{margin:0}
.checklist{border:1.4px dashed var(--accent);border-radius:3mm;padding:4.5mm 5mm;margin:5mm 0;break-inside:avoid}
.checklist .box-label{color:var(--accent)}
.checklist ul{list-style:none;padding:0;margin:0}
.checklist li{display:flex;gap:3mm;align-items:flex-start;padding:1.5mm 0;border-bottom:1px solid var(--line);margin:0}
.checklist li:last-child{border-bottom:0}
.tick{flex:0 0 4.4mm;height:4.4mm;border:1.6px solid var(--accent);border-radius:1mm;margin-top:1mm}
.timeline{margin:5mm 0 5mm 3mm;padding-left:6mm;border-left:1.2mm solid var(--accent)}
.tl-intro p{font-weight:700}
.tl-item{position:relative;margin:0 0 3.5mm;padding-left:2mm;break-inside:avoid}
.tl-item::before{content:'';position:absolute;left:-10.2mm;top:.8mm;width:4.6mm;height:4.6mm;border-radius:50%;background:#fff;border:1.2mm solid var(--accent)}
.tl-when{font-weight:800;color:var(--accent);font-size:10pt;text-transform:uppercase;letter-spacing:.05em}
.tl-what p{margin:0}
.ba{display:grid;grid-template-columns:1fr 8mm 1fr;align-items:stretch;margin:5mm 0;break-inside:avoid}
.ba-side{border-radius:3mm;padding:4.5mm}
.ba-before{background:#f3f1ec}.ba-before .box-label{color:#7a746a}
.ba-after{background:var(--soft)}.ba-after .box-label{color:var(--accent)}
.ba-arrow{display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:18pt;font-weight:800}
.ba ul,.ba p:last-child{margin-bottom:0}
blockquote.pull{background:none;border:0;border-top:1.2mm solid var(--accent);border-bottom:1px solid var(--line);border-radius:0;padding:4mm 2mm;font-size:16pt;line-height:1.35;font-style:italic;color:var(--accent);text-align:center;margin:6mm 6mm}
.key-idea{background:var(--ink);color:#fff;border-radius:3mm;padding:5mm 6mm;margin:5mm 0;break-inside:avoid;font-size:12pt}
.key-idea .box-label{color:#cfe7df}.key-idea p{margin:0}.key-idea .cite{color:#bbb}

p.source,.source-list li{font-size:8.6pt;line-height:1.4;margin:0 0 1.8mm;break-inside:avoid}
p.source{padding-left:6mm;text-indent:-6mm}
a.url{word-break:break-all;color:#555}
img{max-width:100%;height:auto;display:block;margin:4mm auto;border-radius:2mm;break-inside:avoid}
hr{border:0;border-top:1px solid var(--line);margin:6mm 0}
code{font-family:Consolas,monospace;font-size:9.5pt}
</style></head><body>
<section class="cover">${cover}<div class="cover-panel"></div>${badge ? `<div class="badge">${esc(badge)}</div>` : ''}<div class="cover-text"><h1>${esc(title)}</h1>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}${tagline ? `<p class="tag">${esc(tagline)}</p>` : ''}${author ? `<div class="rule"></div><p class="by">${esc(author)}</p>` : ''}</div></section>
<nav class="toc"><h2>Contents</h2><ol>${toc}</ol></nav>
<main>${html}</main>
</body></html>`;
}

export function imageDataUrl(bytes, name) {
  const ext = String(name).toLowerCase().split('.').pop();
  const type = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'}[ext];
  if (!type) throw new Error('Images must be PNG, JPEG or WebP.');
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}
