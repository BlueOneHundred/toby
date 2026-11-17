// Toby: Instagram carousels made from a book's checked photos and real type (make_carousel).
// No AI-drawn text: every word is set here in the book's fonts and palette. Two layouts, both
// approved by Tavin on 16 Nov 2026 (Jane's samples):
//   panel: the photo fills the top of the slide and fades into a solid colour panel with the words.
//   card:  the photo sits on top at full width (its own shape), words on a cream card with a label pill.
// Slides are 1080 x 1350 (Instagram portrait). The first slide is a cover, the last one shows the book.
import {fonts} from './book-style.mjs';
import {palette, mix, contrast} from './palettes.mjs';

export const SLIDE_W = 1080, SLIDE_H = 1350;
export const LAYOUTS = ['panel', 'card'];
export const SLIDE_TYPES = ['cover', 'point', 'flag', 'end'];
const SAFE = {side: 40, top: 30, bottom: 30};

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Text may carry *one* emphasis: **word** becomes the accent colour. Nothing else is markup.
const rich = value => esc(value).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const focusCss = focus => /^\d{1,3}% \d{1,3}%$/.test(String(focus || '')) ? focus : '50% 50%';

// The colours a carousel uses, taken from the book's palette so a creator's posts match their book.
export function carouselColours(name) {
  const b = palette(name).book;
  return {main: b.pine, deep: b.pineDeep, accent: b.marigold, cream: mix(b.marigold, '#FFFFFF', 0.86), card: '#FDF6EA', blush: b.blush, ink: b.ink, muted: b.muted, line: b.line, white: '#FFFFFF'};
}

function baseCss(C) {
  return `${fonts()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;background:${C.card}}
body{font-family:'Source Serif 4',serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.slide{position:relative;width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden}
.top{position:absolute;left:72px;right:72px;top:56px;display:flex;justify-content:space-between;font-family:'Outfit';font-weight:600;font-size:28px;letter-spacing:.04em;color:#fff;z-index:3}
.top span{background:${C.ink};padding:8px 18px;border-radius:999px}
.h{font-family:'Outfit';font-weight:800;line-height:1.02;letter-spacing:-.01em}
.h b,.b b{color:${C.accent};font-weight:inherit}
.kick{font-family:'Outfit';font-weight:700;font-size:32px;letter-spacing:.14em;text-transform:uppercase}
.src{font-family:'Outfit';font-weight:500;font-size:24px}
.photo{position:absolute;left:0;top:0;width:100%;object-fit:cover;display:block}
`;
}

function panelCss(C) {
  return `
.slide.dark{background:${C.deep}}
.shade{position:absolute;left:0;right:0;bottom:0}
.txt{position:absolute;left:72px;right:72px;bottom:96px;color:#fff}
.txt .h{font-size:88px;text-transform:uppercase}
.txt .b{font-size:40px;line-height:1.35;margin-top:22px;color:${C.card}}
.txt .kick{color:${C.accent};margin-bottom:22px}
.txt .src{margin-top:30px;color:${C.accent}}
.badge{display:inline-block;font-family:'Outfit';font-weight:800;font-size:40px;color:${C.deep};background:${C.accent};border-radius:999px;min-width:72px;height:72px;line-height:72px;padding:0 20px;text-align:center;margin-bottom:20px}
.swipe{font-family:'Outfit';font-weight:700;font-size:34px;color:${C.accent};margin-top:34px}
`;
}

function cardCss(C) {
  return `
.bar{position:absolute;left:0;right:0;top:712px;height:8px;background:${C.accent}}
.card{position:absolute;left:0;right:0;top:720px;bottom:0;background:${C.card};padding:56px 72px 0}
.pill{display:inline-block;font-family:'Outfit';font-weight:700;font-size:30px;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:${C.main};padding:12px 24px;border-radius:999px}
.card .h{font-size:68px;color:${C.deep};margin-top:26px}
.card .b{font-size:38px;line-height:1.4;margin-top:20px}
.card .h b,.card .b b{color:${C.main}}
.slide>.src{position:absolute;left:72px;right:72px;bottom:48px;color:${C.muted}}
.cardcover{position:absolute;left:0;right:0;top:760px;bottom:0;background:${C.main};padding:64px 72px 0;color:#fff}
.cardcover .kick{color:${C.card}}
.cardcover .h{font-size:92px;margin-top:20px}
.cardcover .b{font-size:38px;line-height:1.4;margin-top:20px;color:${C.card}}
.cardcover .swipe{font-family:'Outfit';font-weight:700;font-size:34px;margin-top:28px;color:${C.card}}
`;
}

function endCss(C) {
  return `
.end{background:${C.blush}}
.end .top span{background:none;padding:0;color:${C.deep}}
.bk{position:absolute;left:96px;top:190px;width:500px;border-radius:10px;box-shadow:0 30px 60px ${mix(C.deep, C.blush, 0.55)};transform:rotate(-3deg)}
.side{position:absolute;left:630px;right:56px;top:250px}
.side .kick{color:${C.main};font-size:28px;letter-spacing:.12em}
.side .h{font-size:50px;line-height:1.05;color:${C.deep};margin-top:18px}
.side ul{list-style:none;margin-top:28px}
.side li{font-family:'Outfit';font-weight:600;font-size:30px;line-height:1.3;color:${C.ink};padding:14px 0;border-bottom:2px solid ${C.line}}
.cta{position:absolute;left:96px;right:96px;bottom:150px;background:${C.main};color:#fff;border-radius:28px;padding:44px 56px;text-align:center}
.cta .t{font-family:'Outfit';font-weight:800;font-size:58px}
.cta .s{font-size:34px;margin-top:10px;color:${C.card}}
`;
}

const page = (css, inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${inner}</body></html>`;
const topBar = (handle, i, n) => `<div class="top"><span>${esc(handle)}</span><span>${i}/${n}</span></div>`;

// One slide as a complete HTML page. images maps a slide's image path to a data: URL.
export function slideHtml({slide, index, total, layout = 'panel', paletteName = 'pine', handle = '', images = {}, bookCover = ''}) {
  const C = carouselColours(paletteName);
  const css = baseCss(C) + (layout === 'card' ? cardCss(C) : panelCss(C)) + endCss(C);
  const top = topBar(handle && !String(handle).startsWith('@') ? '@' + handle : handle, index, total);
  const img = slide.image ? images[slide.image] : '';
  const src = slide.source ? `<div class="src">${esc(slide.source)}</div>` : '';
  const body = slide.body ? `<div class="b">${rich(slide.body)}</div>` : '';
  const label = slide.label ? String(slide.label) : '';
  if (slide.type === 'end') {
    const list = (slide.bullets || []).slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('');
    return page(css, `<div class="slide end">${top}${bookCover ? `<img class="bk" src="${bookCover}" alt="">` : ''}
<div class="side fit"><div class="kick">${esc(slide.kicker || 'The full guide')}</div><div class="h">${rich(slide.title)}</div>${list ? `<ul>${list}</ul>` : ''}</div>
<div class="cta fit"><div class="t">${esc(slide.cta || 'Link in bio')}</div>${slide.body ? `<div class="s">${esc(slide.body)}</div>` : ''}</div></div>`);
  }
  if (slide.type === 'flag') {
    const bg = layout === 'card' ? C.main : C.deep;
    return page(css + `.slide.flagged{background:${bg}}`, `<div class="slide flagged">${top}
<div class="txt fit" style="position:absolute;left:72px;right:72px;top:300px;color:#fff"><div class="kick" style="color:${C.accent};margin-bottom:22px">${esc(slide.kicker || 'Red flag')}</div><div class="h" style="font-size:100px;text-transform:uppercase">${rich(slide.title)}</div>
<div class="b" style="font-size:46px;line-height:1.35;margin-top:22px;color:${C.card}">${rich(slide.body || '')}</div>${slide.source ? `<div class="src" style="margin-top:30px;color:${C.accent}">${esc(slide.source)}</div>` : ''}</div></div>`);
  }
  if (layout === 'card') {
    if (slide.type === 'cover') {
      return page(css, `<div class="slide">${img ? `<img class="photo" src="${img}" style="height:760px;object-position:${focusCss(slide.focus)}" alt="">` : ''}${top}
<div class="cardcover fit"><div class="kick">${esc(slide.kicker || '')}</div><div class="h">${rich(slide.title)}</div>${body}<div class="swipe">Swipe &rarr;</div></div></div>`);
    }
    return page(css, `<div class="slide">${img ? `<img class="photo" src="${img}" style="height:720px;object-position:${focusCss(slide.focus)}" alt="">` : ''}${top}<div class="bar"></div>
<div class="card fit" data-room="90">${label ? `<span class="pill">${esc(label)}</span>` : ''}<div class="h">${rich(slide.title)}</div>${body}</div>${src}</div>`);
  }
  // panel layout
  if (slide.type === 'cover') {
    return page(css, `<div class="slide dark">${img ? `<img class="photo" src="${img}" style="height:820px;object-position:${focusCss(slide.focus)}" alt="">` : ''}
<div class="shade" style="top:660px;background:linear-gradient(to bottom,${hexA(C.deep, 0)} 0px,${C.deep} 160px)"></div>${top}
<div class="txt fit" style="bottom:84px">${slide.kicker ? `<div class="kick">${esc(slide.kicker)}</div>` : ''}<div class="h" style="font-size:112px">${rich(slide.title)}</div>${body}<div class="swipe" style="margin-top:26px">Swipe &rarr;</div></div></div>`);
  }
  const badge = label ? `<div class="badge">${esc(label)}</div>` : '';
  return page(css, `<div class="slide dark">${img ? `<img class="photo" src="${img}" style="height:880px;object-position:${focusCss(slide.focus)}" alt="">` : ''}
<div class="shade" style="top:700px;background:linear-gradient(to bottom,${hexA(C.deep, 0)} 0px,${C.deep} 180px)"></div>${top}
<div class="txt fit">${badge}<div class="h">${rich(slide.title)}</div>${body}${src}</div></div>`);
}

// rgba() from a hex colour; used only inside gradients that fade a photo into a solid colour.
function hexA(hex, alpha) { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`; }

// Runs inside each slide (in the hidden window) before it is captured. It shrinks a heading that
// is too big for its space (down to 70%), then reports anything outside the safe area, cut off,
// under the top bar, a picture that did not load or a font that did not load, and returns every text box
// so the contrast can be measured on the real background.
export const SLIDE_SCRIPT = `(async()=>{
await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>null)));
const W=${SLIDE_W},H=${SLIDE_H},S=${JSON.stringify(SAFE)};const problems=[];
const topBar=document.querySelector('.top');const topB=topBar?topBar.getBoundingClientRect().bottom:0;
const bad=el=>{const rs=[...el.children].map(c=>c.getBoundingClientRect());if(!rs.length)return false;const l=Math.min(...rs.map(r=>r.left)),t=Math.min(...rs.map(r=>r.top)),rt=Math.max(...rs.map(r=>r.right)),b=Math.max(...rs.map(r=>r.bottom));return l<S.side||rt>W-S.side||b>H-S.bottom-(el.dataset.room?Number(el.dataset.room):0)||t<topB+10;};
for(const box of document.querySelectorAll('.fit')){const h=box.querySelector('.h');if(!h)continue;const start=parseFloat(getComputedStyle(h).fontSize);let size=start;
 while((bad(box)||box.scrollHeight>box.clientHeight+1&&getComputedStyle(box).overflow!=='visible'||h.scrollWidth>h.clientWidth+1)&&size>start*0.7){size-=2;h.style.fontSize=size+'px';}
 if(size<start)problems.push({kind:'shrunk',text:h.textContent.trim().slice(0,60),from:start,to:size});}
const texts=[];
for(const el of document.querySelectorAll('.slide *')){const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!own)continue;
 const r=el.getBoundingClientRect(),cs=getComputedStyle(el),t=el.textContent.trim().slice(0,60);
 if(r.left<S.side||r.right>W-S.side||r.bottom>H-S.bottom||r.top<S.top)problems.push({kind:'outside',text:t});
 if(el.scrollWidth>el.clientWidth+1)problems.push({kind:'cut',text:t});
 if(!el.closest('.top')&&r.top<topB+10)problems.push({kind:'topbar',text:t});
 let bg=null;for(let p=el;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p).backgroundColor;if(c&&c!=='transparent'&&!/rgba\\([^)]*,\\s*0\\)$/.test(c)){if(p===el||!p.classList.contains('slide'))bg=c;break;}}
 texts.push({text:t,box:[r.left,r.top,r.right,r.bottom],color:cs.color,size:parseFloat(cs.fontSize),bold:parseInt(cs.fontWeight)>=600,own:getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)'?getComputedStyle(el).backgroundColor:null});}
for(const i of document.images)if(!i.naturalWidth)problems.push({kind:'image',text:'a picture did not load'});
const families=new Set([...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family.replace(/["']/g,'')));
for(const f of ['Outfit','Source Serif 4'])if(!families.has(f))problems.push({kind:'font',text:f});
return {problems,texts};})()`;

// Hides every word, so the slide can be captured a second time to see what each word sits on.
export const HIDE_TEXT_CSS = '.slide *{color:transparent!important;text-shadow:none!important}';

const parseRgb = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(Number); return v.slice(0, 3); };
const rel = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };

// Measures each word's contrast against the real pixels behind it (a BGRA bitmap of the slide without words,
// as Electron's toBitmap gives it). Light text is judged against the lightest 5% of its background, dark text
// against the darkest 5%: the worst place a reader's eye can land. Text with its own solid background
// (a pill, a badge) is judged against that colour. Large text (36 px and up) needs 3:1, smaller text 4.5:1.
export function contrastProblems(texts, bitmap, width, height) {
  const problems = []; let lowest = 99;
  for (const t of texts) {
    const fg = parseRgb(t.color); if (!fg) continue; const Lf = rel(fg);
    let Lb;
    const own = t.own && parseRgb(t.own);
    if (own) Lb = rel(own);
    else {
      const [x0, y0, x1, y1] = t.box.map(Math.round), xs = Math.max(0, x0), ys = Math.max(0, y0), xe = Math.min(width, x1), ye = Math.min(height, y1);
      const values = [];
      for (let y = ys; y < ye; y += 2) for (let x = xs; x < xe; x += 2) { const i = (y * width + x) * 4; values.push(rel([bitmap[i + 2], bitmap[i + 1], bitmap[i]])); }
      if (!values.length) continue;
      values.sort((a, b) => a - b);
      Lb = Lf > 0.5 ? values[Math.floor(values.length * 0.95)] : values[Math.floor(values.length * 0.05)];
    }
    const ratio = (Math.max(Lf, Lb) + 0.05) / (Math.min(Lf, Lb) + 0.05), need = t.size >= 36 ? 3 : 4.5;
    lowest = Math.min(lowest, ratio);
    if (ratio < need) problems.push({kind: 'contrast', text: t.text, ratio: Math.round(ratio * 10) / 10, need});
  }
  return {problems, lowest: lowest === 99 ? null : Math.round(lowest * 10) / 10};
}

// House writing rules that apply to slide text too.
export function textProblems(slides) {
  const out = [];
  slides.forEach((s, i) => {
    for (const field of ['kicker', 'title', 'body', 'source', 'label', 'cta'])
      if (/[–—]/.test(s[field] || '')) out.push(`Slide ${i + 1}: remove the dash in the ${field} (no em or en dashes).`);
    if (s.type !== 'flag' && s.type !== 'end' && !s.image) out.push(`Slide ${i + 1}: a ${s.type} slide needs an image (a checked photo from the book).`);
  });
  if (slides[0]?.type !== 'cover') out.push('The first slide must be a cover.');
  if (slides[slides.length - 1]?.type !== 'end') out.push('The last slide must be an end slide pointing to the book.');
  if (slides.filter(s => s.type === 'cover').length > 1) out.push('Only one cover slide.');
  return out;
}

// Turns what the renderer found into plain instructions for the bot.
export function carouselToFix(results) {
  const out = [];
  results.forEach((r, i) => {
    for (const p of r.problems) {
      const n = `Slide ${i + 1}`;
      if (p.kind === 'outside' || p.kind === 'topbar' || p.kind === 'cut') out.push(`${n}: "${p.text}" does not fit. Shorten the title or body.`);
      else if (p.kind === 'contrast') out.push(`${n}: "${p.text}" is hard to read (${p.ratio}:1, needs ${p.need}:1). Move the photo focus so the words sit on a calmer part, or use the other layout.`);
      else if (p.kind === 'image') out.push(`${n}: the picture did not load. Check the image path.`);
      else if (p.kind === 'font') out.push(`${n}: the font ${p.text} did not load. Run make_carousel again; tell Toby if it repeats.`);
    }
  });
  return out;
}

// One overview picture of every slide, for a quick look (4 across).
export function sheetHtml(dataUrls) {
  const cols = 4, w = 360, h = 450, rows = Math.ceil(dataUrls.length / cols);
  return {width: cols * w + (cols + 1) * 12, height: rows * h + (rows + 1) * 12, html: `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{overflow:hidden}body{background:#EDEDED;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:12px;padding:12px}img{width:${w}px;height:${h}px;display:block}</style></head><body>${dataUrls.map(u => `<img src="${u}" alt="">`).join('')}</body></html>`};
}

export function checkNote({title, layout, paletteName, results, toFix, textFix, files}) {
  const lines = [`# Carousel check: ${title}`, '', `- Built: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, `- Result: ${toFix.length ? `NEEDS FIXES (${toFix.length})` : 'PASSED'}`, `- Layout: ${layout}, palette: ${paletteName}, slides: ${results.length}`,
    '- Checked: text inside the safe area, nothing cut off, nothing under the top bar, contrast on the real background (4.5:1 small, 3:1 large), pictures and fonts loaded, house writing rules', ''];
  lines.push('| Slide | File | Lowest contrast | Notes |', '|---|---|---|---|');
  results.forEach((r, i) => lines.push(`| ${i + 1} | ${files[i]} | ${r.lowest ?? 'n/a'}:1 | ${r.problems.filter(p => p.kind === 'shrunk').map(p => `title shrunk ${p.from} to ${p.to} px`).join('; ') || ''} |`));
  lines.push('', ...(toFix.length ? ['## To fix', ...toFix.map(x => '- ' + x)] : ['Nothing to fix. A person still looks at every slide before it goes to the creator.']), '');
  return lines.join('\n');
}

export {contrast};
