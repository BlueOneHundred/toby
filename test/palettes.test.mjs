import test from 'node:test';
import assert from 'node:assert/strict';
import {PALETTES, PALETTE_NAMES, palette, paletteChecks, appRootCSS} from '../src/palettes.mjs';
import {styleCSS} from '../src/book-style.mjs';

test('there are 8 to 10 palettes and pine is first', () => {
  assert.ok(PALETTE_NAMES.length >= 8 && PALETTE_NAMES.length <= 10);
  assert.equal(PALETTE_NAMES[0], 'pine');
});

test('every palette passes every contrast check', () => {
  for (const name of PALETTE_NAMES) for (const c of paletteChecks(palette(name)))
    assert.ok(c.ratio >= c.need, `${name}: ${c.what} is ${c.ratio}, needs ${c.need}`);
});

test('every colour is a solid 6-digit hex (no transparency)', () => {
  for (const [name, p] of Object.entries(PALETTES)) for (const set of [p.book, p.app]) for (const [k, v] of Object.entries(set))
    assert.match(v, /^#[0-9A-F]{6}$/, `${name}.${k} = ${v}`);
});

test('book CSS uses the palette everywhere, including the @page rules', () => {
  const css = styleCSS({pageW: '152.4mm', pageH: '228.6mm', sizeRule: '152.4mm 228.6mm', title: 'T', palette: 'berry'});
  assert.ok(!css.includes('#156A5F'), 'pine main colour left behind');
  assert.ok(css.includes('@page cover{margin:0;background:' + palette('berry').book.pine));
  const pine = styleCSS({pageW: '152.4mm', pageH: '228.6mm', sizeRule: '152.4mm 228.6mm', title: 'T'});
  assert.ok(pine.includes('--pine:#156A5F'));
});

test('unknown palette names are refused with the list', () => {
  assert.throws(() => palette('neon'), /Use one of: pine/);
});

test('app CSS sets every template variable', () => {
  const css = appRootCSS('ocean');
  for (const k of ['pine', 'deep', 'deeper', 'marigold', 'marigold-dark', 'mint', 'butter', 'pine-text', 'red']) assert.ok(css.includes(`--${k}:`), k);
});
