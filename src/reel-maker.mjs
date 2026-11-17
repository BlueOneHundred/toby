// Toby: make_reel's work from a storyboard to the finished MP4s (see reel-builder.mjs for the page and mix).
// Everything happens in a scratch folder inside the team folder (the page may only load files from there),
// which is removed at the end so the team folder stays small.
import {mkdir, rm, readFile, writeFile, readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {ffmpeg, decodeAudio, loudness, wav} from './media.mjs';
import {REEL_W, REEL_H, FPS, timeline, storyboardProblems, reelHtml, wordProblems, mixReel, checkNote} from './reel-builder.mjs';

const PAGE_W = 672, PAGE_H = 960;
const pageSelector = id => id === 'cover' ? '.cover' : /^ch-\d{1,2}$/.test(id) ? '#' + id : null;
// Show only the chosen page of the book, at the top, so its box can be captured.
const onlyPage = sel => `(()=>{const t=document.querySelector(${JSON.stringify(sel)});if(!t)return false;let n=t;while(n&&n.parentElement){[...n.parentElement.children].forEach(c=>{if(c!==n&&c.tagName!=='SCRIPT'&&c.tagName!=='STYLE')c.style.display='none';});n=n.parentElement;}window.scrollTo(0,0);return true;})()`;
// Click a button by its words (exact first, then starts-with), after the page settles; returns its centre.
const clickText = (texts, last) => `(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));await sleep(1200);
const find=t=>{const els=[...document.querySelectorAll('button,a,[role=button],label,li,div,span,p')].filter(e=>e.offsetParent!==null);
 const norm=s=>(s||'').replace(/\\s+/g,' ').trim().toLowerCase();const want=norm(t);
 return els.filter(e=>norm(e.innerText)===want).sort((a,b)=>a.innerText.length-b.innerText.length)[0]||els.filter(e=>norm(e.innerText).startsWith(want)).sort((a,b)=>a.innerText.length-b.innerText.length)[0];};
for(const t of ${JSON.stringify(texts)}){const e=find(t);if(e){e.click();await sleep(700);}}
${last ? `const e=find(${JSON.stringify(last.text)});if(!e)return {missing:${JSON.stringify(last.text)}};const r=e.getBoundingClientRect();const pos={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};${last.click ? 'e.click();await sleep(900);' : ''}window.scrollTo(0,0);return pos;` : 'return true;'}})()`;

export async function makeReel({board, teamFolder, renderPage, renderFrames, signal, spend, onProgress = () => {}}) {
  const problems = storyboardProblems(board);
  if (problems.length) return {passed: false, toFix: problems, note: 'Nothing was made. Fix the storyboard and run make_reel again.'};
  const folder = board.folder.replace(/[\\/]+$/, ''), name = board.name || 'reel';
  const root = teamFolder.root(), abs = (p, writing = false) => teamFolder.target(null, p, writing), fileUrl = async p => pathToFileURL(await abs(p)).href;
  const workRel = `${folder}/_work-${name}`, work = await abs(workRel, true);
  await rm(work, {recursive: true, force: true}); await mkdir(work, {recursive: true});
  const T = timeline(board.shots), seconds = T[T.length - 1].b, frames = Math.round(seconds * FPS);
  const urls = new Map(), url = p => urls.get(p) || p;
  const toFix = [];
  try {
    for (const s of board.shots) for (const p of [s.image]) if (p && !urls.has(p)) {
      try { await readFile(await abs(p)); } catch { toFix.push(`The picture ${p} was not found in the team folder.`); continue; }
      urls.set(p, await fileUrl(p));
    }
    // AI clips: the chosen part, sped up to fit, cropped to 9:16, as frames.
    const clipFrames = {}, clipNotes = {};
    if (board.mode !== 'animatic') for (const [i, s] of T.entries()) {
      if (s.type !== 'clip') continue;
      const src = await abs(s.clip); try { await readFile(src); } catch { toFix.push(`The clip ${s.clip} was not found.`); continue; }
      const speed = (s.clipTo - s.clipFrom) / s.seconds, dir = join(work, 'c' + i), fx = s.focusX ?? 0.5;
      await mkdir(dir, {recursive: true});
      onProgress(`Cutting clip ${i + 1}`);
      await ffmpeg(['-ss', String(s.clipFrom), '-i', src, '-t', String(s.clipTo - s.clipFrom), '-vf',
        `setpts=(PTS-STARTPTS)/${speed.toFixed(4)},fps=${FPS},scale=${REEL_W}:${REEL_H}:force_original_aspect_ratio=increase,crop=${REEL_W}:${REEL_H}:(iw-${REEL_W})*${fx}:(ih-${REEL_H})/2`,
        '-frames:v', String(Math.round(s.seconds * FPS)), '-q:v', '3', join(dir, '%04d.jpg')], {signal});
      const list = (await readdir(dir)).filter(f => f.endsWith('.jpg')).sort();
      if (list.length < Math.round(s.seconds * FPS) - 2) toFix.push(`Clip ${s.clip} gave only ${list.length} frames for a ${s.seconds} s shot; choose a longer part (clipFrom to clipTo).`);
      clipFrames[i] = list.map(f => pathToFileURL(join(dir, f)).href);
      clipNotes[i] = `${s.clip.split('/').pop()} ${s.clipFrom} to ${s.clipTo} s at ${speed.toFixed(2)}x`;
    }
    // The real book: its cover and chapter openers, captured from the edition's book.html.
    const pages = {};
    for (const [i, s] of T.entries()) {
      const ids = s.type === 'book' ? s.pages : s.type === 'end' && /\.html?$/i.test(s.cover) ? ['cover'] : null;
      if (s.type === 'end' && !ids) { try { await readFile(await abs(s.cover)); pages[i] = [await fileUrl(s.cover)]; } catch { toFix.push(`The cover picture ${s.cover} was not found.`); } continue; }
      if (!ids) continue;
      const book = await abs(s.type === 'book' ? s.book : s.cover);
      try { await readFile(book); } catch { toFix.push(`The book ${s.type === 'book' ? s.book : s.cover} was not found.`); continue; }
      pages[i] = [];
      for (const [k, id] of ids.entries()) {
        const sel = pageSelector(id);
        if (!sel) { toFix.push(`Page "${id}" is not a page I can show: use "cover" or a chapter opener such as "ch-5".`); continue; }
        onProgress(`Capturing book page ${id}`);
        let shot;
        try { shot = await renderPage({file: book, width: PAGE_W, height: PAGE_H, root, signal, script: onlyPage(sel), clipSelector: sel, quality: 90}); }
        catch (error) { toFix.push(`Page "${id}" could not be captured: ${String(error.message).slice(0, 120)}`); continue; }
        const out = join(work, `b${i}-${k}.jpg`); await writeFile(out, shot.jpeg); pages[i].push(pathToFileURL(out).href);
      }
    }
    // The real app on a phone: the screen before and after the tap.
    const appInfo = {};
    for (const [i, s] of T.entries()) {
      if (s.type !== 'app') continue;
      const app = await abs(s.app); try { await readFile(app); } catch { toFix.push(`The app ${s.app} was not found.`); continue; }
      onProgress('Capturing the app');
      const before = await renderPage({file: app, width: 390, height: 844, scale: 2, root, signal, freshStorage: true, script: clickText(s.setup || [], {text: s.tap, click: false}), quality: 92});
      if (before.result?.missing) { toFix.push(`The app has no button "${s.tap}" (after ${JSON.stringify(s.setup || [])}). Use the button's exact words.`); continue; }
      const after = await renderPage({file: app, width: 390, height: 844, scale: 2, root, signal, freshStorage: true, script: clickText(s.setup || [], {text: s.tap, click: true}), quality: 92});
      const a = join(work, `a${i}-1.jpg`), b = join(work, `a${i}-2.jpg`); await writeFile(a, before.jpeg); await writeFile(b, after.jpeg);
      appInfo[i] = {before: pathToFileURL(a).href, after: pathToFileURL(b).href, tap: before.result, width: 390};
    }
    if (toFix.length) return {passed: false, toFix, note: 'Nothing was made. Fix these and run make_reel again.'};

    const htmlFile = join(work, 'reel.html');
    await writeFile(htmlFile, reelHtml(board, {url, clipFrames, pages, appInfo}));
    // Draw every frame and feed it to ffmpeg (H.264, 30 fps).
    onProgress(`Drawing ${frames} frames`);
    const silent = join(work, 'video.mp4');
    let child, done;
    const encoding = ffmpeg(['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], {signal, onSpawn: c => { child = c; }});
    encoding.catch(() => {});
    const write = buf => new Promise((resolve, reject) => { if (!child || child.stdin.destroyed) return reject(new Error('The video encoder stopped.')); child.stdin.write(buf, e => e ? reject(e) : resolve()); });
    const {result: boxes} = await renderFrames({file: htmlFile, width: REEL_W, height: REEL_H, root, signal, frames,
      setup: 'window.ready.then(()=>wordBoxes())', frameScript: i => `setTime(${(i / FPS).toFixed(4)})`, onFrame: write, quality: 92});
    child.stdin.end(); done = await encoding;
    const words = boxes || [];
    toFix.push(...wordProblems(words));

    // Sound: effects on their cuts and actions, the music bed, then loudness about -14 LUFS.
    const files = [], loud = {}, outVideo = `${folder}/${name}.mp4`, outFx = `${folder}/${name}-no-music.mp4`;
    const hasSound = (board.sounds || []).length || board.music;
    const save = async (from, rel) => { const bytes = await readFile(from); await teamFolder.writeBytes(null, rel, bytes); files.push(rel); };
    if (hasSound) {
      onProgress('Mixing the sound');
      const cache = new Map(), load = async f => { if (!cache.has(f)) cache.set(f, await decodeAudio(await abs(f), {signal})); return cache.get(f); };
      const sounds = [];
      for (const s of board.sounds || []) { try { sounds.push({...s, samples: await load(s.file)}); } catch { toFix.push(`The sound ${s.file} was not found or could not be read.`); } }
      let music = null;
      if (board.music) { try { music = {...board.music, samples: await load(board.music.file)}; } catch { toFix.push(`The music ${board.music.file} was not found or could not be read.`); } }
      const mix = mixReel({seconds, sounds, music});
      const mux = async (signalWav, out) => {
        const w = join(work, 'mix.wav'); await writeFile(w, wav(signalWav));
        const o = join(work, 'out.mp4');
        await ffmpeg(['-y', '-i', silent, '-i', w, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', o], {signal});
        loud[out.split('/').pop()] = await loudness(o, {signal});
        await save(o, out);
      };
      await mux(mix.music, outVideo);
      await mux(mix.fx, outFx);
    } else await save(silent, outVideo);
    // Contact sheet: 5 frames a second, 10 across.
    const rows = Math.ceil(seconds * 5 / 10), sheetFile = join(work, 'sheet.jpg');
    await ffmpeg(['-y', '-i', await abs(outVideo), '-vf', `fps=5,scale=216:384,tile=10x${rows}:padding=4:color=white`, '-frames:v', '1', '-q:v', '3', sheetFile], {signal});
    await save(sheetFile, `${folder}/${name}-sheet.jpg`);
    for (const [label, l] of Object.entries(loud)) if (l.lufs != null && (l.lufs < -16 || l.lufs > -12)) toFix.push(`${label} is ${l.lufs} LUFS; it should be about -14.`);
    await teamFolder.writeBytes(null, `${folder}/${name}.json`, Buffer.from(JSON.stringify(board, null, 1))); files.push(`${folder}/${name}.json`);
    const noteRel = `${folder}/${name}-check.md`;
    await teamFolder.writeBytes(null, noteRel, Buffer.from(checkNote({board, name, files: [...files, noteRel], words, problems: toFix, loud, clips: clipNotes, spend})));
    return {passed: toFix.length === 0, toFix, files: [...files, noteRel], seconds, frames, loudness: loud, sheet: `${folder}/${name}-sheet.jpg`, checkNote: noteRel, encoder: done ? 'ok' : 'ok'};
  } finally { await rm(work, {recursive: true, force: true}).catch(() => {}); }
}
