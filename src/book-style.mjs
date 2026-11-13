// Toby: the house style for ebooks made by make_book.
// One design, used for every book: pine green and marigold, Outfit for display and tools,
// Source Serif 4 for reading. Reading text sits in a narrower column; headings, tools and
// tables hang out to the left margin, and step numbers and times sit in that margin.
// Solid colours only (no transparency), so every PDF viewer shows the same book.
// Fonts are bundled under the SIL Open Font License (book-fonts/LICENSES.txt).
import {readFileSync} from 'node:fs';

const FONT_DIR = new URL('./book-fonts/', import.meta.url);
const cache = new Map();
function face(family, file, weight, style = 'normal') {
  if (!cache.has(file)) cache.set(file, readFileSync(new URL(file + '.woff2', FONT_DIR)).toString('base64'));
  return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${cache.get(file)}) format('woff2');font-weight:${weight};font-style:${style};font-display:block}`;
}
export const fonts = () => [
  face('Outfit', 'outfit-400', 400), face('Outfit', 'outfit-500', 500), face('Outfit', 'outfit-600', 600), face('Outfit', 'outfit-700', 700), face('Outfit', 'outfit-800', 800),
  face('Source Serif 4', 'source-serif-400', 400), face('Source Serif 4', 'source-serif-400-italic', 400, 'italic'),
  face('Source Serif 4', 'source-serif-600', 600), face('Source Serif 4', 'source-serif-600-italic', 600, 'italic'),
].join('');

const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${inner}</svg>`;
export const ICONS = {
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  check: svg('<path d="M5 12.5l4.2 4.2L19 7"/>'),
  cross: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  warn: svg('<path d="M12 4l9 16H3z"/><path d="M12 10.5v4M12 17.4v.2"/>'),
  flag: svg('<path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  paw: svg('<circle cx="7" cy="10" r="1.8"/><circle cx="17" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><path d="M12 12.5c-3 0-5.5 3-5.5 5.2 0 1.6 1.4 2.3 3 2.3 1 0 1.6-.4 2.5-.4s1.5.4 2.5.4c1.6 0 3-.7 3-2.3 0-2.2-2.5-5.2-5.5-5.2z"/>'),
  print: svg('<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>'),
};

const cssString = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');

export function styleCSS({pageW, pageH, sizeRule, title, runningHeads = []}) {
  const heads = runningHeads.map(({page, text}) => `@page ${page}{@top-right{content:"${cssString(text)}"}}`).join('\n');
  return `${fonts()}
:root{--pine:#156A5F;--pine-deep:#0E4A43;--pine-soft:#1D7B6F;--marigold:#F2B23E;--ink:#1B2530;--muted:#66727E;--mint:#E7F2EF;--butter:#FFF3D4;--blush:#FBEAE5;--brick:#B9432E;--line:#DCE3E1;--fog:#F1F3F4;
--display:'Outfit','Segoe UI',Arial,sans-serif;--text:'Source Serif 4',Georgia,serif;--gutter:24mm;--content-h:calc(${pageH} - 43mm)}
@page{size:${sizeRule};margin:23mm 16mm 20mm;
 @top-left{content:"${cssString(title)}";font:500 7.6pt 'Outfit',sans-serif;color:#7C8894;vertical-align:bottom;padding-bottom:2.6mm;border-bottom:.6pt solid #D3DBD9;width:50%;text-align:left}
 @top-right{content:"";font:600 7.6pt 'Outfit',sans-serif;color:#156A5F;vertical-align:bottom;padding-bottom:2.6mm;border-bottom:.6pt solid #D3DBD9;width:50%;text-align:right}
 @bottom-right{content:counter(page);font:700 9pt 'Outfit',sans-serif;color:#1B2530;vertical-align:top;padding-top:6mm}}
@page cover{margin:0;background:#156A5F;@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-right{content:none}}
@page opener{margin:0;background:#156A5F;@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-right{content:none}}
@page plain{@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-right{content:none}}
@page closing{margin:30mm 26mm;background:#156A5F;@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-right{content:none}}
${heads}

*{box-sizing:border-box}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{color:var(--ink);font-family:var(--text);font-size:10.4pt;line-height:1.56;hyphens:manual;font-kerning:normal}
a{color:inherit;text-decoration:none}
p{margin:0 0 3.1mm;orphans:3;widows:3;text-wrap:pretty}
strong{font-weight:600}
ul,ol{margin:0 0 3.6mm;padding-left:5mm;break-inside:avoid}
ul.long,ol.long{break-inside:auto}
li{margin:0 0 1.5mm;padding-left:1mm;text-wrap:pretty;break-inside:avoid}
.b{position:relative}
.pb{position:absolute;left:0;bottom:0;width:.8mm;height:.8mm}
ul>li::marker{color:var(--marigold);font-size:1.15em}
ol>li::marker{color:var(--pine);font-family:var(--display);font-weight:700;font-size:.92em}
.keep{break-inside:avoid}
.kw{break-after:avoid}
.cite{font-family:var(--display);font-weight:600;font-size:6.3pt;line-height:0;vertical-align:super;color:var(--pine);margin-left:.25mm;letter-spacing:.01em}
.cite-sep{color:var(--muted)}

/* ---------- cover ---------- */
.cover{page:cover;position:relative;width:${pageW};height:calc(${pageH} - .6mm);overflow:hidden;break-after:page;background:var(--pine);color:#fff}
.cover-photo{position:absolute;left:0;right:0;top:0;height:57%;background-size:cover;background-position:center 30%;background-color:var(--pine-soft)}
.cover-band{position:absolute;left:0;right:0;top:57%;height:2.4mm;background:var(--marigold)}
.cover-text{position:absolute;left:15mm;right:15mm;top:calc(57% + 2.4mm);bottom:21mm;display:flex;flex-direction:column;justify-content:center}
.cover-title{font-family:var(--display);font-weight:800;font-size:60pt;line-height:.94;letter-spacing:-.022em;margin:0 0 5mm;text-wrap:balance}
.cover-title.t2{font-size:46pt;line-height:.98}
.cover-title.t3{font-size:35pt;line-height:1.02;letter-spacing:-.014em}
.cover-sub{font-family:var(--display);font-weight:500;font-size:15pt;line-height:1.25;margin:0 0 3.6mm;color:var(--marigold);text-wrap:balance}
.cover-tag{font-family:var(--text);font-size:10.6pt;line-height:1.48;margin:0;color:#D5E9E4;max-width:112mm;text-wrap:balance}
.cover-by{font-family:var(--display);font-weight:600;font-size:10.5pt;margin:4mm 0 0;color:#fff}
.cover-inside{position:absolute;left:15mm;right:15mm;bottom:9mm;display:flex;border-top:.6pt solid #4A9085;padding-top:3.2mm;font-family:var(--display);font-weight:600;font-size:9pt;line-height:1.2;color:#fff}
.cover-inside span{flex:1;padding:0 4mm;border-left:.6pt solid #4A9085}
.cover-inside span:first-child{padding-left:0;border-left:0}
.seal{position:absolute;right:13mm;top:calc(57% - 21mm);width:41mm;height:41mm;border-radius:50%;background:var(--marigold);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transform:rotate(-8deg);box-shadow:0 0 0 1.4mm var(--pine)}
.seal::before{content:'';position:absolute;inset:1.8mm;border-radius:50%;border:.6pt solid var(--ink)}
.seal-top{font:700 6.8pt/1.1 var(--display);margin:0 0 .4mm}
.seal-num{font:800 30pt/.95 var(--display);letter-spacing:-.02em;margin:0 0 .5mm}
.seal-text{font:700 7.4pt/1.15 var(--display);max-width:26mm}
.probes{position:absolute;left:0;top:0;width:2mm;height:2mm;overflow:hidden}
.probes a{position:absolute;left:0;top:0;width:1.5mm;height:1.5mm}
#cal-top{display:block;height:0}

/* ---------- title page and contents ---------- */
.title-page{page:plain;break-after:page;height:calc(${pageH} - 46mm);display:flex;flex-direction:column;justify-content:space-between}
.tp-title{font-family:var(--display);font-weight:800;font-size:38pt;line-height:1;letter-spacing:-.012em;color:var(--pine);margin:0 0 5mm;padding-top:26mm;max-width:120mm}
.tp-sub{font-family:var(--display);font-weight:500;font-size:14pt;line-height:1.3;margin:0;max-width:105mm;color:var(--ink)}
.tp-rule{width:14mm;height:1.4mm;background:var(--marigold);margin:9mm 0 0}
.tp-foot{font-family:var(--display);font-size:8.6pt;line-height:1.55;color:var(--muted);max-width:105mm}
.tp-foot p{margin:0 0 1.5mm}
.toc{page:plain;break-after:page}
.toc h2{font-family:var(--display);font-weight:800;font-size:30pt;line-height:1;color:var(--pine);margin:2mm 0 8mm}
.toc ol{list-style:none;padding:0;margin:0}
.toc li{margin:0;padding:0}
.toc a{display:flex;align-items:baseline;gap:3mm;padding:1.75mm 0;font-family:var(--display);line-height:1.3;color:var(--ink)}
.toc-n{flex:0 0 9mm;font-weight:800;font-size:11pt;color:var(--pine)}
.toc-t{font-weight:500;font-size:11pt}
.toc-dots{flex:1;border-bottom:1.2pt dotted #C3CDCB;transform:translateY(-1.1mm);min-width:8mm}
.toc-p{font-weight:700;font-size:10pt;color:var(--ink);min-width:6mm;text-align:right}
.toc li.minor .toc-t{font-weight:400;font-size:10pt;color:var(--muted)}
.toc-sub{font-family:var(--display);font-weight:700;font-size:10.5pt;color:var(--pine);margin:6mm 0 1mm;padding-top:3.5mm;border-top:.6pt solid var(--line)}
.toc ol.prints a{padding:1.05mm 0}
.toc ol.prints .toc-t{font-size:9.6pt;font-weight:400}
.toc ol.prints .toc-p{font-size:9pt;font-weight:600}
.toc ol.prints .toc-n svg{width:4mm;height:4mm;fill:none;stroke:var(--pine);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transform:translateY(.8mm)}

/* ---------- chapter opener ---------- */
.opener{page:opener;position:relative;width:${pageW};height:calc(${pageH} - .6mm);overflow:hidden;break-before:page;break-after:page;background:var(--pine);color:#fff}
.opener-num{position:absolute;right:-5mm;top:-9mm;font-family:var(--display);font-weight:800;font-size:215pt;line-height:1;letter-spacing:-.05em;color:var(--pine-soft)}
.opener-body{position:absolute;left:16mm;right:16mm;top:92mm}
.opener-label{font-family:var(--display);font-weight:600;font-size:11pt;color:var(--marigold);margin:0 0 2.5mm}
.opener h2{font-family:var(--display);font-weight:800;font-size:38pt;line-height:1;letter-spacing:-.012em;margin:0 0 7mm;color:#fff;max-width:128mm;text-wrap:balance}
.opener-short{font-family:var(--text);font-size:12.6pt;line-height:1.5;color:#fff;max-width:118mm;padding-left:5mm;border-left:1.3mm solid var(--marigold)}
.opener-short p{margin:0}
.opener-short .cite{color:#D5E9E4}
.opener-list{position:absolute;left:16mm;right:16mm;bottom:15mm;padding-top:4.5mm;border-top:.6pt solid #4A9085}
.opener-list p{font-family:var(--display);font-weight:600;font-size:8.6pt;color:var(--marigold);margin:0 0 2.2mm}
.opener-list ul{list-style:none;margin:0;padding:0;columns:2;column-gap:8mm;font-family:var(--display);font-size:9pt;line-height:1.35;color:#D5E9E4}
.opener-list li{margin:0 0 1.3mm;padding:0;break-inside:avoid}

/* ---------- reading pages ---------- */
.flow{padding-left:var(--gutter)}
.w{margin-left:calc(-1 * var(--gutter))}
h3{font-family:var(--display);font-weight:700;font-size:15.5pt;line-height:1.18;letter-spacing:-.005em;color:var(--ink);margin:8.5mm 0 3mm calc(-1 * var(--gutter));padding-top:3.6mm;background:linear-gradient(var(--marigold),var(--marigold)) no-repeat left top/10mm 1.3mm;break-after:avoid;text-wrap:balance}
.flow>.b:first-child>h3:first-child,.flow>.b:first-child>.keep>h3:first-child{margin-top:1mm}
/* a heading always has room for a few lines under it */
.b>h3{break-inside:avoid}
.b>h3::after{content:'';display:block;height:24mm;margin-bottom:-24mm}
h4{font-family:var(--display);font-weight:600;font-size:11pt;margin:5mm 0 1.5mm;break-after:avoid}
h2.plain-head{font-family:var(--display);font-weight:800;font-size:28pt;line-height:1.02;letter-spacing:-.012em;color:var(--pine);margin:2mm 0 9mm calc(-1 * var(--gutter));max-width:125mm;text-wrap:balance}
.story{font-style:italic;border-left:1mm solid var(--marigold);padding:1mm 0 1mm 5mm;margin:1mm 0 4mm}

/* labelled boxes */
.box{position:relative;margin:5.5mm 0 5.5mm calc(-1 * var(--gutter));padding:4.6mm 6mm 4.8mm 18mm;border-radius:3.5mm;break-inside:avoid;font-size:10pt;line-height:1.52}
.box>:last-child{margin-bottom:0}
.box .ico{position:absolute;left:5.6mm;top:4.6mm;width:7.6mm;height:7.6mm;border-radius:50%;display:flex;align-items:center;justify-content:center}
.box .ico svg,.talk-head svg,.ws-tag svg{width:4.3mm;height:4.3mm;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.box-label{font-family:var(--display);font-weight:700;font-size:10.4pt;line-height:1.2;margin:0 0 1.4mm;padding-top:1.5mm}
.box-try{background:var(--butter)}.box-try .ico{background:var(--marigold);color:var(--ink)}.box-try .box-label{color:#7A5200}
.box-tip,.box-from{background:var(--mint)}.box-tip .ico,.box-from .ico{background:var(--pine);color:#fff}.box-tip .box-label,.box-from .box-label{color:var(--pine)}
.box-safety,.box-red{background:var(--blush)}.box-safety .ico,.box-red .ico{background:var(--brick);color:#fff}.box-safety .box-label,.box-red .box-label{color:var(--brick)}
.box-plain{background:var(--fog);padding-left:6mm}
.box-short{background:var(--mint);padding-left:6mm;font-size:11pt}.box-short .box-label{color:var(--pine)}

/* chapter recap: the pine panel that ends a chapter and runs to the foot of the page */
.recap{margin:7mm 0 0 calc(-1 * var(--gutter));padding:5.5mm 7mm 4mm;border-radius:3.5mm;background:var(--pine);color:#fff;break-inside:avoid;overflow:hidden;display:flex;flex-direction:column}
.recap p.recap-title{font-family:var(--display);font-weight:700;font-size:13pt;line-height:1.1;margin:0 0 1.4mm;color:var(--marigold)}
.recap ul{list-style:none;margin:0;padding:0;font-family:var(--display);font-weight:400;font-size:10pt;line-height:1.45}
.recap li{position:relative;margin:0;padding:1.9mm 0 1.9mm 8mm;border-top:.6pt solid #4A9085}
.recap li:first-child{border-top:0}
.recap li::before{content:'';position:absolute;left:.6mm;top:3.5mm;width:3.6mm;height:1.9mm;border-left:1.6pt solid var(--marigold);border-bottom:1.6pt solid var(--marigold);transform:rotate(-45deg)}
.recap .cite,.recap .cite-sep{color:#D5E9E4}
.recap p{margin:0}
.recap-foot{display:none;margin-top:auto;justify-content:space-between;align-items:flex-end;gap:8mm}
.recap-next{font-family:var(--display);font-size:9pt;line-height:1.3;color:#D5E9E4;padding-bottom:1mm}
.recap-next a{display:block;font-weight:700;font-size:11.5pt;color:#fff;margin-top:.6mm}
.recap-num{font-family:var(--display);font-weight:800;font-size:120pt;line-height:.74;letter-spacing:-.05em;color:var(--pine-soft);margin:0 -5mm -9mm 0;white-space:nowrap}
.recap.foot .recap-foot{display:flex}
.recap.foot .recap-num,.recap.slim .recap-num{display:none}
.recap.foot .recap-next{padding-bottom:1.5mm}
.recap.mid,.recap.big{padding:9mm 10mm 8mm}
.recap.mid .recap-foot,.recap.big .recap-foot{display:flex}
.recap.mid p.recap-title{font-size:17pt;font-weight:800;margin-bottom:2.4mm}
.recap.mid ul{font-size:11.6pt;line-height:1.38;max-width:124mm}
.recap.mid li{padding:3mm 0 3mm 10mm}
.recap.mid li::before{top:4.9mm;width:4.4mm;height:2.3mm;border-width:1.9pt}
.recap.big{padding:14mm 13mm 11mm}
.recap.big p.recap-title{font-size:25pt;font-weight:800;letter-spacing:-.01em;margin-bottom:4mm}
.recap.big ul{font-size:14.5pt;font-weight:500;line-height:1.32;max-width:124mm}
.recap.big li{padding:5.4mm 0 5.4mm 13mm}
.recap.big li::before{top:7.7mm;width:5.6mm;height:2.9mm;border-width:2.2pt}
.recap.big .recap-num{font-size:190pt;margin:0 -7mm -14mm 0}

/* spare facts: cards that take up the room left when a whole block moves to the next page */
.filler{margin:5.5mm 0 0 calc(-1 * var(--gutter));padding:3mm 8mm 3mm 18mm;border-radius:3.5mm;background:var(--mint);color:var(--pine-deep);break-inside:avoid;overflow:hidden;position:relative;display:flex;flex-direction:column;justify-content:center}
.filler>.ico{position:absolute;left:5.6mm;top:50%;margin-top:-3.8mm;width:7.6mm;height:7.6mm;border-radius:50%;background:var(--pine);color:#fff;display:flex;align-items:center;justify-content:center}
.filler>.ico svg{width:4.3mm;height:4.3mm;fill:currentColor;stroke:none}
.filler-label{font-family:var(--display);font-weight:700;font-size:9.6pt;line-height:1.2;color:var(--pine);margin:0 0 1.4mm}
.filler-text{font-family:var(--display);font-weight:500;font-size:10.6pt;line-height:1.36;margin:0;text-wrap:pretty}
.filler-num{font-family:var(--display);font-weight:800;font-size:25pt;line-height:1;letter-spacing:-.02em;color:var(--pine);margin:0;white-space:nowrap}
.filler-num .unit{font-size:.46em;font-weight:700;letter-spacing:0;margin:0 .14em}
.filler .cite{color:var(--pine)}
/* one line */
.filler.f-xs .filler-label,.filler.f-xs .filler-text,.filler.f-xs .filler-num{display:inline;font-size:10pt;line-height:1.36}
.filler.f-xs .filler-label{margin-right:1.6mm}
.filler.f-xs .filler-num{font-weight:700;letter-spacing:0;margin-right:.8mm}
.filler.f-xs .filler-num .unit{font-size:1em;margin:0}
/* a short card: icon at the side, the number (if any) beside the words; --f sets the type size */
.filler.f-s{padding:4mm 8mm 4mm 19mm}
.filler.f-s .filler-text{font-size:var(--f);line-height:1.32;font-weight:600;text-wrap:balance}
.filler.f-s .filler-num{font-size:calc(var(--f) * 2.3)}
.filler.f-s.has-num .filler-in{display:grid;grid-template-columns:auto 1fr;column-gap:6mm;align-items:center}
.filler.f-s.has-num .filler-label{grid-column:1/-1}
/* a full card: the type size (--f) is set to suit the room */
.filler.f-big{padding:calc(5mm + var(--f) * .32) calc(8mm + var(--f) * .3)}
.filler.f-big>.ico{position:static;margin:0 0 4mm;flex:none}
.filler.f-big .filler-label{font-size:10.6pt;margin-bottom:3mm}
.filler.f-big .filler-text{font-size:var(--f);line-height:1.26;font-weight:600;letter-spacing:-.006em;text-wrap:balance}
.filler.f-big .filler-num{font-size:min(84pt, calc(var(--f) * 3.2));line-height:1.02;margin-bottom:3mm}

/* number tiles */
.stats{display:grid;margin:6.5mm 0 6.5mm calc(-1 * var(--gutter));border-top:1.3pt solid var(--ink);border-bottom:.6pt solid var(--line);break-inside:avoid}
.stats.n1{grid-template-columns:1fr}.stats.n2{grid-template-columns:1fr 1fr}.stats.n3{grid-template-columns:1fr 1fr 1fr}
.stat{padding:4.2mm 5mm 4.4mm 0}
.stats.n2 .stat+.stat,.stats.n3 .stat+.stat{padding-left:5mm;border-left:.6pt solid var(--line)}
.stats.n1 .stat{display:grid;grid-template-columns:auto 1fr;column-gap:7mm;align-items:center}
.stat-number{font-family:var(--display);font-weight:800;font-size:33pt;line-height:1;letter-spacing:-.02em;color:var(--pine);white-space:nowrap;margin:0 0 1.8mm}
.stats.n1 .stat-number{font-size:40pt;margin:0}
.stat-number .unit{font-size:.42em;font-weight:700;letter-spacing:0;margin:0 .12em}
.stat-caption{font-size:9.4pt;line-height:1.42;color:var(--ink)}
.stats.n1 .stat-caption{font-size:10.4pt;max-width:86mm}
.stat-caption p{margin:0}

/* steps: numbers hang in the margin */
.steps{margin:5mm 0 6mm calc(-1 * var(--gutter));break-inside:avoid}
.steps.long{break-inside:auto}
.steps.dense{font-size:9.5pt;line-height:1.46}
.steps.dense .step-t{padding-bottom:2.8mm}
.steps-intro{margin-left:var(--gutter)}
.step{display:grid;grid-template-columns:var(--gutter) 1fr;break-inside:avoid;position:relative}
.step-n{font-family:var(--display);font-weight:800;font-size:10.5pt;width:8.6mm;height:8.6mm;border-radius:50%;background:var(--marigold);color:var(--ink);display:flex;align-items:center;justify-content:center;margin-left:9.5mm;position:relative;z-index:1}
.step::before{content:'';position:absolute;left:13.5mm;top:8.6mm;bottom:0;width:.7mm;background:var(--line)}
.step:last-child::before{display:none}
.step-t{padding:1.1mm 0 4.2mm}
.step-t>:last-child{margin-bottom:0}
.step-t strong:first-child{font-family:var(--display);font-weight:700;font-size:11pt;color:var(--ink);display:block;margin:0 0 .8mm}

/* checklists */
.checklist{margin:5.5mm 0 6mm calc(-1 * var(--gutter));border:1pt solid var(--pine);border-radius:3.5mm;overflow:hidden;break-inside:avoid;font-family:var(--display);font-size:9.8pt;line-height:1.42}
.checklist-title{background:var(--pine);color:#fff;font-weight:700;font-size:10.6pt;margin:0;padding:2.6mm 5.5mm 2.7mm}
.checklist-title .cite{color:#D5E9E4}
.checklist ul{list-style:none;margin:0;padding:1.4mm 5.5mm 1.8mm}
.checklist.cols ul{columns:2;column-gap:9mm}
.checklist li{display:flex;gap:3.2mm;align-items:flex-start;margin:0;padding:1.9mm 0;border-bottom:.6pt solid var(--line);break-inside:avoid}
.checklist li:last-child{border-bottom:0}
.checklist.cols li{border-bottom:0;padding:1.5mm 0}
.checklist.long{break-inside:auto;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.tick{flex:0 0 4.1mm;height:4.1mm;border:1.2pt solid var(--pine);border-radius:.9mm;margin-top:.55mm;background:#fff}

/* before and after */
.ba{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:5.5mm 0 6mm calc(-1 * var(--gutter));break-inside:avoid;font-family:var(--display);font-size:9.8pt;line-height:1.45}
.ba-side{border-radius:3.5mm;padding:4.6mm 5.5mm 5mm}
.ba-before{border:1pt dashed #B7C1C6;color:#4A5661}
.ba-after{background:var(--mint)}
.ba-side .box-label{padding-top:0;margin-bottom:1.8mm}
.ba-before .box-label{color:var(--muted)}.ba-after .box-label{color:var(--pine)}
.ba-side p:last-child{margin-bottom:0}

/* timeline of a few stages */
.stages{margin:6mm 0 6.5mm calc(-1 * var(--gutter));break-inside:avoid}
.stages-title{font-family:var(--display);font-weight:700;font-size:10.6pt;color:var(--pine);margin:0 0 3.4mm}
.stages-row{display:grid;gap:5mm;border-top:1.3pt solid var(--pine);font-family:var(--display)}
.stages-row.n2{grid-template-columns:1fr 1fr}.stages-row.n3{grid-template-columns:1fr 1fr 1fr}.stages-row.n4{grid-template-columns:1fr 1fr 1fr 1fr}
.stage{position:relative;padding-top:5mm;font-size:8.9pt;line-height:1.42}
.stage::before{content:'';position:absolute;left:0;top:-2.1mm;width:3.6mm;height:3.6mm;border-radius:50%;background:var(--marigold);box-shadow:0 0 0 1mm #fff}
.stage-when{font-weight:800;font-size:11.5pt;color:var(--ink);margin:0 0 1.2mm}
.stages .clock{margin:0}
.stages .clock-time{font-size:10.4pt;font-weight:800;color:var(--ink);padding-top:.3mm}
.stages .clock-what{font-size:10.6pt;line-height:1.45;padding-bottom:7mm}
.stages .clock-what::before{top:1.4mm}

/* pull quote and key idea */
.pull{margin:7mm 0 7.5mm calc(-1 * var(--gutter));display:grid;grid-template-columns:var(--gutter) 1fr;break-inside:avoid}
.pull::before{content:'\\201C';font-family:var(--display);font-weight:800;font-size:60pt;line-height:.82;color:var(--marigold);text-align:right;padding-right:4mm}
.pull p{font-family:var(--display);font-weight:500;font-size:17.5pt;line-height:1.24;letter-spacing:-.008em;color:var(--pine);margin:0;max-width:112mm;text-wrap:balance}
.key-idea{margin:6mm 0 6.5mm calc(-1 * var(--gutter));padding:5.5mm 7mm 5.8mm var(--gutter);background:var(--marigold);color:var(--ink);border-radius:3.5mm;break-inside:avoid;position:relative}
.key-idea .ico{position:absolute;left:8mm;top:5.6mm;width:8.4mm;height:8.4mm;border-radius:50%;background:var(--ink);color:var(--marigold);display:flex;align-items:center;justify-content:center}
.key-idea .ico svg{width:4.6mm;height:4.6mm;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.key-idea p{font-family:var(--display);font-weight:600;font-size:13pt;line-height:1.3;margin:0;text-wrap:balance}

/* tables */
table{width:calc(100% + var(--gutter));margin:4mm 0 6.5mm calc(-1 * var(--gutter));border-collapse:collapse;font-family:var(--display);font-size:9.2pt;line-height:1.42}
table.small{break-inside:avoid}
thead{display:table-header-group}
tr{break-inside:avoid}
th{font-weight:700;font-size:8.6pt;color:var(--pine);text-align:left;vertical-align:bottom;padding:0 4mm 2mm 0;border-bottom:1.3pt solid var(--pine)}
td{vertical-align:top;padding:2.5mm 4mm 2.5mm 0;border-bottom:.6pt solid var(--line)}
td:first-child{font-weight:600;color:var(--ink)}
td:last-child,th:last-child{padding-right:0}
td.nw,th.nw{white-space:nowrap}
td.src,th.src{width:1%;white-space:nowrap;text-align:right;color:var(--muted)}

/* say this, not that */
.talk{margin:4.5mm 0 6.5mm calc(-1 * var(--gutter));font-family:var(--display);break-inside:avoid}
.talk-head,.talk-row{display:grid;grid-template-columns:1fr 1fr;column-gap:6mm}
.talk-head{margin:0 0 2.4mm;font-weight:700;font-size:9.6pt;break-after:avoid}
.talk-head span{display:flex;align-items:center;gap:2mm}
.talk-head i{width:5.6mm;height:5.6mm;border-radius:50%;display:flex;align-items:center;justify-content:center}
.talk-head svg{width:3.4mm;height:3.4mm;stroke-width:2.6}
.talk-head .yes{color:var(--pine)}.talk-head .yes i{background:var(--pine);color:#fff}
.talk-head .no{color:var(--muted)}.talk-head .no i{background:#D9DEE1;color:#4A5661}
.talk-row{margin:0 0 2.6mm;break-inside:avoid}
.bubble{padding:3.1mm 4.6mm 3.3mm;font-size:9.8pt;line-height:1.38}
.bubble.yes{background:var(--pine);color:#fff;font-weight:500;border-radius:3.6mm 3.6mm 3.6mm 0}
.bubble.no{background:var(--fog);color:#4A5661;border-radius:3.6mm 3.6mm 0 3.6mm}
.bubble.yes .cite{color:#D5E9E4}

/* a day by the clock: times sit in the margin */
.clock{margin:5mm 0 6.5mm calc(-1 * var(--gutter));font-family:var(--display);break-inside:avoid}
.clock-row{display:grid;grid-template-columns:var(--gutter) 1fr;break-inside:avoid;position:relative}
.clock-time{font-weight:700;font-size:8.8pt;line-height:1.25;color:var(--pine);text-align:right;padding:.55mm 6.5mm 0 0}
.clock-what{font-size:9.8pt;line-height:1.42;padding:0 0 3.6mm 5mm;border-left:.7mm solid var(--line);position:relative}
.clock-what::before{content:'';position:absolute;left:-1.85mm;top:1.1mm;width:3mm;height:3mm;border-radius:50%;background:var(--marigold);box-shadow:0 0 0 .8mm #fff}
.clock-row:last-child .clock-what{padding-bottom:0}

/* pages to print: one full page each */
.worksheet,.plan-page{margin-left:calc(-1 * var(--gutter));break-before:page;break-inside:avoid}
.ws-head{display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;margin:0 0 3mm}
.ws-head h3{margin:1mm 0 0;font-size:22pt;font-weight:800;letter-spacing:-.012em;color:var(--pine);padding-top:4.2mm;background-size:12mm 1.4mm}
.ws-head h3 span{font-size:10.5pt;font-weight:500;letter-spacing:0;color:var(--muted);margin-left:2.5mm}
.ws-tag{display:flex;align-items:center;gap:1.8mm;font-family:var(--display);font-weight:600;font-size:8.4pt;color:var(--pine);border:.8pt solid var(--pine);border-radius:10mm;padding:1.1mm 3.4mm 1.2mm 2.6mm;white-space:nowrap;margin-bottom:1.2mm}
.ws-tag svg{width:3.8mm;height:3.8mm;stroke-width:1.8}
.ws-intro{max-width:122mm;margin:0 0 4.5mm}
.worksheet table{width:100%;margin:0;border:1pt solid var(--pine);border-collapse:separate;border-spacing:0;border-radius:3mm;overflow:hidden;font-size:8.8pt;break-inside:avoid}
.worksheet th{background:var(--pine);color:#fff;border-bottom:0;padding:2.4mm 2.6mm;vertical-align:middle;font-size:8.4pt;border-left:.6pt solid #4A9085}
.worksheet th:first-child{border-left:0}
.worksheet td{padding:1.4mm 2.6mm;border-bottom:.6pt solid #C9D4D1;border-left:.6pt solid #C9D4D1;vertical-align:middle;line-height:1.3}
.worksheet td:first-child{border-left:0}
.worksheet tr:last-child td{border-bottom:0}
.worksheet td.lab{background:var(--mint);font-weight:600;font-size:9.2pt}
.worksheet td.tickcell{text-align:center}
.worksheet td.tickcell i{display:inline-block;width:5mm;height:5mm;border:1.2pt solid var(--pine);border-radius:1mm;vertical-align:middle;background:#fff}
.plan-rows{font-family:var(--display);border-top:1.3pt solid var(--pine)}
.plan-row{display:grid;grid-template-columns:15mm 38mm 1fr 8mm;column-gap:4mm;align-items:center;border-bottom:.6pt solid #C9D4D1;break-inside:avoid}
.plan-n{font-weight:800;font-size:25pt;line-height:1;letter-spacing:-.02em;color:var(--pine)}
.plan-focus{font-weight:700;font-size:11pt;line-height:1.25;color:var(--ink)}
.plan-do{font-size:9.8pt;line-height:1.42}
.plan-tick{width:6mm;height:6mm;border:1.3pt solid var(--pine);border-radius:1.2mm;justify-self:end}

/* closing page and sources */
.closing{page:closing;break-before:page;color:#fff;font-size:12pt;line-height:1.6}
.closing h2{font-family:var(--display);font-weight:800;font-size:34pt;line-height:1;letter-spacing:-.012em;margin:22mm 0 9mm;color:#fff}
.closing p{max-width:112mm;margin:0 0 4.2mm}
.closing .pull{margin:8mm 0 8mm;display:block}
.closing .pull::before{display:none}
.closing .pull p{color:var(--marigold);font-size:21pt;max-width:118mm}
.sources{break-before:page}
.sources h2{font-family:var(--display);font-weight:800;font-size:28pt;line-height:1.02;color:var(--pine);margin:2mm 0 3mm}
.sources-note{font-family:var(--display);font-size:9pt;color:var(--muted);margin:0 0 7mm;max-width:118mm}
.sources-list{columns:2;column-gap:8mm;font-family:var(--display);font-size:7.3pt;line-height:1.4}
.source{position:relative;margin:0 0 2.5mm;padding-left:6.2mm;break-inside:avoid;hyphens:none;text-wrap:wrap}
.src-n{position:absolute;left:0;top:0;font-weight:800;font-size:7.6pt;color:var(--pine)}
.source a.url{display:block;color:var(--muted);word-break:break-all}
img{max-width:100%;height:auto}
hr{border:0;border-top:.6pt solid var(--line);margin:6mm 0}
`;
}
