import test from 'node:test';
import assert from 'node:assert/strict';
import {conversionPairs} from '../src/units.mjs';
import {checkEdition} from '../src/edition-check.mjs';
import {bigNumber, bookToFix, printScaleFromLinks} from '../src/book-builder.mjs';

// Made-up books only: real creators' words never go into this public repository.

test('build 47: conversions in brackets are recognised, and a wrong one is caught', () => {
  const right = (line) => conversionPairs(line).map((p) => p.right);
  assert.deepEqual(right('A label of 635 kg (1,400 lbs) and riders of 68 kg (150 lb) each.'), [true, true]);
  assert.deepEqual(right('A wet bath needs 0.6 to 0.7 m² (6 to 8 sq ft).'), [true]);
  assert.deepEqual(right('Charge between 0°C to 40°C (32°F to 105°F).'), [true]);
  assert.deepEqual(right('Leave 3 m (9 ft 10 in) of cable and use 6 mm (1/4 in) ply.'), [true, true]);
  assert.deepEqual(right('Closed-cell foam is about RSI 1.14 per 2.5 cm (R-6.5 per in).'), [true]);
  assert.deepEqual(right('Keep under 50 mph (80 km/h) and fill 1 to 3 litres (about 1 to 3 quarts).'), [true, true]);
  assert.deepEqual(right('Measure 24 inches (60 cm) up.'), [true]);
  assert.deepEqual(right('Cut it 60 cm (12 in) wide.'), [false]);
  assert.deepEqual(right('Use M6 and 11.1 mm (0.44 in) holes.'), [true]);
  assert.deepEqual(conversionPairs('Chapter 3 (page 12) and 40% (most)'), []);
});

const BASE = ['## Chapter 1: Weigh it\n\nThe label says 1,400 lbs and riders weigh 150 lbs each [S1].\n\nLeave 24 inches of room at the side [S2].\n\nA second paragraph about weighing a van.\n\nA third paragraph about weighing a van.\n\n## Sources\n\n1. One. 2. Two.'];
const ed = (text) => ({parts: [`## Chapter 1: Weigh it\n\n${text}\n\nWe wrote a fresh second paragraph here.\n\nAnd a fresh third paragraph here too.\n\nOne more new line for luck.\n\n## Sources\n\n1. One. 2. Two.`]});

test('build 47: the edition check accepts a conversion of a sourced figure, not a new figure or a wrong conversion', () => {
  const ok = checkEdition({base: {parts: BASE}, edition: ed('My label says 635 kg (1,400 lbs) and we weigh 68 kg (150 lbs) each [S1].\n\nI leave 60 cm (24 inches) at the side [S2].')});
  assert.ok(!ok.toFix.some((x) => /not in the base book|do not match/.test(x)), ok.toFix.join('\n'));
  const added = checkEdition({base: {parts: BASE}, edition: ed('My label says 635 kg (1,400 lbs), 150 lbs each and 37 extra [S1].\n\nI leave 60 cm (24 inches) [S2].')});
  assert.ok(added.toFix.some((x) => /not in the base book or sources\.md: 37\b/.test(x)), added.toFix.join('\n'));
  const wrong = checkEdition({base: {parts: BASE}, edition: ed('My label says 900 kg (1,400 lbs), 150 lbs each [S1].\n\nI leave 60 cm (24 inches) [S2].')});
  assert.ok(wrong.toFix.some((x) => /do not match the figure they convert: "900 kg \(1,400 lbs\)"/.test(x)), wrong.toFix.join('\n'));
  assert.ok(wrong.toFix.some((x) => /not in the base book or sources\.md: 900/.test(x)));
});

test('build 47: a big number puts its conversion on its own line, so it can never widen the page', () => {
  assert.equal(bigNumber('25 m (about 80 ft)'), '25 <span class="unit">m</span><span class="alt">(about 80 ft)</span>');
  assert.equal(bigNumber('85 dB'), '85 <span class="unit">dB</span>');
  assert.equal(bigNumber('13,000'), '13,000');
});

test('build 47: a book the printer shrank is reported, with what to do', () => {
  const mm100 = 100 * 72 / 25.4;
  assert.equal(printScaleFromLinks({'cal-top': [{width: 4.2}, {width: mm100}]}), 1);
  assert.equal(printScaleFromLinks({'cal-top': [{width: 4.2}, {width: mm100 * 0.739}]}), 0.739);
  assert.equal(printScaleFromLinks({'cal-top': [{width: 4.2}]}), null);
  const report = {gaps: [], facts: {}, check: {printScale: 0.739, listsSplit: 0}};
  assert.ok(bookToFix(report).some((x) => /printed at 74% of its size/.test(x)));
  assert.ok(!bookToFix({...report, check: {printScale: 1}}).some((x) => /printed at/.test(x)));
});
