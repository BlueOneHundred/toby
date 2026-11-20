import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stampRunLines} from '../src/claude-backend.mjs';

test('build 43: a placeholder time like HH:MM on a run line gets the real time', () => {
  const p = 'board/runs-2026-01-05.md';
  assert.equal(stampRunLines(p, 'HH:MM | Marketing Kit | done: kit saved', '16:31'), '16:31 | Marketing Kit | done: kit saved');
  assert.equal(stampRunLines(p, 'hh:mm | Some Bot | done: x', '09:02'), '09:02 | Some Bot | done: x');
  assert.equal(stampRunLines(p, '17:00 | Some Bot | done: x', '17:47'), '17:47 | Some Bot | done: x');
  assert.equal(stampRunLines(p, 'NOW | Lead Researcher | done: no search', '07:30'), '07:30 | Lead Researcher | done: no search');
  assert.equal(stampRunLines(p, 'Notes about HH:MM | not a run line', '10:00'), 'Notes about HH:MM | not a run line');
  assert.equal(stampRunLines('notes/other.md', 'HH:MM | Bot | done: x', '10:00'), 'HH:MM | Bot | done: x');
});

test('build 43: ticking a project step updates the "N of M steps ticked" line straight away', () => {
  const html = readFileSync(new URL('../templates/app/template-general.html', import.meta.url), 'utf8');
  assert.match(html, /class="xcount"[^>]*>\$\{ticked\} of \$\{r\.steps\.length\} steps ticked/);
  assert.match(html, /case 'check':[^\n]*querySelector\('\.xcount'\)/);
});
