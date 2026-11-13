// Toby: ebook design themes for make_book. Each theme sets fonts, colours, the cover, the title page,
// the chapter opener and the page furniture. Everything is solid colour (no transparency) so every
// PDF viewer shows the book the same way. Fonts are bundled (SIL Open Font License, see book-fonts/LICENSES.txt).
import {readFileSync} from 'node:fs';

const FONT_DIR = new URL('./book-fonts/', import.meta.url);
const fontCache = new Map();
function face(family, file, weight, style = 'normal') {
  if (!fontCache.has(file)) fontCache.set(file, readFileSync(new URL(file + '.woff2', FONT_DIR)).toString('base64'));
  return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${fontCache.get(file)}) format('woff2');font-weight:${weight};font-style:${style};font-display:block}`;
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];

export const ICONS = {
  try: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  remember: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  safety: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.6v.2"/></svg>',
  red: '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/></svg>',
  tip: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  from: '<svg viewBox="0 0 24 24"><circle cx="7" cy="10" r="1.8"/><circle cx="17" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><path d="M12 12.5c-3 0-5.5 3-5.5 5.2 0 1.6 1.4 2.3 3 2.3 1 0 1.6-.4 2.5-.4s1.5.4 2.5.4c1.6 0 3-.7 3-2.3 0-2.2-2.5-5.2-5.5-5.2z"/></svg>',
  key: '<svg viewBox="0 0 24 24"><path d="M12 3l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5z"/></svg>',
};

// Shared rules every theme builds on.
const BASE = ({pageW, pageH}) => `
*{box-sizing:border-box}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{color:var(--ink);font-family:var(--body);font-size:var(--size);line-height:var(--leading);hyphens:auto;font-kerning:normal;font-variant-ligatures:common-ligatures}
a{color:var(--accent);text-decoration:none}
.page-cover,.page-opener{width:${pageW};height:calc(${pageH} - 0.6mm);position:relative;overflow:hidden;break-after:page}
.page-cover{page:cover}.page-opener{page:opener;break-before:page}
.title-page{break-after:page;height:calc(${pageH} - 40mm);display:flex;flex-direction:column;justify-content:center}
.toc{break-after:page}
.toc ol{list-style:none;padding:0;margin:0}
.toc a{display:flex;align-items:baseline;gap:5mm;color:var(--ink)}
.toc .dots{flex:1;border-bottom:1px dotted var(--line2);transform:translateY(-1mm)}
p{margin:0 0 3mm;orphans:3;widows:3}
ul,ol{margin:0 0 3.6mm;padding-left:5.5mm}
li{margin:0 0 1.3mm;padding-left:1mm}
li::marker{color:var(--accent)}
.keep{break-inside:avoid}.kw{break-after:avoid}
h3,h4{break-after:avoid}
.cite{font-family:var(--label);font-size:6.6pt;color:var(--muted);vertical-align:super;line-height:0;letter-spacing:0;font-weight:500}
table{width:100%;border-collapse:collapse;margin:3mm 0 5.5mm;font-size:calc(var(--size) - 1.2pt);line-height:1.45}
table.small{break-inside:avoid}
thead{display:table-header-group}
tr{break-inside:avoid}
td,th{text-align:left;vertical-align:top}
table.fill-in td{height:10mm}
.box,.checklist,.stats,.steps,.ba,.timeline,.key-idea,blockquote{break-inside:avoid}
.box{position:relative;margin:5mm 0}
.box .ico{position:absolute;width:7.5mm;height:7.5mm;border-radius:50%;display:flex;align-items:center;justify-content:center}
.box .ico svg{width:4.4mm;height:4.4mm;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
.box-label{font-family:var(--label);font-weight:800;text-transform:uppercase;letter-spacing:.12em;font-size:7.4pt;margin:0 0 1.6mm}
.box p:last-child,.box ul:last-child,.box ol:last-child{margin-bottom:0}
.stats{display:grid;gap:4mm;margin:5.5mm 0}
.stats.n1{grid-template-columns:1fr}.stats.n2{grid-template-columns:1fr 1fr}.stats.n3{grid-template-columns:1fr 1fr 1fr}
.stat-caption p{margin:0}
.steps{margin:5.5mm 0}.steps-intro p{margin:0 0 2.5mm}
.steps-row{display:grid;gap:3mm}
.steps-row.n1{grid-template-columns:1fr}.steps-row.n2{grid-template-columns:1fr 1fr}.steps-row.n3,.steps-row.n5{grid-template-columns:1fr 1fr 1fr}.steps-row.n4{grid-template-columns:1fr 1fr}
.step-t p{margin:0}
.checklist{margin:5.5mm 0}.checklist ul{list-style:none;padding:0;margin:0}
.checklist li{display:flex;gap:3.2mm;align-items:flex-start;margin:0;padding:1.7mm 0}
.tick{flex:0 0 4.2mm;height:4.2mm;margin-top:.8mm}
.ba{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:5.5mm 0}
.ba-side p:last-child,.ba-side ul:last-child{margin-bottom:0}
.timeline{margin:5.5mm 0}.tl-item{position:relative;break-inside:avoid}.tl-what p{margin:0}
.key-idea p{margin:0}
p.source,.source-list li{font-size:7.6pt;line-height:1.42;margin:0 0 1.6mm;break-inside:avoid;hyphens:none}
p.source{padding-left:5mm;text-indent:-5mm}
a.url{word-break:break-all;color:var(--muted)}
img{max-width:100%;height:auto;display:block;margin:4mm auto;break-inside:avoid}
hr{border:0;border-top:1px solid var(--line);margin:6mm 0}
.opener-art{background-size:cover;background-position:center}
`;

const icon = kind => ICONS[{try: 'try', remember: 'remember', safety: 'safety', red: 'red', tip: 'tip', from: 'from', 'key-idea': 'key'}[kind] || 'tip'];

export const THEMES = {
  // A: warm, editorial lifestyle book. Cream paper, terracotta and sage, soft serif display.
  warm: {
    name: 'Warm Editorial',
    fonts: () => [face('Fraunces', 'fraunces-400-normal', 400), face('Fraunces', 'fraunces-600-normal', 600), face('Fraunces', 'fraunces-800-normal', 800), face('Fraunces', 'fraunces-400-italic', 400, 'italic'),
      face('Source Serif 4', 'source-serif-4-400-normal', 400), face('Source Serif 4', 'source-serif-4-600-normal', 600), face('Source Serif 4', 'source-serif-4-400-italic', 400, 'italic'),
      face('Manrope', 'manrope-500-normal', 500), face('Manrope', 'manrope-700-normal', 700), face('Manrope', 'manrope-800-normal', 800)].join(''),
    css: ({pageSize, title}) => `
:root{--paper:#FBF6EE;--ink:#2B2420;--muted:#857869;--accent:#B5583A;--accent2:#5F7F5B;--sand:#F3E5D5;--sage:#E5ECDF;--line:#E5D8C7;--line2:#CDBBA6;
--display:'Fraunces',Georgia,serif;--body:'Source Serif 4',Georgia,serif;--label:'Manrope','Segoe UI',sans-serif;--size:10.6pt;--leading:1.62}
@page{size:${pageSize};margin:19mm 17mm 18mm;background:#FBF6EE;
 @top-center{content:"${esc(title).toUpperCase()}";font:700 6.6pt 'Manrope',sans-serif;letter-spacing:.24em;color:#B4A693;padding-top:6mm}
 @bottom-center{content:counter(page);font:600 8pt 'Manrope',sans-serif;color:#9C8E7E}}
@page cover{margin:0;background:#FBF6EE;@top-center{content:none}@bottom-center{content:none}}
@page opener{margin:0;background:#FBF6EE;@top-center{content:none}@bottom-center{content:none}}
@page front{@top-center{content:none}@bottom-center{content:none}}
.title-page,.toc{page:front}
h3{font-family:var(--display);font-weight:600;font-size:15pt;line-height:1.2;margin:7.5mm 0 2.4mm;padding-top:3.5mm;color:var(--ink);letter-spacing:-.005em;background:linear-gradient(#B5583A,#B5583A) no-repeat left top/8mm .9mm}
h4{font-family:var(--label);font-size:9pt;text-transform:uppercase;letter-spacing:.1em;margin:5mm 0 1.5mm}
h2.section-open{font-family:var(--display);font-weight:800;font-size:28pt;line-height:1.05;margin:0 0 8mm;color:var(--ink);break-before:page}
h2.section-open::before{content:'';display:block;width:14mm;height:1.2mm;background:var(--accent);margin:0 0 6mm}
strong{font-weight:600}
th{font-family:var(--label);font-weight:800;font-size:6.9pt;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);padding:0 3mm 2.2mm 0;border-bottom:1.4px solid var(--ink)}
td{padding:2.4mm 3mm 2.4mm 0;border-bottom:1px solid var(--line)}
table.fill-in td:first-child{color:var(--muted)}
.box{background:var(--sand);border-radius:4mm;padding:5mm 6mm 5mm 17mm}
.box .ico{left:5.5mm;top:5mm;background:var(--accent);color:#FBF6EE}
.box .box-label{color:var(--accent)}
.box-remember{background:var(--sage)}.box-remember .ico{background:var(--accent2)}.box-remember .box-label{color:var(--accent2)}
.box-remember ul{list-style:none;padding:0}.box-remember li{padding-left:5mm;position:relative}.box-remember li::before{content:'';position:absolute;left:0;top:2.3mm;width:2mm;height:2mm;border-radius:50%;background:var(--accent2)}
.box-safety,.box-red{background:#F6DED5}.box-safety .ico,.box-red .ico{background:#A23F2B}.box-safety .box-label,.box-red .box-label{color:#A23F2B}
.box-tip,.box-from{background:#EFE8DA}.box-from .ico{background:#8A6D4C}.box-from .box-label{color:#8A6D4C}
.box-plain{background:#F1EBE1;padding-left:6mm}
.stat{border-top:1.4px solid var(--ink);border-bottom:1px solid var(--line);padding:4mm 0;display:flex;gap:5mm;align-items:baseline}
.stats.n2 .stat,.stats.n3 .stat{display:block}
.stat-number{font-family:var(--display);font-weight:800;font-size:38pt;line-height:.95;color:var(--accent);white-space:nowrap;letter-spacing:-.02em}
.stat-caption{font-size:10.2pt;line-height:1.45;font-style:italic}
.steps-intro p{font-family:var(--label);font-weight:800;font-size:7.4pt;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
.step{background:#FFFFFF;border:1px solid var(--line);border-radius:3.5mm;padding:4mm 4.5mm;font-size:9.8pt;line-height:1.45}
.step-n{font-family:var(--display);font-weight:800;font-size:22pt;line-height:1;color:var(--accent);margin:0 0 2mm}
.checklist{background:#FFFFFF;border:1px solid var(--line2);border-radius:4mm;padding:5mm 6mm}
.checklist .box-label{color:var(--accent)}
.checklist li{border-bottom:1px solid var(--line)}.checklist li:last-child{border-bottom:0}
.tick{border:1.5px solid var(--accent);border-radius:1mm}
.ba-side{border-radius:4mm;padding:5mm}.ba-before{background:#EFE8DA}.ba-after{background:var(--sage)}
.ba-before .box-label{color:var(--muted)}.ba-after .box-label{color:var(--accent2)}
.timeline{border-left:1.2px solid var(--line2);margin-left:2mm;padding-left:7mm}
.tl-item{margin:0 0 4mm}.tl-item::before{content:'';position:absolute;left:-9.3mm;top:1.3mm;width:3.6mm;height:3.6mm;border-radius:50%;background:var(--accent)}
.tl-when{font-family:var(--label);font-weight:800;font-size:7.4pt;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
blockquote.pull{background:none;border:0;margin:7mm 4mm;padding:0;font-family:var(--display);font-style:italic;font-size:17pt;line-height:1.35;color:var(--accent)}
blockquote.pull::before{content:'\\201C';display:block;font-size:44pt;line-height:.5;margin:3mm 0 1mm;color:var(--line2)}
.key-idea{background:var(--ink);color:#FBF6EE;border-radius:4mm;padding:6mm 7mm;font-family:var(--display);font-size:13pt;line-height:1.4}
.key-idea .box-label{color:#E7B8A6;font-size:7pt}
.cover{background:#FBF6EE}
.cover-badge{position:absolute;top:13mm;left:0;right:0;text-align:center;font:800 7pt var(--label);letter-spacing:.3em;text-transform:uppercase;color:var(--accent)}
.cover-photo{position:absolute;top:24mm;left:15mm;right:15mm;height:58%;border-radius:5mm;background-size:cover;background-position:center 35%;background-color:#E9DCCB}
.cover-text{position:absolute;left:15mm;right:15mm;bottom:15mm}
.cover h1{font-family:var(--display);font-weight:800;font-size:44pt;line-height:.98;margin:0 0 3.5mm;letter-spacing:-.025em;color:var(--ink)}
.cover .sub{font-family:var(--display);font-style:italic;font-size:15pt;line-height:1.3;margin:0 0 4mm;color:var(--accent)}
.cover .tag{font-family:var(--label);font-weight:500;font-size:8.6pt;line-height:1.5;margin:0;color:var(--muted)}
.cover .by{font-family:var(--label);font-weight:800;font-size:7.4pt;letter-spacing:.24em;text-transform:uppercase;margin:4mm 0 0;color:var(--ink)}
.title-page{text-align:center;align-items:center}
.title-page .tp-title{font-family:var(--display);font-weight:800;font-size:32pt;line-height:1.05;margin:0 0 4mm}
.title-page .tp-sub{font-family:var(--display);font-style:italic;font-size:13pt;color:var(--accent);margin:0 0 9mm}
.title-page .tp-rule{width:14mm;height:1px;background:var(--line2);margin:0 auto 9mm}
.title-page .tp-note{font-size:9.6pt;color:var(--muted);max-width:105mm;line-height:1.55}
.toc h2{font-family:var(--display);font-weight:800;font-size:30pt;margin:0 0 9mm;color:var(--ink)}
.toc li{margin:0;padding:0}
.toc a{padding:2.9mm 0;font-size:11pt}
.toc .toc-n{font-family:var(--display);font-weight:800;font-size:13pt;color:var(--accent);width:9mm;flex:0 0 9mm}
.toc .toc-t{font-family:var(--body)}
.opener-art{position:absolute;top:0;left:0;right:0;height:52%}
.opener-art.none{background:#5F7F5B;background-image:radial-gradient(#6E8E69 1.1mm,#5F7F5B 1.2mm);background-size:7mm 7mm}
.opener-body{position:absolute;left:17mm;right:17mm;top:calc(52% + 9mm)}
.opener-label{font:800 7.4pt var(--label);letter-spacing:.3em;text-transform:uppercase;color:var(--accent);margin:0}
.opener-num{font-family:var(--display);font-weight:800;font-size:96pt;line-height:.85;color:var(--accent);margin:1mm 0 4mm;letter-spacing:-.04em}
h2.chapter{font-family:var(--display);font-weight:800;font-size:30pt;line-height:1.02;margin:0 0 6mm;letter-spacing:-.02em;color:var(--ink)}
.opener-short{font-family:var(--display);font-style:italic;font-size:12.6pt;line-height:1.5;color:var(--ink);border-left:1.2mm solid var(--accent);padding-left:5mm;margin:0}
.opener-short p{margin:0}
`,
    cover: ({title, subtitle, tagline, badge, author, coverDataUrl}) => `<section class="page-cover cover">${badge ? `<div class="cover-badge">${esc(badge)}</div>` : ''}<div class="cover-photo"${coverDataUrl ? ` style="background-image:url('${coverDataUrl}')"` : ''}></div><div class="cover-text"><h1>${esc(title)}</h1>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}${tagline ? `<p class="tag">${esc(tagline)}</p>` : ''}${author ? `<p class="by">${esc(author)}</p>` : ''}</div></section>`,
    opener: ({n, name, art, short}) => `<section class="page-opener"><div class="opener-art${art ? '' : ' none'}"${art ? ` style="background-image:url('${art}')"` : ''}></div><div class="opener-body"><p class="opener-label">Chapter</p><div class="opener-num">${esc(String(n).padStart(2, '0'))}</div><h2 class="chapter">${esc(name)}</h2>${short ? `<div class="opener-short">${short}</div>` : ''}</div></section>`,
  },

  // B: fresh, modern guide. White, deep teal and marigold, geometric sans display.
  modern: {
    name: 'Fresh Modern',
    fonts: () => [face('Outfit', 'outfit-400-normal', 400), face('Outfit', 'outfit-600-normal', 600), face('Outfit', 'outfit-800-normal', 800),
      face('Inter', 'inter-400-normal', 400), face('Inter', 'inter-600-normal', 600), face('Inter', 'inter-700-normal', 700)].join(''),
    css: ({pageSize, title}) => `
:root{--paper:#FFFFFF;--ink:#14213A;--muted:#66717F;--accent:#156A5F;--pop:#F2B23E;--mint:#E6F2EF;--cream:#FFF4D9;--line:#E2E7EC;--line2:#C9D2DA;
--display:'Outfit','Segoe UI',sans-serif;--body:'Inter','Segoe UI',sans-serif;--label:'Outfit','Segoe UI',sans-serif;--size:9.6pt;--leading:1.68}
@page{size:${pageSize};margin:18mm 16mm 18mm;
 @top-left{content:"${esc(title)}";font:600 7.4pt 'Outfit',sans-serif;color:#9AA4AF;padding-top:6mm}
 @bottom-right{content:counter(page);font:800 8.5pt 'Outfit',sans-serif;color:#156A5F}}
@page cover{margin:0;@top-left{content:none}@bottom-right{content:none}}
@page opener{margin:0;background:#156A5F;@top-left{content:none}@bottom-right{content:none}}
@page front{@top-left{content:none}@bottom-right{content:none}}
.title-page,.toc{page:front}
h3{font-family:var(--display);font-weight:800;font-size:14.5pt;line-height:1.2;margin:7.5mm 0 2.6mm;color:var(--ink)}
h3::after{content:'';display:block;width:10mm;height:1.3mm;border-radius:1mm;background:var(--pop);margin:2mm 0 0}
h4{font-family:var(--display);font-weight:600;font-size:11pt;margin:5mm 0 1.5mm;color:var(--accent)}
h2.section-open{font-family:var(--display);font-weight:800;font-size:28pt;line-height:1.05;margin:0 0 8mm;color:var(--accent);break-before:page}
strong{font-weight:700}
th{font-family:var(--display);font-weight:600;font-size:8.4pt;color:#FFFFFF;background:var(--accent);padding:2.6mm 3mm}
th:first-child{border-radius:2.5mm 0 0 2.5mm}th:last-child{border-radius:0 2.5mm 2.5mm 0}
td{padding:2.5mm 3mm;border-bottom:1px solid var(--line)}
tr:nth-child(even) td{background:#F6F9FA}
table.fill-in td{background:#FFFFFF}table.fill-in td:first-child{background:var(--mint)}
.box{background:var(--mint);border-radius:5mm;padding:5mm 6mm 5mm 17mm}
.box .ico{left:5.5mm;top:4.6mm;background:var(--accent);color:#FFFFFF}
.box .box-label{color:var(--accent)}
.box-try{background:var(--cream)}.box-try .ico{background:var(--pop);color:var(--ink)}.box-try .box-label{color:#9A6A10}
.box-remember{background:#FFFFFF;border:1.5px solid var(--accent)}
.box-safety,.box-red{background:#FDE9E4}.box-safety .ico,.box-red .ico{background:#C2452D}.box-safety .box-label,.box-red .box-label{color:#C2452D}
.box-from{background:#EEEAF7}.box-from .ico{background:#5B4A9A}.box-from .box-label{color:#5B4A9A}
.box-plain{background:#F3F6F8;padding-left:6mm}
.stat{background:var(--accent);color:#FFFFFF;border-radius:5mm;padding:5mm 6mm;display:flex;gap:5mm;align-items:center}
.stats.n2 .stat,.stats.n3 .stat{display:block}
.stat-number{font-family:var(--display);font-weight:800;font-size:34pt;line-height:1;color:var(--pop);white-space:nowrap}
.stat-caption{font-size:9.6pt;line-height:1.45}.stat .cite{color:#BFE0DA}
.steps-intro p{font-family:var(--display);font-weight:800;font-size:11pt;color:var(--ink)}
.step{background:var(--mint);border-radius:4.5mm;padding:4.5mm;font-size:9.2pt;line-height:1.5}
.step-n{width:8.5mm;height:8.5mm;border-radius:50%;background:var(--pop);color:var(--ink);font:800 11pt var(--display);display:flex;align-items:center;justify-content:center;margin:0 0 2.6mm}
.checklist{background:#FFFFFF;border:1.5px solid var(--line2);border-radius:5mm;padding:5mm 6mm}
.checklist .box-label{color:var(--accent)}
.checklist li{border-bottom:1px dashed var(--line2)}.checklist li:last-child{border-bottom:0}
.tick{border:2px solid var(--accent);border-radius:1.2mm}
.ba-side{border-radius:5mm;padding:5mm}.ba-before{background:#F3F6F8}.ba-after{background:var(--mint)}
.ba-before .box-label{color:var(--muted)}.ba-after .box-label{color:var(--accent)}
.timeline{margin-left:3mm;padding-left:8mm;border-left:2px solid var(--line2)}
.tl-item{margin:0 0 4mm}.tl-item::before{content:'';position:absolute;left:-11.2mm;top:.6mm;width:4.6mm;height:4.6mm;border-radius:50%;background:var(--pop);border:1.2mm solid #FFFFFF}
.tl-when{font-family:var(--display);font-weight:800;font-size:9pt;color:var(--accent)}
blockquote.pull{background:var(--cream);border:0;border-radius:5mm;margin:6mm 0;padding:6mm 7mm;font-family:var(--display);font-weight:600;font-size:15pt;line-height:1.35;color:var(--ink)}
.key-idea{background:var(--ink);color:#FFFFFF;border-radius:5mm;padding:6mm 7mm;font-family:var(--display);font-weight:600;font-size:12.5pt;line-height:1.4}
.key-idea .box-label{color:var(--pop)}
.cover-photo{position:absolute;top:0;left:0;right:0;height:64%;background-size:cover;background-position:center 35%;background-color:#D9E6E3}
.cover-panel{position:absolute;left:0;right:0;bottom:0;height:36%;background:#156A5F}
.cover-badge{position:absolute;top:12mm;left:13mm;background:#F2B23E;color:#14213A;font:800 7.6pt var(--label);letter-spacing:.06em;text-transform:uppercase;padding:2.4mm 4.6mm;border-radius:10mm}
.cover-text{position:absolute;left:14mm;right:14mm;bottom:0;height:36%;display:flex;flex-direction:column;justify-content:center;color:#FFFFFF}
.cover h1{font-family:var(--display);font-weight:800;font-size:42pt;line-height:1;margin:0 0 3mm;letter-spacing:-.01em}
.cover .sub{font-family:var(--display);font-weight:600;font-size:14pt;line-height:1.3;margin:0 0 3mm;color:#F2B23E}
.cover .tag{font-size:9pt;line-height:1.5;margin:0;color:#D3E8E4}
.cover .by{font-family:var(--display);font-weight:600;font-size:9pt;letter-spacing:.14em;text-transform:uppercase;margin:4mm 0 0;color:#FFFFFF}
.title-page .tp-title{font-family:var(--display);font-weight:800;font-size:32pt;line-height:1.05;margin:0 0 3mm;color:var(--accent)}
.title-page .tp-sub{font-family:var(--display);font-weight:600;font-size:13pt;margin:0 0 8mm}
.title-page .tp-rule{width:12mm;height:1.3mm;border-radius:1mm;background:var(--pop);margin:0 0 8mm}
.title-page .tp-note{font-size:9.4pt;color:var(--muted);max-width:110mm;line-height:1.6}
.toc h2{font-family:var(--display);font-weight:800;font-size:30pt;margin:0 0 9mm;color:var(--accent)}
.toc li{margin:0 0 2mm;padding:0}
.toc a{padding:2.6mm 3mm;border-radius:3mm;background:#F3F6F8;font-size:10.4pt;gap:4mm}
.toc .toc-n{font-family:var(--display);font-weight:800;font-size:10pt;color:#FFFFFF;background:var(--accent);border-radius:2mm;width:8mm;flex:0 0 8mm;text-align:center;padding:.6mm 0}
.toc .toc-n:empty{background:none}
.toc .toc-t{font-family:var(--display);font-weight:600}
.toc .dots{display:none}
.page-opener{background:#156A5F;color:#FFFFFF}
.opener-num{position:absolute;right:-6mm;top:-14mm;font-family:var(--display);font-weight:800;font-size:250pt;line-height:1;color:#1C7A6E;letter-spacing:-.05em}
.opener-art{position:absolute;left:16mm;top:28mm;width:62mm;height:62mm;border-radius:50%;border:2.2mm solid #F2B23E}
.opener-art.none{display:none}
.opener-body{position:absolute;left:16mm;right:16mm;bottom:22mm}
.opener-label{font:800 9pt var(--display);letter-spacing:.2em;text-transform:uppercase;color:#F2B23E;margin:0 0 3mm}
h2.chapter{font-family:var(--display);font-weight:800;font-size:34pt;line-height:1.02;margin:0 0 7mm;color:#FFFFFF}
.opener-short{background:#FFFFFF;color:var(--ink);border-radius:5mm;padding:5mm 6mm;font-size:10.4pt;line-height:1.55}
.opener-short p{margin:0}
`,
    cover: ({title, subtitle, tagline, badge, author, coverDataUrl}) => `<section class="page-cover cover"><div class="cover-photo"${coverDataUrl ? ` style="background-image:url('${coverDataUrl}')"` : ''}></div><div class="cover-panel"></div>${badge ? `<div class="cover-badge">${esc(badge)}</div>` : ''}<div class="cover-text"><h1>${esc(title)}</h1>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}${tagline ? `<p class="tag">${esc(tagline)}</p>` : ''}${author ? `<p class="by">${esc(author)}</p>` : ''}</div></section>`,
    opener: ({n, name, art, short}) => `<section class="page-opener"><div class="opener-num">${esc(String(n).padStart(2, '0'))}</div><div class="opener-art${art ? '' : ' none'}"${art ? ` style="background-image:url('${art}')"` : ''}></div><div class="opener-body"><p class="opener-label">Chapter ${esc(n)}</p><h2 class="chapter">${esc(name)}</h2>${short ? `<div class="opener-short">${short}</div>` : ''}</div></section>`,
  },

  // C: classic bookshop. Ivory, navy and gold, high-contrast serif, ornaments and a drop cap.
  classic: {
    name: 'Classic Bookshop',
    fonts: () => [face('Playfair Display', 'playfair-display-700-normal', 700), face('Playfair Display', 'playfair-display-400-italic', 400, 'italic'), face('Playfair Display', 'playfair-display-700-italic', 700, 'italic'),
      face('Lora', 'lora-400-normal', 400), face('Lora', 'lora-600-normal', 600), face('Lora', 'lora-400-italic', 400, 'italic')].join(''),
    css: ({pageSize, title}) => `
:root{--paper:#FFFDF7;--ink:#1F2433;--muted:#727582;--accent:#22385A;--gold:#A9844B;--soft:#F4EFE3;--line:#E4DCCB;--line2:#CDBF9F;
--display:'Playfair Display',Georgia,serif;--body:'Lora',Georgia,serif;--label:'Lora',Georgia,serif;--size:10.4pt;--leading:1.62}
@page{size:${pageSize};margin:20mm 18mm 19mm;background:#FFFDF7;
 @top-center{content:"${esc(title)}";font:italic 400 8pt 'Lora',serif;color:#9A9384;padding-top:7mm}
 @bottom-center{content:counter(page);letter-spacing:.1em;font:400 8.5pt 'Lora',serif;color:#A9844B}}
@page cover{margin:0;background:#22385A;@top-center{content:none}@bottom-center{content:none}}
@page opener{margin:0;background:#FFFDF7;@top-center{content:none}@bottom-center{content:none}}
@page front{@top-center{content:none}@bottom-center{content:none}}
.title-page,.toc{page:front}
h3{font-family:var(--display);font-weight:700;font-size:15pt;line-height:1.2;margin:7.5mm 0 2.4mm;color:var(--accent)}
h3::before{content:'';display:inline-block;width:2.3mm;height:2.3mm;background:var(--gold);transform:rotate(45deg) translateY(-.8mm);margin:0 3mm 0 .5mm}
h4{font-family:var(--display);font-style:italic;font-size:12pt;margin:5mm 0 1.5mm;color:var(--accent)}
h2.section-open{font-family:var(--display);font-weight:700;font-size:28pt;line-height:1.08;margin:0 0 3mm;color:var(--accent);break-before:page;text-align:center;padding-top:10mm}
h2.section-open::after{content:'';display:block;width:30mm;height:0;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold);padding-top:1mm;margin:6mm auto 9mm}
.opener-anchor + .keep p:first-of-type::first-letter,.drop::first-letter{font-family:var(--display);font-weight:700;float:left;font-size:44pt;line-height:.8;margin:1.6mm 2.2mm 0 0;color:var(--gold)}
th{font-family:var(--body);font-weight:600;font-size:7.2pt;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);padding:2.2mm 3mm 2.2mm 0;border-top:1.4px solid var(--accent);border-bottom:1px solid var(--accent)}
td{padding:2.4mm 3mm 2.4mm 0;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:1.4px solid var(--accent)}
.box{background:transparent;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold);padding:5mm 2mm 5mm 14mm;border-radius:0}
.box .ico{left:1mm;top:5mm;background:var(--accent);color:#FFFDF7;width:8mm;height:8mm}
.box .box-label{color:var(--gold);font-weight:600;letter-spacing:.18em}
.box-try{background:var(--soft);border:0;border-radius:2mm;padding-left:16mm}.box-try .ico{left:4.5mm}
.box-safety,.box-red{border-color:#9B3B2E}.box-safety .ico,.box-red .ico{background:#9B3B2E}.box-safety .box-label,.box-red .box-label{color:#9B3B2E}
.box-plain{padding-left:2mm}
.stat{text-align:center;padding:5mm 0;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold)}
.stat-number{font-family:var(--display);font-style:italic;font-weight:700;font-size:40pt;line-height:1;color:var(--accent);margin:0 0 2mm}
.stat-caption{font-style:italic;font-size:10pt;color:var(--ink)}
.steps-intro p{font-family:var(--display);font-style:italic;font-size:12pt;color:var(--accent)}
.step{border-top:1px solid var(--gold);padding:3.5mm 1mm 0;font-size:9.8pt;line-height:1.5}
.step-n{font-family:var(--display);font-style:italic;font-weight:700;font-size:20pt;color:var(--gold);line-height:1;margin:0 0 2mm}
.checklist{background:var(--soft);padding:5.5mm 6mm;border-radius:2mm}
.checklist .box-label{color:var(--gold);letter-spacing:.18em;font-weight:600}
.checklist li{border-bottom:1px solid var(--line)}.checklist li:last-child{border-bottom:0}
.tick{border:1.2px solid var(--accent);border-radius:0}
.ba-side{padding:4mm 1mm;border-top:1px solid var(--gold)}
.ba-before .box-label{color:var(--muted)}.ba-after .box-label{color:var(--gold)}
.timeline{border-left:1px solid var(--gold);margin-left:2mm;padding-left:7mm}
.tl-item{margin:0 0 4mm}.tl-item::before{content:'';position:absolute;left:-8.7mm;top:1.6mm;width:2.6mm;height:2.6mm;background:var(--gold);transform:rotate(45deg)}
.tl-when{font-family:var(--display);font-style:italic;font-weight:700;font-size:11pt;color:var(--accent)}
blockquote.pull{background:none;border:0;margin:7mm 8mm;padding:0;text-align:center;font-family:var(--display);font-style:italic;font-size:16pt;line-height:1.4;color:var(--accent)}
blockquote.pull::before,blockquote.pull::after{content:'';display:block;width:12mm;height:0;border-top:1px solid var(--gold);margin:0 auto 4mm}
blockquote.pull::after{margin:4mm auto 0}
.key-idea{background:var(--accent);color:#FFFDF7;padding:6mm 7mm;border-radius:1mm;font-family:var(--display);font-style:italic;font-size:13pt;line-height:1.45;text-align:center}
.key-idea .box-label{color:#D9C08F;font-style:normal;font-family:var(--body);letter-spacing:.2em}
.cover{background:#22385A;color:#FFFDF7}
.cover-frame{position:absolute;inset:8mm;border:1px solid #A9844B}
.cover-frame2{position:absolute;inset:10mm;border:.4mm solid #A9844B}
.cover-photo{position:absolute;top:26mm;left:24mm;right:24mm;height:47%;background-size:cover;background-position:center 35%;border:1.4mm solid #FFFDF7;outline:1px solid #A9844B;outline-offset:1.6mm;background-color:#3A4F70}
.cover-badge{position:absolute;top:16.5mm;left:0;right:0;text-align:center;font:600 7pt var(--body);letter-spacing:.32em;text-transform:uppercase;color:#D9C08F}
.cover-text{position:absolute;left:20mm;right:20mm;bottom:20mm;text-align:center}
.cover h1{font-family:var(--display);font-weight:700;font-size:40pt;line-height:1.02;margin:0 0 4mm;color:#FFFDF7}
.cover .orn{width:34mm;height:0;border-top:1px solid #A9844B;border-bottom:1px solid #A9844B;padding-top:1mm;margin:0 auto 4mm}
.cover .sub{font-family:var(--display);font-style:italic;font-size:14pt;line-height:1.35;margin:0 0 3mm;color:#E9DDC2}
.cover .tag{font-size:8.6pt;line-height:1.5;margin:0;color:#BFC7D6}
.cover .by{font-size:8pt;letter-spacing:.28em;text-transform:uppercase;margin:5mm 0 0;color:#D9C08F}
.title-page{text-align:center;align-items:center}
.title-page .tp-title{font-family:var(--display);font-weight:700;font-size:30pt;line-height:1.08;margin:0 0 4mm;color:var(--accent)}
.title-page .tp-sub{font-family:var(--display);font-style:italic;font-size:13pt;color:var(--gold);margin:0 0 8mm}
.title-page .tp-rule{width:30mm;height:0;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold);padding-top:1mm;margin:0 auto 8mm}
.title-page .tp-note{font-size:9.4pt;color:var(--muted);max-width:105mm;line-height:1.6;font-style:italic}
.toc h2{font-family:var(--display);font-weight:700;font-size:28pt;margin:0 0 3mm;color:var(--accent);text-align:center}
.toc h2::after{content:'';display:block;width:30mm;height:0;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold);padding-top:1mm;margin:5mm auto 9mm}
.toc li{margin:0;padding:0}
.toc a{padding:2.5mm 0;font-size:11pt}
.toc .toc-n{font-family:var(--display);font-style:italic;font-weight:700;color:var(--gold);width:9mm;flex:0 0 9mm}
.page-opener{text-align:center}
.opener-art{position:absolute;left:28mm;right:28mm;top:108mm;bottom:30mm;border:1.2mm solid #FFFFFF;outline:1px solid #A9844B;outline-offset:1.6mm}
.opener-art.none{display:none}
.opener-body{position:absolute;left:20mm;right:20mm;top:26mm}
.opener-label{font:600 8pt var(--body);letter-spacing:.34em;text-transform:uppercase;color:var(--gold);margin:0 0 5mm}
.opener-orn{width:30mm;height:0;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold);padding-top:1mm;margin:0 auto 6mm}
h2.chapter{font-family:var(--display);font-weight:700;font-size:32pt;line-height:1.08;margin:0 0 6mm;color:var(--accent)}
.opener-short{font-style:italic;font-size:11.2pt;line-height:1.55;color:var(--ink);max-width:120mm;margin:0 auto}
.opener-short p{margin:0}
`,
    cover: ({title, subtitle, tagline, badge, author, coverDataUrl}) => `<section class="page-cover cover"><div class="cover-frame"></div><div class="cover-frame2"></div>${badge ? `<div class="cover-badge">${esc(badge)}</div>` : ''}<div class="cover-photo"${coverDataUrl ? ` style="background-image:url('${coverDataUrl}')"` : ''}></div><div class="cover-text"><h1>${esc(title)}</h1><div class="orn"></div>${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}${tagline ? `<p class="tag">${esc(tagline)}</p>` : ''}${author ? `<p class="by">${esc(author)}</p>` : ''}</div></section>`,
    opener: ({n, name, art, short}) => `<section class="page-opener"><div class="opener-body"><p class="opener-label">Chapter ${esc(WORDS[Number(n)] || n)}</p><div class="opener-orn"></div><h2 class="chapter">${esc(name)}</h2>${short ? `<div class="opener-short">${short}</div>` : ''}</div><div class="opener-art${art ? '' : ' none'}"${art ? ` style="background-image:url('${art}')"` : ''}></div></section>`,
  },
};

export function themeCSS(theme, opts) { return theme.fonts() + BASE(opts) + theme.css(opts); }
export function boxIcon(kind) { return `<span class="ico">${icon(kind)}</span>`; }
