// Toby: Instagram reels (make_reel). A port of the code behind Jane's approved reel (17 Nov 2026:
// reel.html, render.py, mix2.py): the whole reel is one HTML page with setTime(t); every frame is drawn
// offscreen and joined by ffmpeg. Words are real type set here (never drawn by AI), in the book's palette.
// Shot types:
//   photo  a checked photo with a slow camera move (zoom and pan)
//   clip   an AI video clip (made by make_video_clip): a trimmed part, sped up to fit the shot
//   book   the real book: its cover, then pages turning (chapter openers captured from book.html)
//   app    the real app on a phone: a tap on a button and the next screen
//   end    the book's cover with the call to action
// In "animatic" mode clip shots use their still picture (free), to check timing before any money is spent.
import {fonts} from './book-style.mjs';
import {carouselColours} from './carousel-builder.mjs';
import {SR, fromDb} from './media.mjs';

export const REEL_W = 1080, REEL_H = 1920, FPS = 30;
export const SHOT_TYPES = ['photo', 'clip', 'book', 'app', 'end'];
export const WORD_SIZES = ['big', 'mid', 'small'];
// Instagram covers the top and bottom of a reel with its own buttons and caption, and the right edge with
// the like, comment and share buttons: words stay between y 220 and 1500 and 140 px clear of the right edge.
export const SAFE = {top: 220, bottom: 1500, right: REEL_W - 140, left: 40};

const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rich = v => esc(v).replace(/\*\*(.+?)\*\*/g, '<span class="acc">$1</span>');
const r2 = x => Math.round(x * 100) / 100;

// Start and end time of every shot.
export function timeline(shots) {
  let t = 0;
  return shots.map(s => { const a = t; t = r2(t + s.seconds); return {...s, a, b: t}; });
}

// Checks that need no files. Returns a list of plain-English problems (empty = fine).
export function storyboardProblems(board) {
  const out = [], shots = board.shots || [];
  const total = shots.reduce((n, s) => n + s.seconds, 0);
  if (total < 6 || total > 20) out.push(`The reel is ${r2(total)} s long; make it 7 to 15 s.`);
  const all = JSON.stringify(board);
  if (/[—–]/.test(all)) out.push('Remove the em or en dashes from the storyboard.');
  shots.forEach((s, i) => {
    const n = 'Shot ' + (i + 1);
    if ((s.type === 'photo' || s.type === 'clip') && !s.image && !(s.type === 'clip' && s.clip)) out.push(`${n} (${s.type}) needs an image${s.type === 'clip' ? ' (its start picture) or a clip' : ''}.`);
    if (s.type === 'clip' && board.mode !== 'animatic') {
      if (!s.clip) out.push(`${n} is an AI clip with no clip file yet: make it with make_video_clip, or make an animatic first.`);
      if (s.clipFrom == null || s.clipTo == null || s.clipTo <= s.clipFrom) out.push(`${n} needs clipFrom and clipTo (the best part of the clip, in seconds).`);
      else { const speed = (s.clipTo - s.clipFrom) / s.seconds; if (speed < 0.8 || speed > 2) out.push(`${n} would play the clip at ${r2(speed)}x; keep it between 1x and 1.6x (change clipFrom, clipTo or seconds).`); }
    }
    if (s.type === 'book' && (!s.book || !(s.pages || []).length)) out.push(`${n} (book) needs book (the edition's book.html) and pages, e.g. ["cover","ch-5","ch-8"].`);
    if (s.type === 'app' && (!s.app || !s.tap)) out.push(`${n} (app) needs app (the app's index.html) and tap (the words on the button to tap).`);
    if (s.type === 'end' && !s.cover) out.push(`${n} (end) needs cover (the edition's book.html or a cover picture).`);
    (s.words || []).forEach((w, k) => {
      if (w.at < 0 || w.at >= s.seconds) out.push(`${n}, words ${k + 1}: "at" must be inside the shot (0 to ${s.seconds} s).`);
      if (w.y < SAFE.top || w.y > SAFE.bottom - 60) out.push(`${n}, words "${w.text}": y ${w.y} is outside the safe area (${SAFE.top} to ${SAFE.bottom - 60}).`);
      const count = w.text.replace(/\*\*/g, '').trim().split(/\s+/).length;
      if (w.size !== 'small' && count > 4) out.push(`${n}, words "${w.text}": big and mid words are 1 to 4 words at a time.`);
    });
  });
  if (shots.length && shots[shots.length - 1].type !== 'end') out.push('The last shot must be the end card (type "end").');
  const end = shots[shots.length - 1];
  if (end && end.type === 'end' && !(end.words || []).some(w => /comment/i.test(w.text))) out.push('The end card needs the comment call to action (Comment WORD and I\'ll send the link).');
  if (board.mode !== 'animatic' && shots[0] && shots[0].type !== 'clip') out.push('Shot 1 should be the real-action AI hook (type "clip") so the reel moves in the first 1 to 2 seconds.');
  (board.sounds || []).forEach((s, k) => { if (s.at < 0 || s.at > total) out.push(`Sound ${k + 1} (${s.file}) starts at ${s.at} s, outside the reel.`); });
  return out;
}

// The reel page. assets maps each storyboard path (and captured pages) to a file URL; clipFrames gives the
// frame URLs of each clip shot (index -> [url...]); appInfo gives each app shot's two screens and tap spot.
export function reelHtml(board, {url, clipFrames = {}, pages = {}, appInfo = {}}) {
  const C = carouselColours(board.palette || 'pine');
  const T = timeline(board.shots);
  const layers = T.map((s, i) => {
    const bg = s.image ? `<img class="bg" id="i${i}" src="${esc(url(s.image))}"${s.type === 'photo' || s.type === 'clip' ? '' : ' style="filter:blur(28px) brightness(.5)"'}>` : '';
    let inner = '';
    if (s.type === 'clip' && !(clipFrames[i] || []).length) inner = `<div class="tag">ANIMATIC: AI clip goes here (${esc(s.seconds)} s)</div>`;
    if (s.type === 'book') inner = `<div class="book" id="bk${i}"><div class="pg" id="pa${i}"></div><div class="pg" id="pb${i}"></div></div>`;
    if (s.type === 'app') inner = `<div class="phone" id="ph${i}"><div class="screen"><img id="a1_${i}" src="${esc(appInfo[i]?.before || '')}"><img id="a2_${i}" src="${esc(appInfo[i]?.after || '')}" style="opacity:0"></div><div class="tap" id="tp${i}"></div></div>`;
    if (s.type === 'end') inner = `<div class="endcover" id="ec${i}" style="background-image:url('${esc(pages[i]?.[0] || '')}')"></div>`;
    const solid = s.type === 'book' || s.type === 'end' ? C.deep : s.type === 'app' ? C.main : C.ink;
    return `<div class="layer" id="L${i}" style="background:${solid}">${bg}${inner}</div>`;
  }).join('\n');
  const words = [];
  T.forEach((s, i) => (s.words || []).forEach(w => words.push([r2(s.a + w.at), r2(s.a + (w.until != null ? Math.min(w.until, s.seconds) : s.seconds)), w.size || 'mid', w.y, rich(w.text)])));
  const data = {
    shots: T.map((s, i) => ({i, type: s.type, a: s.a, b: s.b, move: s.move || null, frames: clipFrames[i] || null, pages: pages[i] || null, tap: appInfo[i]?.tap || null, tapAt: s.tapAt ?? 0.6, appW: appInfo[i]?.width || 390})),
    words,
  };
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${fonts()}
html,body{margin:0;padding:0;background:#000;overflow:hidden}
#stage{position:relative;width:${REEL_W}px;height:${REEL_H}px;overflow:hidden;background:${C.ink};font-family:Outfit,sans-serif}
.layer{position:absolute;inset:0;overflow:hidden;opacity:0}
.layer img.bg{position:absolute;left:0;top:0;transform-origin:0 0}
.txt{position:absolute;left:70px;right:${REEL_W - SAFE.right + 10}px;color:#fff;font-weight:800;text-transform:uppercase;line-height:.95;letter-spacing:-1px;text-shadow:0 4px 28px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.4);opacity:0;transform-origin:0 50%;text-wrap:balance}
.big{font-size:118px}.mid{font-size:88px}.small{font-size:54px;font-weight:700;letter-spacing:0;text-transform:none;line-height:1.05}
.acc{color:${C.accent}}
.tag{position:absolute;left:40px;top:${SAFE.top + 16}px;background:rgba(27,37,48,.82);color:${C.accent};font:600 30px Outfit;padding:10px 20px;border-radius:30px}
.book{position:absolute;left:50%;top:50%;width:640px;height:914px;margin-left:-320px;margin-top:-500px;perspective:2400px}
.pg{position:absolute;inset:0;background-size:cover;background-position:center;border-radius:6px;box-shadow:0 30px 80px rgba(0,0,0,.45);backface-visibility:hidden}
.phone{position:absolute;left:50%;top:50%;width:480px;height:1039px;margin-left:-240px;margin-top:-500px;border-radius:66px;background:#111;box-shadow:0 40px 120px rgba(0,0,0,.5)}
.screen{position:absolute;left:18px;top:18px;right:18px;bottom:18px;border-radius:50px;overflow:hidden;background:${C.cream}}
.screen img{position:absolute;left:0;top:0;width:100%}
.tap{position:absolute;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.55);border:4px solid #fff;opacity:0}
.endcover{position:absolute;left:295px;top:470px;width:490px;height:700px;background:center/cover;border-radius:6px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
</style></head><body><div id="stage">
${layers}
<div id="texts"></div></div>
<script>
const W=${REEL_W},H=${REEL_H},D=${JSON.stringify(data)};
const $=id=>document.getElementById(id);
const lerp=(a,b,u)=>a+(b-a)*Math.max(0,Math.min(1,u));
const ease=u=>{u=Math.max(0,Math.min(1,u));return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2};
function place(img,zoom,fx,fy){const iw=img.naturalWidth,ih=img.naturalHeight;if(!iw)return;const s=Math.max(W/iw,H/ih)*zoom;let x=W/2-fx*iw*s,y=H/2-fy*ih*s;x=Math.min(0,Math.max(W-iw*s,x));y=Math.min(0,Math.max(H-ih*s,y));img.style.transform='translate('+x+'px,'+y+'px) scale('+s+')';}
const mv=(m,k,d)=>m&&Array.isArray(m[k])?m[k]:[d,d];
D.words.forEach((w,k)=>{const d=document.createElement('div');d.className='txt '+w[2];d.style.top=w[3]+'px';d.innerHTML=w[4];d.id='w'+k;$('texts').appendChild(d);});
async function drawShot(s,t){
  const len=s.b-s.a,u=t/len,img=$('i'+s.i);
  if(s.type==='photo'||(s.type==='clip'&&!s.frames)){const m=s.move||{zoom:[1,1.1]};if(img)place(img,lerp(...mv(m,'zoom',1),u),lerp(...mv(m,'x',.5),u),lerp(...mv(m,'y',.5),u));}
  if(s.type==='clip'&&s.frames){const n=Math.min(s.frames.length-1,Math.floor(t*${FPS}+1e-6));const want=s.frames[n];if(img.getAttribute('src')!==want){img.src=want;await img.decode().catch(()=>{});}const m=s.move||{};place(img,lerp(...mv(m,'zoom',1),u),lerp(...mv(m,'x',.5),u),lerp(...mv(m,'y',.5),u));}
  if(s.type!=='photo'&&s.type!=='clip'&&img)place(img,1.1,.5,.5);
  if(s.type==='book'){const bk=$('bk'+s.i),P=s.pages,e=ease(t/.3);bk.style.transform='translateY('+(1-e)*120+'px) scale('+lerp(.9,1,e)+')';
    const hold=Math.min(.75,len*.25),step=P.length>1?Math.min(.5,(len-hold-.25)/(P.length-1)):1,dur=Math.min(.28,step*.6);
    let k=Math.floor((t-hold)/step),v=(t-hold-k*step)/dur;const A=$('pa'+s.i),B=$('pb'+s.i);
    if(t<hold||k>=P.length-1||v>=1){const p=t<hold?0:Math.min(P.length-1,v>=1?k+1:k);A.style.backgroundImage="url('"+P[p]+"')";B.style.opacity=0;}
    else{A.style.backgroundImage="url('"+P[k+1]+"')";B.style.opacity=1;B.style.backgroundImage="url('"+P[k]+"')";B.style.transformOrigin='0 50%';B.style.transform='rotateY('+(-ease(v)*100)+'deg)';}}
  if(s.type==='app'){const ph=$('ph'+s.i),e=ease(t/.35);ph.style.transform='translateY('+(1-e)*200+'px) rotate('+lerp(-4,0,e)+'deg)';
    const tp=$('tp'+s.i),sx=444/s.appW,tu=(t-s.tapAt)/.35;if(s.tap){tp.style.left=(18+s.tap.x*sx-45)+'px';tp.style.top=(18+s.tap.y*sx-45)+'px';}
    tp.style.opacity=(tu>0&&tu<1)?(1-tu):0;tp.style.transform='scale('+lerp(.6,1.3,tu)+')';$('a2_'+s.i).style.opacity=ease((t-s.tapAt-.25)/.2);}
  if(s.type==='end'){const ec=$('ec'+s.i),e=ease(t/.35);ec.style.transform='translateY('+(1-e)*80+'px) scale('+lerp(.92,1,e)+')';ec.style.opacity=lerp(.45,1,e);}
}
window.setTime=async function(T){
  for(const s of D.shots){const L=$('L'+s.i),on=T>=s.a&&T<s.b;L.style.opacity=on?1:0;if(on)await drawShot(s,T-s.a);}
  D.words.forEach((w,k)=>{const d=$('w'+k),on=T>=w[0]&&T<w[1];if(!on){d.style.opacity=0;return;}const u=(T-w[0])/.12;d.style.opacity=Math.min(1,u);d.style.transform='scale('+lerp(.86,1,ease(u))+')';});
  return true;
};
// Where every word sits when it is fully shown (for the safe-area check).
window.wordBoxes=async function(){const out=[];for(let k=0;k<D.words.length;k++){const w=D.words[k];await setTime(Math.min(w[1]-.01,w[0]+.2));const r=$('w'+k).getBoundingClientRect();out.push({k,text:$('w'+k).textContent,top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.left+$('w'+k).scrollWidth),lines:Math.round(r.height/parseFloat(getComputedStyle($('w'+k)).lineHeight))});}return out;};
window.ready=Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.complete?1:new Promise(r=>{i.onload=r;i.onerror=r;}))).then(()=>document.fonts.ready).then(()=>true);
</script></body></html>`;
}

export function wordProblems(boxes) {
  const out = [];
  for (const b of boxes) {
    if (b.top < SAFE.top || b.bottom > SAFE.bottom) out.push(`Words "${b.text}" reach y ${b.top} to ${b.bottom}; keep them between ${SAFE.top} and ${SAFE.bottom}.`);
    if (b.right > SAFE.right + 2) out.push(`Words "${b.text}" run to x ${b.right}, under Instagram's buttons; shorten them or use a smaller size.`);
  }
  return out;
}

// Sound. Port of mix2.py (Tavin's approved mix, 17 Nov): every effect is a part of a file, faded in and out,
// turned up (or down) to its own peak level, placed at its time; the music bed follows a gain curve. No
// squashing by default (drive 1); drive above 1 is gentle saturation, only for very short grains.
function segment(x, from, to, fade) {
  const a = Math.max(0, Math.round(from * SR)), b = Math.min(x.length, to == null ? x.length : Math.round(to * SR));
  const y = x.slice(a, Math.max(a, b)), f = Math.round(fade * SR);
  if (f && y.length > 2 * f) for (let i = 0; i < f; i++) { y[i] *= i / f; y[y.length - 1 - i] *= i / f; }
  return y;
}
function interp(points, t) {
  if (!points.length) return 1;
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) if (t <= points[i][0]) { const [t0, g0] = points[i - 1], [t1, g1] = points[i]; return g0 + (g1 - g0) * (t - t0) / Math.max(1e-6, t1 - t0); }
  return points[points.length - 1][1];
}
function level(y, peakDb, drive) {
  let p = 0; for (const v of y) p = Math.max(p, Math.abs(v));
  const out = new Float32Array(y.length);
  if (!p) return out;
  const d = drive > 1 ? drive : 0, nd = d ? Math.tanh(d) : 1, g = fromDb(peakDb);
  for (let i = 0; i < y.length; i++) { const v = y[i] / p; out[i] = (d ? Math.tanh(v * d) / nd : v) * g; }
  return out;
}
export function mixReel({seconds, sounds = [], music = null}) {
  const N = Math.round(seconds * SR), fx = new Float32Array(N), placed = [];
  for (const s of sounds) {
    let y = segment(s.samples, s.from || 0, s.to, s.fade ?? 0.02);
    if (s.boost && s.boost.length) for (let i = 0; i < y.length; i++) y[i] *= interp(s.boost, i / SR);
    y = level(y, s.peakDb ?? -6, s.drive || 1);
    const i0 = Math.round(s.at * SR);
    for (let i = 0; i < y.length && i0 + i < N; i++) if (i0 + i >= 0) fx[i0 + i] += y[i] * (s.gain ?? 1);
    placed.push({file: s.file, at: s.at, seconds: r2(y.length / SR)});
  }
  const withMusic = new Float32Array(N);
  if (music) {
    const m = music.samples, off = Math.round((music.from || 0) * SR);
    const gains = music.gains && music.gains.length ? music.gains : [[0, 0.6], [Math.max(0, seconds - 0.7), 0.6], [seconds, 0]];
    for (let i = 0; i < N; i++) withMusic[i] = (m[off + i] || 0) * interp(gains, i / SR);
  }
  for (let i = 0; i < N; i++) withMusic[i] += fx[i];
  const norm = (x, peakDb = -1) => { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); const k = p ? fromDb(peakDb) / p : 0; for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
  return {music: norm(withMusic), fx: norm(fx), placed};
}

// Cuts and actions that a sound should land on, for the check note.
export function soundCheck(board) {
  const T = timeline(board.shots), cuts = T.slice(1).map(s => s.a);
  return (board.sounds || []).map(s => {
    const near = cuts.find(c => Math.abs(c - (s.at + (s.hit || 0))) <= 0.2);
    const shot = T.find(x => s.at + (s.hit || 0) >= x.a && s.at + (s.hit || 0) < x.b);
    return {file: s.file, at: s.at, on: near != null ? `the cut at ${near} s` : shot ? `shot ${T.indexOf(shot) + 1} (${shot.type})` : 'nothing'};
  });
}

export function checkNote({board, name, files, words, problems, loud, clips, spend}) {
  const T = timeline(board.shots);
  const lines = ['# Reel check: ' + name, '', '- Made: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', '- Mode: ' + (board.mode || 'final'),
    '- Result: ' + (problems.length ? `NEEDS FIXES (${problems.length})` : 'PASSED'), `- Length: ${T.length ? T[T.length - 1].b : 0} s, ${REEL_W} x ${REEL_H}, ${FPS} fps`];
  for (const [label, l] of Object.entries(loud || {})) lines.push(`- Loudness (${label}): ${l.lufs} LUFS, peak ${l.truePeakDb} dB (aim: about -14 LUFS, peak below -1 dB)`);
  if (spend) lines.push(`- fal spent on this reel: $${spend.total.toFixed(2)} of $${spend.limit.toFixed(2)}`);
  lines.push('', '## Files', ...files.map(f => '- ' + f), '', '## Shots');
  T.forEach((s, i) => lines.push(`${i + 1}. ${s.a} to ${s.b} s, ${s.type}${s.type === 'clip' && clips[i] ? `: ${clips[i]}` : ''}${(s.words || []).length ? ': ' + s.words.map(w => '"' + w.text.replace(/\*\*/g, '') + '"').join(', ') : ''}`));
  lines.push('', '## Sounds', ...(board.sounds || []).length ? soundCheck(board).map(s => `- ${s.at} s ${s.file}: on ${s.on}`) : ['- none']);
  if (board.music) lines.push(`- music: ${board.music.file}`);
  lines.push('', '## Words in the safe area (y 220 to 1500, clear of the right 140 px)', ...words.map(w => `- "${w.text}": y ${w.top} to ${w.bottom}, ${w.lines} line${w.lines === 1 ? '' : 's'}`));
  lines.push('', '## To fix', ...(problems.length ? problems.map(p => '- ' + p) : ['- nothing']));
  lines.push('', 'Contact sheet: 5 frames a second, left to right, top to bottom (frame n is at n/5 s). Look at every frame, and hands at full size, before anyone calls the reel done. Sound: nobody on the team can hear; Tavin judges the finished reel.');
  return lines.join('\n') + '\n';
}
