// Toby build 44: the daily auto-pick (Tavin, 20 Nov 2026: "from Monday I reach out to at least 2 creators every
// weekday", so the team makes at least 2 new creator packages every workday without waiting for him).
// Once a workday, after Creator Partnerships has finished its search (or by 11:00 at the latest), the app picks the
// best 2 creators found in the last few days and starts their runs by itself:
// - creators who fit a ready base book come first (a package run, about an hour);
// - if fewer than 2 fit, the best creator with no ready book gets ONE new base book a day at most (the $3.50 picture
//   cap and the $5 daily limit), started by Toby, who chooses the folder name, topic and type from niches.md;
// - never a creator Tavin has been asked about in the decisions file (he decides those himself), a creator who said
//   no, or one who already has a run.
// Settings: pipeline/auto-pick.json in the team folder (written the first time; "enabled": false switches it off).
// Every day's picks and the reasons are in pipeline/auto-pick-<date>.md.

export const AUTO_PICK = {version: 1, enabled: true, after: '07:30', waitUntil: '11:00', latest: '16:00', perDay: 2, newBooksPerDay: 1, minScore: 60, lookbackDays: 7};

const key = h => String(h || '').replace(/^@/, '').trim().toLowerCase();
export const minutes = hm => { const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
export const scoreOf = s => { const m = String(s || '').match(/^\s*(\d{1,3})\b/); return m ? Number(m[1]) : NaN; };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);

// Handles named in a D-question or a D-answer (Tavin decides those himself).
export function askedHandles(decisions) {
  const out = new Set();
  for (const line of String(decisions || '').split('\n')) {
    if (!/^\d{4}-\d{2}-\d{2} D\d+ \|/.test(line)) continue;
    for (const m of line.matchAll(/@([A-Za-z0-9._]+)/g)) out.add(key(m[1].replace(/[.]+$/, '')));
  }
  return out;
}

// rows: the creator log (creators/creators-log.csv). readyBases: finished base books. busy: handles that have a run.
export function chooseCreators({rows, today, readyBases, asked = new Set(), busy = new Set(), settings = AUTO_PICK, newBookAllowed = true}) {
  const s = {...AUTO_PICK, ...settings}, skipped = [], candidates = [];
  for (const r of rows) {
    const h = key(r.handle); if (!h) continue;
    if (String(r.stage_no) !== '1' || r.stage === 'No') continue; // only "Found", nothing further along
    const age = r.found_date && /^\d{4}-\d{2}-\d{2}$/.test(r.found_date) ? daysBetween(r.found_date, today) : NaN;
    if (!(age >= 0 && age < s.lookbackDays)) continue;
    const score = scoreOf(r.score);
    if (!(score >= s.minScore)) { if (age === 0) skipped.push({handle: h, why: `score ${Number.isNaN(score) ? 'missing' : score} (below ${s.minScore})`}); continue; }
    if (asked.has(h)) { skipped.push({handle: h, why: 'Tavin was asked about this creator in the decisions file, so it is his call'}); continue; }
    if (busy.has(h)) { skipped.push({handle: h, why: 'already has a run'}); continue; }
    const fits = String(r.base_book || '').toLowerCase(), base = readyBases.find(b => fits.includes(b.toLowerCase())) || '';
    // Build 46: "possible: van-build" or "partly: small-space-diy" is a weaker fit than a plain "van-build".
    const clean = !!base && !/^\s*(possible|partly|maybe|perhaps|could)\b/i.test(fits);
    candidates.push({row: r, handle: h, score, age, base, clean, contact: /^email/i.test(r.contact_route || '') ? 'email' : 'dm'});
  }
  // Clean fits first (22 Nov: a 78 with a "possible" fit beat a 70 with a clean fit), then the newest, then the score.
  const order = (a, b) => (b.clean - a.clean) || a.age - b.age || b.score - a.score;
  const fit = candidates.filter(c => c.base).sort(order), other = candidates.filter(c => !c.base).sort(order);
  const packages = fit.slice(0, s.perDay);
  const book = packages.length < s.perDay && newBookAllowed && s.newBooksPerDay > 0 ? other[0] || null : null;
  for (const c of fit.slice(s.perDay)) skipped.push({handle: c.handle, why: `${c.clean ? 'fits' : 'partly fits'} ${c.base}, but today's ${s.perDay} are already picked`});
  for (const c of other.slice(book ? 1 : 0)) skipped.push({handle: c.handle, why: book ? `no ready base book, and today's one new base book went to @${book.handle}`
    : packages.length >= s.perDay ? `no ready base book; today's ${s.perDay} are already picked` : 'no ready base book, and no new base book today (one is going or was started today)'});
  return {packages, book, skipped, candidates: candidates.length};
}

export function bookRequest({c, date, time}) {
  const r = c.row;
  return `Auto-pick (from the Toby app, ${date} ${time}): today's best creator with no ready base book is @${c.handle} (${r.niche || 'niche not given'}; ${r.country || 'country not given'}; ${r.followers || '?'} followers; score ${r.score}; contact ${r.contact_route || 'DM'}). Her details are in ${r.found_file || 'creators/' + date + '.md'}. Under Tavin's standing auto-pick rule, this message is his go for ONE new base book today: start a book run with start_book_run for her niche, with handle "${c.handle}" and contact "${c.contact}". Take the type from templates/book-types/niches.md (the row that matches her niche). Choose a short folder name (small letters and dashes) and write the topic as what the book helps a beginner do, from her niche and themes; no creator's name in the folder name or the topic. Do NOT start it if her niche is not on niches.md, if a book run is already going, or if the book would need a licensed trade or give medical, legal or money advice: then write one waiting D-question for Tavin instead and say why. Reply in one line saying what you did. Don't ask questions.`;
}

export function pickReport({date, time, picks, skipped, candidates, started, book, note, days = AUTO_PICK.lookbackDays}) {
  const rows = [...started.map(s => `| @${s.handle} | package run on ${s.base} (${s.contact}) | ${s.error ? 'NOT started: ' + s.error.replace(/\|/g, '/') : 'started, I' + s.decision} |`),
    ...(book ? [`| @${book.handle} | new base book first (Toby starts the book run) | ${book.state} |`] : [])];
  return `# Auto-pick, ${date}\n\n- Picked at: ${time}\n- Creators who could be picked: ${candidates} (found in the last ${days} days, score 60 or more, stage Found, not in a D-question); not picked: ${skipped.length} (list below)\n- Picked: ${picks}${note ? `\n- Note: ${note}` : ''}\n\n| Creator | What starts | Result |\n|---|---|---|\n${rows.join('\n') || '| none | | |'}\n\n## Not picked\n${skipped.map(s => `- @${s.handle}: ${s.why}`).join('\n') || '- nobody'}\n\n## For Toby\n${started.some(s => s.error) || (book && /not|could/i.test(book.state)) ? 'A pick did not start: tell Tavin in the brief (see the table).' : picks ? `Tell Tavin in the brief which creators the auto-pick started today; their review pages come when each package is ready.` : 'No creator could be picked today: tell Tavin in the brief (see "Not picked").'}\n`;
}
