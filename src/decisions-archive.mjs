// Toby build 44: decisions archiving (Tavin, D10, 20 Nov 2026: no second decisions file; archive instead).
// board/decisions-<month>.md grew past 80 KB, too big for several bots to read. Each night, once the file is over
// about 50 KB, finished lines older than 7 days move to board/archive/decisions-<month>.md:
// - an I line (instruction) that is not a standing rule;
// If the file is then still over 40 KB, older finished lines move too, oldest first, but never one from today or yesterday.
// - a D line (question or answer) whose question has an answer.
// Waiting questions, standing rules (board/archive/standing.md, or a line with "[standing]") and every line from the
// last 7 days stay. A note at the top of the live file says where the rest went and the highest D and I numbers so far,
// so numbering carries on across both files. Package and book runs number from both files too.
export const STANDING_FILE = 'board/archive/standing.md';
export const DEFAULT_STANDING = ['I11', 'I18', 'I36', 'I41', 'I60', 'I70', 'D3', 'D7'];
export const NOTE_START = '> Archive note (Toby app):';
const LINE = /^(\d{4}-\d{2}-\d{2}) ([DI])(\d+) \|/;
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);

export function parseStanding(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/\b([DI]\d+)\b/g)) out.add(m[1]);
  return out;
}
export function highest(text) {
  const max = {D: 0, I: 0};
  for (const line of String(text || '').split('\n')) { const m = line.match(LINE); if (m) max[m[2]] = Math.max(max[m[2]], Number(m[3])); }
  return max;
}
export function archiveNote({month, standing, max}) {
  return `${NOTE_START} older finished lines are in board/archive/decisions-${month}.md (read it only when you need an old line). Standing rules always stay here: ${[...standing].sort((a, b) => a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1))).join(', ')}. Numbering carries on across both files: the highest so far are D${max.D} and I${max.I}, so the next new ones are D${max.D + 1} and I${max.I + 1}.`;
}

export function splitDecisions({text, archiveText = '', today, month, standing = new Set(DEFAULT_STANDING), days = 7, target = 40000, minDays = 1}) {
  const lines = String(text || '').split('\n').filter(l => !l.startsWith(NOTE_START));
  const answered = new Set();
  for (const l of lines) { const m = l.match(LINE); if (m && m[2] === 'D' && /\|\s*answer:|status:\s*decided/i.test(l)) answered.add(m[3]); }
  const movable = (l, age) => { const m = l.match(LINE); if (!m) return false; const finished = m[2] === 'I' || answered.has(m[3]);
    return finished && daysBetween(m[1], today) > age && !standing.has(m[2] + m[3]) && !/\[standing\]/i.test(l); };
  let keep = [], moved = [];
  for (const l of lines) (movable(l, days) ? moved : keep).push(l);
  // Still too big for the bots to read: move the oldest finished lines too (never today's or yesterday's) until under target.
  let size = Buffer.byteLength(keep.join('\n'));
  if (size > target) {
    const order = keep.map((l, i) => [l.match(LINE)?.[1] || '9999', i]).filter(([d]) => d !== '9999').sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
    const out = new Set();
    for (const [, i] of order) { if (size <= target) break; if (!movable(keep[i], minDays)) continue; out.add(i); size -= Buffer.byteLength(keep[i]) + 1; }
    moved = [...moved, ...keep.filter((_, i) => out.has(i))]; keep = keep.filter((_, i) => !out.has(i));
  }
  while (keep.length && !keep[0].trim()) keep.shift();
  const max = highest([...lines, archiveText].join('\n')), am = highest(archiveText);
  max.D = Math.max(max.D, am.D); max.I = Math.max(max.I, am.I);
  const live = archiveNote({month, standing, max}) + '\n\n' + keep.join('\n').replace(/\n*$/, '\n');
  const archive = moved.length ? (archiveText ? archiveText.replace(/\n*$/, '\n') : `# Decisions archive, ${month}\n\nFinished lines moved here from board/decisions-${month}.md by the Toby app, more than 7 days after they were written. Nothing here is waiting. Standing rules stay in the live file.\n\n`) + moved.join('\n') + '\n' : archiveText;
  return {live, archive, moved: moved.length, max};
}
