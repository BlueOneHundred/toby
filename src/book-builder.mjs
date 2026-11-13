// Toby: assemble a print-ready ebook from Markdown parts in the team folder.
// Bots write chapters as Markdown; this turns them into one styled, self-contained HTML book
// (cover, contents, chapter openers, styled boxes, tables, sources) that make_pdf prints.
import {marked} from 'marked';

const BOXES = [
  ['The short version', 'short'], ['Try tonight', 'try'], ['Try this', 'try'], ['Remember', 'remember'],
  ['Safety note', 'safety'], ['Red flag', 'red'], ['Tip', 'tip'],
];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = value => String(value).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';

export function styleBoxes(html) {
  return html.replace(/<blockquote>\s*<p>(?:<strong>)?([^<:]{2,60}?):(?:<\/strong>)?/g, (whole, label) => {
    const clean = label.trim();
    const known = BOXES.find(([name]) => name.toLowerCase() === clean.toLowerCase());
    const kind = known ? known[1] : (/^from\b/i.test(clean) ? 'from' : null);
    if (!kind) return whole;
    return `<blockquote class="box box-${kind}"><p class="box-label">${clean}</p><p>`; // label is already escaped by marked and contains no tags
  });
}

function prepare(markdown) {
  let html = marked.parse(String(markdown || ''), {gfm: true, breaks: false, async: false});
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+="[^"]*"/gi, '');
  html = styleBoxes(html);
  html = html.replace(/\[(S\d+(?:\s*,\s*S\d+)*)\]/g, '<span class="cite">[$1]</span>');
  return html;
}

export function bookHTML({title, subtitle = '', author = '', parts = [], coverDataUrl = '', accent = '#2f6f5e', pageSize = 'Letter'}) {
  if (!title) throw new Error('Give the book a title.');
  if (!Array.isArray(parts) || !parts.length) throw new Error('Give at least one Markdown part.');
  if (!/^#[0-9a-f]{6}$/i.test(accent)) accent = '#2f6f5e';
  let body = parts.map(prepare).join('\n');
  const toc = [];
  body = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const id = slug(inner) + '-' + toc.length;
    const chapter = /^\s*chapter\s+\d+/i.test(inner.replace(/<[^>]+>/g, ''));
    toc.push({id, text: inner.replace(/<[^>]+>/g, '')});
    return `<h2 id="${id}" class="${chapter ? 'chapter' : 'section-open'}">${inner}</h2>`;
  });
  const size = pageSize === 'A4' ? 'A4' : pageSize === 'A5' ? 'A5' : 'Letter';
  const cover = coverDataUrl ? `<div class="cover-art" style="background-image:url('${coverDataUrl}')"></div>` : '<div class="cover-art cover-plain"></div>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:${size};margin:22mm 20mm 24mm;@bottom-center{content:counter(page);font:10pt Georgia,serif;color:#777}}
@page cover{margin:0;@bottom-center{content:none}}
:root{--accent:${accent}}
*{box-sizing:border-box}
html{font-size:11.5pt}
body{margin:0;font-family:Georgia,'Times New Roman',serif;line-height:1.55;color:#1d1d1d}
h1,h2,h3,h4,.box-label,.toc,th{font-family:'Segoe UI',Arial,Helvetica,sans-serif}
.cover{page:cover;position:relative;width:100%;height:100vh;break-after:page;overflow:hidden;color:#fff}
.cover-art{position:absolute;inset:0;background-size:cover;background-position:center}
.cover-plain{background:linear-gradient(160deg,var(--accent),#111)}
.cover-text{position:absolute;left:0;right:0;bottom:0;padding:22mm 18mm;background:linear-gradient(transparent,rgba(0,0,0,.72) 30%)}
.cover h1{font-size:34pt;line-height:1.08;margin:0 0 6mm;font-weight:800}
.cover .sub{font-size:15pt;margin:0 0 8mm;opacity:.95}
.cover .by{font-size:12pt;letter-spacing:.08em;text-transform:uppercase;opacity:.9}
.toc{break-after:page}
.toc h2{font-size:20pt;margin:0 0 6mm;color:var(--accent)}
.toc ol{list-style:none;padding:0;margin:0}
.toc li{padding:2.2mm 0;border-bottom:1px solid #e3e3e3;font-size:11.5pt}
.toc a{color:#1d1d1d;text-decoration:none}
h2{font-size:21pt;line-height:1.15;color:var(--accent);margin:0 0 6mm}
h2.chapter,h2.section-open{break-before:page;padding-top:10mm;border-top:3mm solid var(--accent)}
h3{font-size:13.5pt;margin:7mm 0 2mm;color:#222;break-after:avoid}
h4{font-size:11.5pt;margin:5mm 0 1mm}
p{margin:0 0 3.2mm;orphans:3;widows:3}
ul,ol{margin:0 0 3.5mm;padding-left:6mm}
li{margin:0 0 1.2mm}
a{color:var(--accent)}
.cite{font-size:8pt;color:#777;vertical-align:super;line-height:0}
table{width:100%;border-collapse:collapse;margin:3mm 0 5mm;font-size:10pt;break-inside:avoid}
th{background:var(--accent);color:#fff;text-align:left;padding:2mm 2.5mm;font-weight:600}
td{border-bottom:1px solid #ddd;padding:2mm 2.5mm;vertical-align:top}
tr:nth-child(even) td{background:#f6f6f4}
blockquote{margin:4mm 0;padding:3.5mm 4.5mm;border-left:1.5mm solid #ccc;background:#f6f6f4;break-inside:avoid}
blockquote p:last-child{margin-bottom:0}
.box{border-radius:2mm}
.box-label{font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:9pt;margin:0 0 1.5mm}
.box-short{background:color-mix(in srgb,var(--accent) 12%,#fff);border-left-color:var(--accent)}
.box-short .box-label{color:var(--accent)}
.box-try{background:#fff6e0;border-left-color:#e0a100}.box-try .box-label{color:#9a6b00}
.box-remember{background:#eef3fb;border-left-color:#3d6fb6}.box-remember .box-label{color:#2c5491}
.box-safety{background:#fdf0ec;border-left-color:#c8553d}.box-safety .box-label{color:#a5402b}
.box-red{background:#fbe9e9;border-left-color:#b3261e}.box-red .box-label{color:#b3261e}
.box-tip{background:#eef7f1;border-left-color:#3f8f5f}.box-tip .box-label{color:#2f7049}
.box-from{background:#f5effa;border-left-color:#7a4fa3}.box-from .box-label{color:#5f3a85}
img{max-width:100%;height:auto;display:block;margin:4mm auto;break-inside:avoid}
hr{border:0;border-top:1px solid #ddd;margin:6mm 0}
code{font-family:Consolas,monospace;font-size:9.5pt}
</style></head><body>
<section class="cover">${cover}<div class="cover-text"><h1>${esc(title)}</h1>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}${author ? `<p class="by">${esc(author)}</p>` : ''}</div></section>
<nav class="toc"><h2>Contents</h2><ol>${toc.map(item => `<li><a href="#${item.id}">${esc(item.text)}</a></li>`).join('')}</ol></nav>
<main>${body}</main>
</body></html>`;
}

export function imageDataUrl(bytes, name) {
  const ext = String(name).toLowerCase().split('.').pop();
  const type = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'}[ext];
  if (!type) throw new Error('The cover must be a PNG, JPEG or WebP image.');
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}
