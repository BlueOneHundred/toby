// Toby build 36: package runs. One request ("make a package for @handle") runs the whole creator package:
// the app messages each bot in turn, waits for its reply, checks its files (the bot's own check files plus the
// automatic package check), and only then starts the next bot. A failed step gets one fix run with the reasons;
// a second failure stops the run and says why on the board. The last step writes a review page for Tavin.
// Before build 36 Tavin pressed Run for every bot and Claude checked every file in between (18 Nov 2026).
import {readFile,writeFile,rename,mkdir,stat,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {runPackageCheck,validHandle,validBase,CAROUSEL_LINE} from './package-check.mjs';
import {CreatorLog} from './creator-log.mjs';

export const PIPELINE_BOTS = ['Creator Partnerships', 'Creative Studio', 'Edition Writer', 'App Builder', 'Art Director', 'Marketing Kit', 'Visual Check', 'Outreach Writer'];
// The steps. Saved to pipeline/steps.json in the team folder the first time, so they can change without a build.
export const DEFAULT_STEPS = {
  version: 1,
  steps: [
    {id: 'voice', bot: 'Creator Partnerships', task: "make her voice file (20 or more of her own captions, copied exactly, with links and dates; her bio line; display name, country, contact) and save any clean photos",
      gates: [{file: 'creators/voice/{handle}.md'}, {check: ['voice']}]},
    {id: 'look', bot: 'Creative Studio', task: 'write her look file (same palette as the base book; her photo as the sample cover only if it passes at book size)',
      gates: [{file: 'creators/look/{handle}.md', contains: ['Palette:', 'Cover photo:']}]},
    {id: 'edition', bot: 'Edition Writer', task: 'write her edition and make her book (edition check and book check must PASS)',
      gates: [{file: '{edition}/edition-check.md', contains: ['Result: PASSED']}, {file: '{edition}/book-check.md', contains: ['Result: PASSED']}, {check: ['edition']}]},
    {id: 'app', bot: 'App Builder', task: 'build and publish her app',
      gates: [{file: '{edition}/app/app-check.md', contains: ['Result: PASSED']}, {file: '{edition}/app/app-link.md', contains: ['Live when checked: yes']}, {phone: '{edition}/app/index.html'}]},
    {id: 'plan', bot: 'Art Director', task: 'plan her 2 carousels on her own themes',
      gates: [{file: '{edition}/carousel/plan.md'}]},
    {id: 'carousels', bot: 'Marketing Kit', task: 'make her 2 carousels and captions.md', retry: ['Art Director', 'Marketing Kit'],
      gates: [{carousels: 2}, {file: '{edition}/carousel/captions.md'}, {check: ['carousels']}]},
    {id: 'visual', bot: 'Visual Check', task: "check both of her carousels, every slide's words against its photo", retry: ['Marketing Kit', 'Visual Check'],
      gates: [{file: '{edition}/carousel/check.md', contains: ['Both carousels PASSED']}, {check: ['carousels']}]},
    {id: 'email', bot: 'Outreach Writer', task: 'write her pitch draft', contact: 'email',
      gates: [{file: 'outreach/breakdown-{handle}.html'}, {check: ['email', 'breakdown']}]},
    {id: 'dm', bot: 'Outreach Writer', task: 'write her Instagram DM draft', contact: 'dm',
      gates: [{sheet: '@{handle}'}]},
    {id: 'review', review: true}
  ]
};

const pad = n => String(n).padStart(2, '0');
export const localDate = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const localTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// The decided line that tells every bot what the run is. Appended once when the run starts.
export function decisionLine({n, handle, base, contact, notes, when}) {
  const how = contact === 'dm'
    ? "an Instagram DM draft (under 140 words) with Tavin's carousel line word for word; the breakdown on request"
    : `an EMAIL draft only, with the breakdown PDF and both carousels attached and Tavin's carousel line word for word ("${CAROUSEL_LINE}")`;
  return `${localDate(when)} I${n} | for: ${PIPELINE_BOTS.join(', ')} | instruction: PACKAGE RUN for @${handle} on base book ${base} (Tavin, through Toby, ${localTime(when)}). Toby's app runs the steps in order and messages each of you when it is your turn ("Package run for @${handle} ..."); do only that creator's step when that message comes, and nothing for @${handle} without it. Package runs may overlap with other creators: I41 does not apply to them. Steps: (1) Creator Partnerships: creators/voice/${handle}.md with 20 or more of her OWN captions copied exactly (full text, post link, date), her bio line word for word, display name, country and contact, her themes and real follower questions; clean photos only in creators/photos/${handle}/ (no face, no children, no text, no address, no logos). (2) Creative Studio: creators/look/${handle}.md, the base book's palette (I18); her photo as the sample cover only if it passes at book size. (3) Edition Writer: her edition (spelling for her country; From boxes only from her real captions, quotes copied exactly; sign with her handle), then make_book; edition and book checks PASS. (4) App Builder: her app. (5) Art Director: 2 carousel topics on HER themes, not ones used for an earlier creator on this base book; keep panel cover titles to 2 lines. (6) Marketing Kit: both carousels, and captions.md with "## Captions for <her name>", one "### " heading per caption, "Paid partnership" first, no "comment X for the recipe". (7) Visual Check: both carousels, every slide's words against its photo. (8) Outreach Writer: ${how}; quotes of hers 8 words or fewer, copied exactly from her voice file; name only chapters that hold her From boxes; never "grew from"; never suggest the book holds her recipes; when fixing, write the whole Email 1 again. Keep her family (children, partner) and the brands she tags out of every file. Every step is checked automatically (pipeline/${handle}/package-check.md); a failed step gets one fix run, then the run stops for Tavin. Drafts only (I11), no reel (I36), no send day (D7), no postal address (D3).${notes ? ' Tavin\'s notes: ' + notes.replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 1000) : ''} | status: decided | ${localTime(when)}\n`;
}
export function nextInstruction(decisions) {
  let max = 0; for (const m of String(decisions).matchAll(/^\d{4}-\d{2}-\d{2} I(\d+) \|/gm)) max = Math.max(max, Number(m[1]));
  return max + 1;
}
export function stepMessage({run, step, steps}) {
  const list = steps.filter(s => !s.review);
  return `Package run for @${run.handle}, step ${list.indexOf(step) + 1} of ${list.length}: ${step.task}. Do this for @${run.handle} only (base book ${run.base}), using your rules and the decisions file (I${run.decision}). Don't ask questions. When you finish, the app checks your files automatically.`;
}
export function fixMessage({run, step, bot, reasons}) {
  const intro = bot === step.bot ? `your ${step.id} step did not pass the automatic check` : `${step.bot}'s ${step.id} step did not pass the automatic check, and it needs your part fixed first`;
  return `Package run for @${run.handle}: ${intro}. Fix exactly these, change nothing else, and run your checks again. Don't ask questions.\n${reasons.slice(0, 12).map(r => '- ' + r).join('\n')}\nThe full check is in pipeline/${run.handle}/package-check.md.`;
}

export class Pipelines {
  constructor({directory, teamRoot, teamFolder, service, busy, checkApp, now = Date.now, onChange = () => {}}) {
    Object.assign(this, {directory, teamRoot, teamFolder, service, busy, checkApp, now, onChange});
    this.runs = []; this.ticking = false; this.closed = false; this.persist = Promise.resolve();
    // Build 38: the creator progress log (creators/creators-log.csv and .html). Never allowed to break a run.
    this.log = new CreatorLog({teamRoot, teamFolder, now});
  }
  logged(promise) { return Promise.resolve(promise).catch(() => {}); }
  file() { return join(this.directory, 'pipelines.json'); }
  async init() {
    try { const data = JSON.parse(await readFile(this.file(), 'utf8')); if (Array.isArray(data.runs)) this.runs = data.runs; } catch (e) { if (e.code !== 'ENOENT') throw new Error('Could not read saved package runs.'); }
    return this;
  }
  async save() {
    const body = JSON.stringify({version: 1, runs: this.runs.slice(-50)}, null, 1);
    const write = async () => { await mkdir(this.directory, {recursive: true}); const tmp = this.file() + '.' + randomUUID(); await writeFile(tmp, body); await rename(tmp, this.file()); };
    this.persist = this.persist.then(write, write); await this.persist; this.onChange();
  }
  async steps() {
    const path = join(this.teamRoot, 'pipeline', 'steps.json');
    try { const data = JSON.parse(await readFile(path, 'utf8')); if (Array.isArray(data.steps) && data.steps.length) return data.steps; } catch (e) { if (e.code !== 'ENOENT') throw new Error('pipeline/steps.json does not read as JSON. Fix it or delete it to get the standard steps back.'); }
    await this.teamFolder.write(null, 'pipeline/steps.json', JSON.stringify(DEFAULT_STEPS, null, 1));
    return DEFAULT_STEPS.steps;
  }
  stepsFor(run, all) { return all.filter(s => !s.contact || s.contact === run.contact); }
  vars(run) { return {handle: run.handle, base: run.base, edition: `ebooks/${run.base}/editions/${run.handle}`}; }
  find(handle) { handle = String(handle || '').replace(/^@/, '').trim().toLowerCase(); return [...this.runs].reverse().find(r => r.handle.toLowerCase() === handle); }
  snapshot() { return structuredClone(this.runs); }

  async start({handle, base, contact = 'email', notes = ''}) {
    handle = String(handle || '').replace(/^@/, '').trim(); base = String(base || '').trim();
    if (!validHandle(handle)) throw new Error('Give the creator\'s Instagram handle, for example "wildflourhillbakes".');
    if (!validBase(base)) throw new Error('Give the base book\'s folder name in ebooks/, for example "sourdough-at-home".');
    if (!['email', 'dm'].includes(contact)) throw new Error('contact must be "email" or "dm".');
    try { await stat(join(this.teamRoot, 'ebooks', base, 'part-a.md')); } catch { throw new Error(`No base book at ebooks/${base}/ (part-a.md not found).`); }
    const open = this.find(handle); if (open && ['running', 'review'].includes(open.status)) throw new Error(`@${handle} already has a package run (${open.status}). Use package_status, or stop_package first.`);
    const steps = await this.steps();
    for (const s of steps) if (s.bot && !this.botConversation(s.bot)) throw new Error(`No chat found for the bot "${s.bot}". Open that bot once in Toby, then try again.`);
    const when = this.now(), month = localDate(when).slice(0, 7), decisions = `board/decisions-${month}.md`;
    let text = ''; try { text = await readFile(join(this.teamRoot, decisions), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const n = nextInstruction(text);
    await this.teamFolder.append(decisions, (text && !text.endsWith('\n') ? '\n' : '') + decisionLine({n, handle, base, contact, notes, when}));
    const run = {id: randomUUID(), handle, base, contact, notes, decision: n, status: 'running', startedAt: when, step: 0, attempt: 0, queue: [], history: []};
    this.runs.push(run); await this.save(); await this.writeStatus(run, `Started by Tavin through Toby (decided line I${n}).`);
    await this.logged(this.log.started(run));
    return structuredClone(run);
  }
  async stop(handle, reason = 'Stopped by Tavin.') {
    const run = this.find(handle); if (!run || !['running', 'review'].includes(run.status)) throw new Error(`No open package run for @${String(handle).replace(/^@/, '')}.`);
    run.status = 'stopped'; run.reason = reason; run.finishedAt = this.now(); run.queue = []; delete run.current;
    await this.save(); await this.writeStatus(run, reason); await this.logged(this.log.stopped(run, reason)); return structuredClone(run);
  }
  async approve(handle, note = '') {
    const run = this.find(handle); if (!run || run.status !== 'review') throw new Error(`@${String(handle).replace(/^@/, '')} has no package waiting for review.`);
    const when = this.now(), decisions = `board/decisions-${localDate(when).slice(0, 7)}.md`;
    let text = ''; try { text = await readFile(join(this.teamRoot, decisions), 'utf8'); } catch {}
    const n = nextInstruction(text);
    await this.teamFolder.append(decisions, `${localDate(when)} I${n} | for: Outreach Writer, Toby | instruction: Tavin APPROVED @${run.handle}'s package at ${localTime(when)} (package run I${run.decision}): both carousels and the ${run.contact === 'dm' ? 'DM' : 'email'} draft as they are. Drafts only (I11): Tavin sends.${note ? ' Note: ' + note.replace(/\|/g, '/').slice(0, 500) : ''} | status: decided | ${localTime(when)}\n`);
    run.status = 'approved'; run.finishedAt = when; await this.save(); await this.writeStatus(run, `Approved by Tavin (I${n}).`); await this.runLine(`@${run.handle} package approved by Tavin`);
    await this.logged(this.log.approved(run));
    return structuredClone(run);
  }

  botConversation(name) {
    const bot = this.service.state.bots.find(b => b.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!bot) return null;
    return this.service.state.conversations.filter(c => c.botId === bot.id && !c.parentThreadId && c.kind !== 'group').sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  }
  async deliver(run, bot, message) {
    const c = this.botConversation(bot); if (!c) throw new Error(`No chat found for the bot "${bot}".`);
    if (this.busy(c)) return false;
    const runId = randomUUID(), at = this.now();
    run.current = {bot, conversationId: c.id, runId, at, message: message.slice(0, 200)}; await this.save();
    await this.service._deliver(c, message, [], {scheduled: {id: 'package-' + run.handle, runId, title: `Package @${run.handle}: ${bot}`, scheduledFor: at}});
    return true;
  }
  // The bot's reply to the step message: 'waiting', 'done' or 'failed'.
  replyState(run) {
    const c = this.service.state.conversations.find(c => c.id === run.current.conversationId);
    if (!c) return 'failed';
    const index = c.messages.findIndex(m => m.sourceScheduleRunId === run.current.runId);
    if (index < 0) return this.now() - run.current.at > 120000 ? 'lost' : 'waiting';
    if (this.busy(c)) return 'waiting';
    const end = c.messages.findIndex((m, i) => i > index && m.role === 'user');
    const replies = c.messages.slice(index + 1, end < 0 ? undefined : end).filter(m => m.role === 'assistant');
    if (!replies.length) return 'waiting';
    if (replies.some(m => ['error', 'cancelled'].includes(m.status))) return 'failed';
    // A bot waiting for an approval or an answer is not finished: Tavin sees it in that chat.
    return replies.every(m => m.status === 'complete') ? 'done' : 'waiting';
  }

  async gates(run, step, since) {
    const v = this.vars(run), reasons = [], root = this.teamRoot, fresh = since - 300000;
    const mtime = async p => { try { return (await stat(join(root, p))).mtimeMs; } catch { return 0; } };
    const read = async p => { try { return await readFile(join(root, p), 'utf8'); } catch { return ''; } };
    for (const g of step.gates || []) {
      if (g.file) {
        const p = fill(g.file, v), t = await mtime(p);
        if (!t) { reasons.push(`${p} was not written.`); continue; }
        if (t < fresh && g.fresh !== false) { reasons.push(`${p} was not updated in this run.`); continue; }
        const text = await read(p);
        for (const c of g.contains || []) if (!text.includes(c)) { const fix = text.match(/## To fix\n([\s\S]*?)(\n## |$)/)?.[1].trim(); reasons.push(`${p} does not say "${c}".${fix ? ' Its own list: ' + fix.replace(/\s+/g, ' ').slice(0, 400) : ''}`); }
      }
      if (g.carousels) {
        const dir = join(fill('{edition}', v), 'carousel'); let names = [];
        try { names = (await readdir(join(root, dir), {withFileTypes: true})).filter(e => e.isDirectory() && !e.name.startsWith('_')).map(e => e.name); } catch {}
        let passed = 0;
        for (const n of names) { const t = await read(join(dir, n, 'carousel-check.md')); if (/Result:\s*PASSED/.test(t)) passed++; else if (t) reasons.push(`${dir}/${n}/carousel-check.md does not say "Result: PASSED". ${(t.match(/## To fix\n([\s\S]*?)(\n## |$)/)?.[1] || '').replace(/\s+/g, ' ').slice(0, 300)}`); }
        if (passed < g.carousels) reasons.push(`${passed} of ${g.carousels} carousels passed make_carousel.`);
      }
      if (g.sheet) {
        const want = fill(g.sheet, v).toLowerCase(), name = `outreach/send-sheet-${localDate(this.now())}.md`;
        if ((await mtime(name)) < fresh || !(await read(name)).toLowerCase().includes(want)) reasons.push(`Today's send sheet (${name}) has no new draft for ${want}.`);
      }
      if (g.check) {
        const result = await runPackageCheck(root, {handle: run.handle, base: run.base, scopes: g.check});
        await this.teamFolder.write(null, `pipeline/${run.handle}/package-check.md`, result.markdown);
        for (const i of result.items) if (i.level === 'fail') reasons.push(`${i.owner}: ${i.message}`);
      }
      if (g.phone) {
        if (!this.checkApp) continue;
        const p = fill(g.phone, v), result = await this.checkApp(p).catch(e => ({passed: false, problems: ['The phone check could not run: ' + e.message]}));
        await this.teamFolder.write(null, `pipeline/${run.handle}/phone-check.md`, `# Phone check: @${run.handle}\n\n- Checked: ${localDate(this.now())} ${localTime(this.now())}\n- File: ${p}\n- Result: ${result.passed ? 'PASSED' : 'NEEDS FIXES'}\n${(result.notes || []).map(n => '- ' + n).join('\n')}\n\n## To fix\n${(result.problems || []).map(n => '- ' + n).join('\n') || 'Nothing.'}\n`);
        for (const pr of result.problems || []) reasons.push(`App at phone size: ${pr}`);
      }
    }
    return reasons;
  }

  async tick() {
    if (this.ticking || this.closed) return; this.ticking = true;
    try { await this.logged(this.log.tick());
      for (const run of this.runs.filter(r => r.status === 'running')) await this.advance(run).catch(async e => { await this.fail(run, 'The package run hit an error: ' + e.message); }); }
    finally { this.ticking = false; }
  }
  async advance(run) {
    const all = this.stepsFor(run, await this.steps()), step = all[run.step];
    if (!step) return this.fail(run, 'The steps list ended without a review step.');
    if (step.review) return this.toReview(run, all);
    if (!run.current) {
      if (!run.queue.length) { run.queue = [step.bot]; run.messages = [stepMessage({run, step, steps: all})]; run.stepStartedAt = this.now(); }
      const bot = run.queue[0], message = run.messages[0];
      if (await this.deliver(run, bot, message)) await this.writeStatus(run, `${bot} is working on step "${step.id}"${run.attempt ? ' (fix run)' : ''}.`);
      return;
    }
    const state = this.replyState(run);
    if (state === 'waiting') return;
    if (state === 'lost') { delete run.current; await this.save(); return; }
    const finished = run.current.bot; run.history.push({step: step.id, bot: finished, at: run.current.at, finishedAt: this.now(), state}); delete run.current;
    run.queue.shift(); run.messages.shift();
    if (state === 'failed' && !run.queue.length) return this.retryOrStop(run, step, all, [`${finished}'s run ended with an error or was stopped before it finished.`]);
    if (run.queue.length) { await this.save(); return; }
    const reasons = await this.gates(run, step, run.stepStartedAt);
    if (!reasons.length) {
      run.history.push({step: step.id, passed: true, at: this.now()});
      run.step++; run.attempt = 0; run.queue = []; run.messages = []; await this.save();
      await this.runLine(`@${run.handle} step "${step.id}" (${step.bot}) passed the automatic check`);
      await this.writeStatus(run, `Step "${step.id}" passed.`);
      const next = all[run.step], link = step.id === 'app' ? await readFile(join(this.teamRoot, fill('{edition}/app/app-link.md', this.vars(run))), 'utf8').then(t => t.match(/https:\/\/\S+/)?.[0] || '', () => '') : '';
      await this.logged(this.log.stepPassed(run, step.id, next && !next.review ? `${next.bot}: ${next.task}` : '', link));
      return;
    }
    return this.retryOrStop(run, step, all, reasons);
  }
  async retryOrStop(run, step, all, reasons) {
    run.history.push({step: step.id, passed: false, at: this.now(), reasons: reasons.slice(0, 12)});
    if (run.attempt >= 1) return this.fail(run, `Step "${step.id}" (${step.bot}) still did not pass after one fix run:\n${reasons.slice(0, 12).map(r => '- ' + r).join('\n')}`);
    run.attempt++;
    const bots = step.retry || [step.bot];
    run.queue = [...bots]; run.messages = bots.map(bot => fixMessage({run, step, bot, reasons})); run.stepStartedAt = this.now();
    await this.save(); await this.writeStatus(run, `Step "${step.id}" did not pass; one fix run started (${bots.join(', then ')}).`);
    await this.runLine(`@${run.handle} step "${step.id}" did not pass; fix run started`, reasons.slice(0, 3).join(' / '));
  }
  async fail(run, reason) {
    run.status = 'stopped'; run.reason = reason; run.finishedAt = this.now(); run.queue = []; delete run.current;
    await this.save(); await this.writeStatus(run, reason); await this.logged(this.log.stopped(run, reason));
    await this.runLine(`@${run.handle} package run stopped; needs a look`, reason.split('\n').slice(0, 3).join(' '));
  }
  async toReview(run, all) {
    await this.writeReview(run);
    run.status = 'review'; run.readyAt = this.now(); await this.save();
    await this.writeStatus(run, `Ready for Tavin: open pipeline/${run.handle}/review.html, then tell Toby "approve @${run.handle}" or what to change.`);
    await this.runLine(`@${run.handle} package READY for Tavin's review (pipeline/${run.handle}/review.html)`);
  }
  async runLine(done, problems = 'none') {
    const t = this.now();
    await this.teamFolder.append(`board/runs-${localDate(t)}.md`, `${localTime(t)} | Package runs | done: ${done} | cost: $0.00 | problems: ${String(problems).replace(/\n/g, ' ').slice(0, 400)}\n`).catch(() => {});
  }
  async writeStatus(run, line) {
    const t = this.now(), all = this.stepsFor(run, await this.steps());
    const steps = all.map((s, i) => `| ${i + 1} | ${s.review ? 'Tavin reviews' : s.bot} | ${s.id} | ${i < run.step ? 'passed' : i === run.step ? (run.status === 'running' ? (run.attempt ? 'fix run' : 'working') : run.status) : 'waiting'} |`).join('\n');
    const body = `# Package run: @${run.handle}\n\n- Base book: ${run.base}\n- Pitch by: ${run.contact === 'dm' ? 'Instagram DM' : 'email'}\n- Decided line: I${run.decision}\n- Status: ${run.status}\n- Updated: ${localDate(t)} ${localTime(t)}\n- Latest: ${line}\n\n| # | Who | Step | State |\n|---|---|---|---|\n${steps}\n${run.reason ? `\n## Why it stopped\n${run.reason}\n` : ''}\n## For Toby\n${run.status === 'review' ? `Ask Tavin to open pipeline/${run.handle}/review.html and approve or ask for changes.` : run.status === 'stopped' ? 'The run stopped: tell Tavin why (above) in the brief, with one plain fix.' : 'nothing'}\n`;
    await this.teamFolder.write(null, `pipeline/${run.handle}/status.md`, body);
    const lines = this.runs.slice(-20).reverse().map(r => `| @${r.handle} | ${r.base} | ${r.status} | ${r.status === 'running' ? (this.stepsFor(r, all)[r.step]?.id || '') : ''} | pipeline/${r.handle}/status.md |`).join('\n');
    await this.teamFolder.write(null, 'pipeline/status.md', `# Package runs\n\nUpdated ${localDate(t)} ${localTime(t)}.\n\n| Creator | Base book | Status | Step now | Details |\n|---|---|---|---|---|\n${lines}\n\n## For Toby\n${this.runs.some(r => r.status === 'review') ? 'Packages are waiting for Tavin\'s review (status "review").' : ''}${this.runs.some(r => r.status === 'stopped' && this.now() - (r.finishedAt || 0) < 86400000) ? ' A package run stopped in the last day: see its status file.' : ''}\n`);
  }
  async writeReview(run) {
    const v = this.vars(run), root = this.teamRoot, ed = v.edition, rel = p => '../../' + p;
    const read = async p => { try { return await readFile(join(root, p), 'utf8'); } catch { return ''; } };
    const link = (await read(`${ed}/app/app-link.md`)).match(/https:\/\/\S+/)?.[0] || '';
    const title = (await read(`${ed}/book-check.md`)).match(/^# Book check:\s*(.+)$/m)?.[1] || run.handle;
    let carousels = []; try { carousels = (await readdir(join(root, ed, 'carousel'), {withFileTypes: true})).filter(e => e.isDirectory() && !e.name.startsWith('_')).map(e => e.name); } catch {}
    const captions = await read(`${ed}/carousel/captions.md`), cap = captions.slice(Math.max(0, captions.search(/^##\s+Captions for/m)), captions.search(/^##\s+Notes/m) > 0 ? captions.search(/^##\s+Notes/m) : undefined);
    const {emailSection} = await import('./package-check.mjs');
    let draft = ''; try { const sheets = (await readdir(join(root, 'outreach'))).filter(n => /^send-sheet-\d{4}-\d{2}-\d{2}\.md$/.test(n)).sort().reverse(); for (const s of sheets) { const t = await read('outreach/' + s); const e = emailSection(t, run.handle); if (e) { draft = e.section; break; } if (run.contact === 'dm' && t.includes('@' + run.handle)) { const i = t.indexOf('@' + run.handle); draft = t.slice(Math.max(0, t.lastIndexOf('\n### ', i)), t.indexOf('\n## ', i) > 0 ? t.indexOf('\n## ', i) : undefined); break; } } } catch {}
    const check = await read(`pipeline/${run.handle}/package-check.md`), looks = check.split('\n').filter(l => l.startsWith('- Look'));
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Review: ${escapeHtml(title)} for @${escapeHtml(run.handle)}</title><style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:18px;line-height:1.5;color:#2b211c;margin:0;background:#f7f1ec}
main{max-width:1500px;margin:0 auto;padding:32px 40px 80px}h1{font-size:34px;margin:0 0 6px}h2{font-size:24px;margin:36px 0 12px;color:#8f3f27}
.card{background:#fff;border-radius:14px;padding:22px 26px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin-bottom:18px}
img{max-width:100%;border-radius:10px;display:block}pre{white-space:pre-wrap;font-family:inherit;font-size:17px;margin:0}
.ok{color:#2f6b3a;font-weight:700}.look{color:#9a5a00}a{color:#8f3f27}
.steps{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}</style></head><body><main>
<h1>${escapeHtml(title)}: package for @${escapeHtml(run.handle)}</h1>
<p>Every step passed its automatic check. Look at the carousels and the ${run.contact === 'dm' ? 'DM' : 'email'}, then tell Toby <b>"approve @${escapeHtml(run.handle)}"</b>, or what to change.</p>
<div class="card"><b>App:</b> ${link ? `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>` : 'no link found'}<br><b>Book:</b> <a href="${rel(ed + '/book.pdf')}">book.pdf</a><br><b>Checks:</b> <a href="package-check.md">package-check.md</a>, <a href="phone-check.md">phone-check.md</a></div>
${looks.length ? `<div class="card look"><b>Worth a look (not blocking):</b><br>${looks.map(l => escapeHtml(l.slice(2))).join('<br>')}</div>` : ''}
<h2>Carousels</h2><div class="steps">${carousels.map(n => `<div class="card"><b>${escapeHtml(n)}</b><a href="${rel(`${ed}/carousel/${n}/sheet.jpg`)}" title="Open full size"><img src="${rel(`${ed}/carousel/${n}/sheet.jpg`)}" alt="${escapeHtml(n)} slides"></a><br><a href="${rel(`${ed}/carousel/${n}`)}">Open the slides folder</a></div>`).join('')}</div>
<h2>Captions</h2><div class="card"><pre>${escapeHtml(cap.trim())}</pre></div>
<h2>${run.contact === 'dm' ? 'DM' : 'Email'} draft</h2><div class="card"><pre>${escapeHtml(draft.trim() || 'No draft found.')}</pre></div>
</main></body></html>`;
    await this.teamFolder.write(null, `pipeline/${run.handle}/review.html`, html);
  }
  startTimer() { this.timer = setInterval(() => void this.tick().catch(() => {}), 5000); this.timer.unref?.(); }
  async close() { this.closed = true; clearInterval(this.timer); await this.persist; }
}
