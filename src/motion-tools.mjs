// Toby: Motion Studio's three tools (17 Nov 2026), registered by agent-tools.mjs for bots with team files.
//   make_video_clip  an AI clip on fal from a checked photo (Kling 2.5 Turbo Pro by default), $1.50 a reel cap
//   make_sound       sound effects or a music bed on ElevenLabs, several takes, measured and ranked
//   make_reel        the finished reel from a storyboard (see reel-maker.mjs)
import {z} from 'zod';
import {mkdir, rm, readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {ffmpeg, decodeAudio, measureSound, rankTakes} from './media.mjs';
import {VIDEO_MODELS, DEFAULT_VIDEO_MODEL, NEGATIVE, budgetCheck, runFalQueue, logCredits} from './video-clip.mjs';
import {SFX_MODELS, MUSIC_MODELS, soundPromptProblems, elevenLabs, effectBody, musicBody} from './sound-maker.mjs';
import {SHOT_TYPES, WORD_SIZES} from './reel-builder.mjs';
import {makeReel} from './reel-maker.mjs';
import {PALETTE_NAMES} from './palettes.mjs';

const clean = p => String(p).replace(/\\/g, '/').replace(/\/+$/, '');

export function registerMotionTools({register, text, teamFolder, connections, renderPage, renderFrames, cropToRatio, ledger, approve, signal, fetchImpl = fetch, wait}) {
  const abs = (p, writing = false) => teamFolder.target(null, p, writing);
  const scratch = async rel => { const dir = await abs(rel, true); await rm(dir, {recursive: true, force: true}); await mkdir(dir, {recursive: true}); return dir; };
  const saveFrom = async (from, rel) => { await teamFolder.writeBytes(null, rel, await readFile(from)); return rel; };

  if (cropToRatio && ledger) register('make_video_clip', 'Make one AI video clip on fal from a checked photo in the team folder (image-to-video, Kling 2.5 Turbo Pro by default, 5 s for $0.35). It costs real money: each reel folder has a $1.50 limit, counted in code; a clip that would go over it asks Tavin in Toby first and is not made if he says no. The photo is cropped to 9:16 by code (focusX and focusY move the crop, 0.5 is the middle). The prompt must describe one clear physical action (tear, pull, lift, pour, stretch, sprinkle): on a still photo with no action the model only moves the camera. Never ask for words, faces or logos. Saves <reel>/<name>.mp4, <name>-sheet.jpg (10 frames a second, 10 across) and full-size frames every half second in <name>-frames/, and writes the cost to samples/credits-<month>.md. Look at every frame (hands at full size) before using the clip; the best moment is often 3 to 4.5 s in, and the last second may morph. If fal is slow, the result gives a request id: call again with resume set to it (no new charge), never submit again.',
    {reel: z.string().min(1).max(300), name: z.string().regex(/^[a-z0-9][a-z0-9/_-]{1,60}$/), image: z.string().min(1).max(300), prompt: z.string().min(30).max(1500), focusX: z.number().min(0).max(1).default(0.5), focusY: z.number().min(0).max(1).default(0.5), seconds: z.enum(['5', '10']).default('5'), model: z.enum(Object.keys(VIDEO_MODELS)).default(DEFAULT_VIDEO_MODEL), negativePrompt: z.string().max(500).optional(), resume: z.string().max(80).optional(), why: z.string().min(3).max(200)},
    async ({reel, name, image, prompt, focusX, focusY, seconds, model, negativePrompt, resume, why}) => {
      reel = clean(reel);
      if (/[—–]/.test(prompt)) return text({made: false, reason: 'Remove the em or en dash from the prompt.'});
      const key = connections.apiKey('fal');
      if (!key) return text({made: false, reason: 'Toby has no fal connection with a key. Ask Tavin to check Connected apps.'});
      const cost = Math.round(VIDEO_MODELS[model].perSecond * Number(seconds) * 100) / 100;
      if (!resume) {
        const b = await budgetCheck(ledger, reel, cost);
        if (!b.ok) {
          const yes = await approve(`Spend more on fal for this reel? ${reel} has used $${b.total.toFixed(2)} of its $${b.limit.toFixed(2)}; this clip costs $${cost.toFixed(2)}.`, {reel, spent: b.total, limit: b.limit, clip: name, cost, why, prompt: prompt.slice(0, 300)});
          if (!yes) return text({made: false, reason: `Over this reel's fal limit ($${b.total.toFixed(2)} spent of $${b.limit.toFixed(2)}). Tavin said no or did not answer: do not try again. Use the clips you have, or ask Toby to ask Tavin.`});
          await ledger.raise(reel, b.after);
        }
      }
      let bytes;
      try { bytes = await readFile(await abs(image)); } catch { return text({made: false, reason: 'The picture ' + image + ' was not found in the team folder.'}); }
      const crop = await cropToRatio(bytes, 9 / 16, focusX, focusY, 1080);
      const input = {prompt, image_url: 'data:image/jpeg;base64,' + crop.toString('base64'), duration: seconds, negative_prompt: negativePrompt || NEGATIVE, cfg_scale: 0.5};
      const {id, result} = await runFalQueue({endpoint: model, input, key, resume, fetchImpl, signal, wait});
      const url = result?.video?.url;
      if (!url) return text({made: false, reason: 'fal finished without a video. Request id ' + id + '.'});
      const res = await fetchImpl(url, {signal});
      if (!res.ok) return text({made: false, reason: `The clip could not be downloaded (${res.status}). Call again with resume "${id}" (no new charge).`});
      const video = Buffer.from(await res.arrayBuffer());
      const clipRel = `${reel}/${name}.mp4`;
      await teamFolder.writeBytes(null, clipRel, video);
      const total = await ledger.add(reel, {when: new Date().toISOString(), what: name, model, cost, request: id});
      const log = await logCredits(teamFolder, {what: `${reel} ${name} (${why})`, model: `${model} ${seconds} s`, cost});
      // Frames to check: a sheet at 10 a second and full-size frames every half second.
      const work = await scratch(`${reel}/_work-${name.replace(/\//g, '-')}`);
      try {
        const src = await abs(clipRel);
        await ffmpeg(['-y', '-i', src, '-vf', 'fps=10,scale=216:-2,tile=10x' + Math.ceil(Number(seconds) * 10 / 10) + ':padding=4:color=white', '-frames:v', '1', '-q:v', '3', join(work, 'sheet.jpg')], {signal});
        await ffmpeg(['-y', '-i', src, '-vf', 'fps=2', '-q:v', '2', join(work, 'f%02d.jpg')], {signal});
        await saveFrom(join(work, 'sheet.jpg'), `${reel}/${name}-sheet.jpg`);
        const frames = [];
        for (const f of (await readdir(work)).filter(f => /^f\d+\.jpg$/.test(f)).sort()) { const n = Number(f.slice(1, 3)); const rel = `${reel}/${name}-frames/${((n - 1) / 2).toFixed(1)}s.jpg`; await saveFrom(join(work, f), rel); frames.push(rel); }
        return text({made: true, clip: clipRel, seconds: Number(seconds), cost, reelSpent: total, reelLimit: (await ledger.reel(reel)).limit, monthTotal: log.total, sheet: `${reel}/${name}-sheet.jpg`, frames, request: id,
          note: 'Look at the sheet and the full-size frames with zoom_team_image (every finger, the last second for morphing). In the storyboard, use the best 1.5 to 2.4 s (clipFrom, clipTo) sped to fit the shot (1.2x to 1.5x).'});
      } finally { await rm(work, {recursive: true, force: true}).catch(() => {}); }
    });

  register('make_sound', 'Make sound for a reel on ElevenLabs with Tavin\'s key: kind "effect" (a sound for one action or cut, 0.5 to 30 s) or "music" (an instrumental bed, 10 to 60 s). It uses ElevenLabs credits from Tavin\'s plan (about 17 credits a second of effect; music costs more). Makes several takes (effects: 4 by default) and measures each one, because nobody on the team can hear: when the sound starts, how long it is audible, hard hits (clicks, knocks) and the crest. For effects it ranks the takes for an action lasting `action` seconds and names the pick. Effect prompts for actions longer than 1 s must describe a soft, continuous sound and must not ask for clicks, taps, knocks, clangs or impacts (Jane\'s first takes with those sounded "mechanical"); end them with "no clicks, no taps, no impacts". These worked: "Slow close-up of soft warm bread being pulled apart by hand, gentle crust crackle, soft squishy stretch of melted cheese, no clicks, no taps, ASMR" and "Cast iron lid gently lifted off a pot, soft scrape, then a warm hiss of steam rising, no clanging, no impact". Saves <folder>/<name>-1.mp3 and on, and <folder>/<name>-takes.md.',
    {folder: z.string().min(1).max(300), name: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,40}$/), kind: z.enum(['effect', 'music']), prompt: z.string().min(10).max(1500), seconds: z.number().min(0.5).max(60), action: z.number().min(0.1).max(30).optional(), takes: z.number().int().min(1).max(4).optional(), model: z.string().max(40).optional(), why: z.string().min(3).max(200)},
    async ({folder, name, kind, prompt, seconds, action, takes, model, why}) => {
      folder = clean(folder);
      const key = connections.apiKey('elevenlabs');
      if (!key) return text({made: false, reason: 'Toby has no ElevenLabs key yet. Tavin adds it in Connected apps as a custom connection named "elevenlabs" with the address https://api.elevenlabs.io.'});
      if (kind === 'effect' && seconds > 30) return text({made: false, reason: 'Effects are 0.5 to 30 s.'});
      if (kind === 'music' && seconds < 10) return text({made: false, reason: 'Music beds are 10 to 60 s.'});
      if (model && !(kind === 'effect' ? SFX_MODELS : MUSIC_MODELS).includes(model)) return text({made: false, reason: 'Use one of: ' + (kind === 'effect' ? SFX_MODELS : MUSIC_MODELS).join(', ')});
      const problems = soundPromptProblems(prompt, kind, seconds);
      if (problems.length) return text({made: false, toFix: problems});
      const count = takes || (kind === 'effect' ? 4 : 2), made = [];
      let credits = 0;
      for (let k = 1; k <= count; k++) {
        const body = kind === 'effect' ? effectBody({prompt, seconds, model}) : musicBody({prompt, seconds, model});
        const {bytes, credits: c} = await elevenLabs({path: kind === 'effect' ? '/v1/sound-generation' : '/v1/music', body, key, fetchImpl, signal});
        credits += c || 0;
        const rel = `${folder}/${name}-${k}.mp3`;
        await teamFolder.writeBytes(null, rel, bytes);
        made.push({file: rel, measure: measureSound(await decodeAudio(await abs(rel), {signal}))});
      }
      const ranked = kind === 'effect' ? rankTakes(made, action || seconds) : made.map(t => ({...t, ok: t.measure.leadSilence <= 0.5 && t.measure.coverage >= 0.8, problems: [], score: t.measure.coverage}));
      const pick = ranked.find(t => t.ok) || null;
      const lines = [`# Sound takes: ${name} (${kind})`, '', `- Made: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, `- Prompt: ${prompt}`, `- Length asked: ${seconds} s${action ? `, action ${action} s` : ''}`, `- Why: ${why}`, `- Pick: ${pick ? pick.file : 'NONE passed: write a new prompt (softer, continuous) and make new takes'}`, '',
        '| Take | OK | Starts | Audible | Hard hits | Crest | Peak | Problems |', '|---|---|---|---|---|---|---|---|',
        ...ranked.map(t => `| ${t.file.split('/').pop()} | ${t.ok ? 'yes' : 'no'} | ${t.measure.leadSilence} s | ${t.measure.soundSeconds} s | ${t.measure.spikes.length} | ${t.measure.crest} dB | ${t.measure.peakDb} dB | ${t.problems.join('; ') || '-'} |`),
        '', 'Picked by measurement only (nobody on the team can hear). Tavin judges the finished reel and can name a moment to redo. In make_reel, sounds are only turned up or down, never squashed or chopped.'];
      await teamFolder.writeBytes(null, `${folder}/${name}-takes.md`, Buffer.from(lines.join('\n') + '\n'));
      await logCredits(teamFolder, {what: `${name} (${kind}, ${count} take${count > 1 ? 's' : ''}): ${why}`, model: `ElevenLabs ${kind === 'effect' ? 'sound effects' : 'music'}`, credits: credits || 'about ' + Math.round(count * seconds * (kind === 'effect' ? 17 : 15))}).catch(() => {});
      return text({made: true, pick: pick?.file || null, takes: ranked.map(t => ({file: t.file, ok: t.ok, problems: t.problems, ...t.measure})), note: `${folder}/${name}-takes.md`});
    });

  if (renderPage && renderFrames) {
    const words = z.object({text: z.string().min(1).max(60), at: z.number().min(0).max(10), until: z.number().min(0).max(10).optional(), size: z.enum(WORD_SIZES).default('mid'), y: z.number().int().min(0).max(1920)});
    const shot = z.object({type: z.enum(SHOT_TYPES), seconds: z.number().min(0.3).max(5), image: z.string().max(300).optional(), move: z.object({zoom: z.array(z.number().min(0.8).max(2)).length(2).optional(), x: z.array(z.number().min(0).max(1)).length(2).optional(), y: z.array(z.number().min(0).max(1)).length(2).optional()}).optional(),
      clip: z.string().max(300).optional(), clipFrom: z.number().min(0).max(10).optional(), clipTo: z.number().min(0).max(10).optional(), focusX: z.number().min(0).max(1).optional(),
      book: z.string().max(300).optional(), pages: z.array(z.string().max(20)).max(6).optional(), app: z.string().max(300).optional(), setup: z.array(z.string().max(60)).max(4).optional(), tap: z.string().max(60).optional(), tapAt: z.number().min(0.2).max(4).optional(), cover: z.string().max(300).optional(), words: z.array(words).max(4).optional()});
    const sound = z.object({file: z.string().min(1).max(300), at: z.number().min(0).max(20), hit: z.number().min(0).max(3).optional(), from: z.number().min(0).max(60).optional(), to: z.number().min(0).max(60).optional(), fade: z.number().min(0).max(0.5).optional(), peakDb: z.number().min(-30).max(-1).optional(), drive: z.number().min(1).max(3).optional(), boost: z.array(z.array(z.number()).length(2)).max(8).optional()});
    register('make_reel', 'Make the finished Instagram reel (1080 x 1920, 30 fps, 7 to 15 s) from a storyboard. No AI and no cost: every word is real type, the book pages are captured from the edition\'s book.html and the app from its index.html. Shot types: "clip" (an AI clip from make_video_clip: clipFrom and clipTo pick the best part, sped up to fit seconds; image is its start picture, used in an animatic), "photo" (a checked photo with move {zoom:[from,to], x:[from,to], y:[from,to]}), "book" (book = the edition\'s book.html, pages = ["cover","ch-5",...] chapter openers, 3 to 5 pages; image = a photo for the blurred background), "app" (app = the app\'s index.html, setup = buttons to press first such as "Skip for now", tap = the exact words on the button to tap, tapAt seconds; image for the background), "end" (cover = book.html; words must include "Comment WORD"). words: 1 to 4 words at a time (small size may be a short line), at/until seconds within the shot, y between 220 and 1440; **word** colours it. sounds: file, at (seconds in the reel), from/to (the part of the file), peakDb (how loud, e.g. -5 for the hook\'s sound, -9 for whooshes), hit (seconds into the sound where its peak is, so it lands on the cut), fade, drive (only for very short grains such as a page flip or a tap, up to 2.5), boost (gain points inside the sound). music: file and gains [[t, g], ...] (about 0.35 under the hook\'s sound, 0.6 after, 0 at the end). mode "animatic" uses each clip\'s still picture and costs nothing: make one first to check the timing. Saves <folder>/<name>.mp4 (music and sounds), <name>-no-music.mp4 (sounds only, for a trending song), <name>-sheet.jpg (5 frames a second), <name>.json and <name>-check.md, and returns passed and toFix. Only "Result: PASSED" goes to Visual Check.',
      {folder: z.string().min(1).max(300), name: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,40}$/), palette: z.enum(PALETTE_NAMES), mode: z.enum(['animatic', 'final']).default('final'), shots: z.array(shot).min(4).max(12), sounds: z.array(sound).max(30).optional(), music: z.object({file: z.string().min(1).max(300), from: z.number().min(0).max(60).optional(), gains: z.array(z.array(z.number()).length(2)).max(10).optional()}).optional()},
      async board => {
        board = {...board, folder: clean(board.folder)};
        const spend = ledger ? await ledger.reel(board.folder) : null;
        return text(await makeReel({board, teamFolder, renderPage, renderFrames, signal, spend}));
      });
  }
}
