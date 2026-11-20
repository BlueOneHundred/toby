// Toby build 44: extra workdays. The team works Monday to Friday. A date listed in board/extra-workdays.md in the
// team folder (one date per line, YYYY-MM-DD, e.g. "- 2026-11-21 weekend test") counts as a workday too: weekday
// schedules fire, the creators safety net works and the auto-pick runs. When the date has passed, nothing changes.
// First used for the weekend test of 21 and 22 Nov 2026, so build 44 could be tried before Monday.
import {readFile, stat} from 'node:fs/promises';
import {join} from 'node:path';

export const EXTRA_WORKDAYS = 'board/extra-workdays.md';
const pad = n => String(n).padStart(2, '0');
export const dateOf = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function parseExtraWorkdays(text) {
  const out = new Set();
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^\s*(?:[-*]\s*)?(\d{4})-(\d{2})-(\d{2})\b/);
    if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[3]) >= 1 && Number(m[3]) <= 31) out.add(`${m[1]}-${m[2]}-${m[3]}`);
  }
  return out;
}
// Monday to Friday, or a listed extra workday. Local time (the laptop's clock is Hanoi time).
export const isWorkday = (t, extra = new Set()) => { const d = new Date(t).getDay(); return (d >= 1 && d <= 5) || extra.has(dateOf(t)); };

// Reads the list at most once a minute; a missing file means no extra days.
export class ExtraWorkdays {
  constructor(teamRoot, now = Date.now) { this.teamRoot = teamRoot; this.now = now; this.days = new Set(); this.checked = 0; this.mtime = -1; }
  async get() {
    if (!this.teamRoot) return this.days;
    if (this.now() - this.checked < 60000 && this.checked) return this.days;
    this.checked = this.now();
    const path = join(this.teamRoot, EXTRA_WORKDAYS);
    let mtime = 0; try { mtime = (await stat(path)).mtimeMs; } catch { this.days = new Set(); this.mtime = 0; return this.days; }
    if (mtime !== this.mtime) { this.mtime = mtime; try { this.days = parseExtraWorkdays(await readFile(path, 'utf8')); } catch { this.days = new Set(); } }
    return this.days;
  }
  key() { return [...this.days].sort().join(','); }
}
