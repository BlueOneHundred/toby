// Curated colour palettes for creator books and apps. Creative Studio picks one name per creator.
// Every colour is a solid hex value (no transparency). "pine" is the original house design and
// must stay byte-for-byte the same, so old books rebuild unchanged. Other palettes set only a
// main colour, its two darker shades and an accent pair; the light tints are mixed from those.
// test/palettes.test.mjs checks every palette for contrast (WCAG AA) wherever text sits on colour.

const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
export const mix = (a, b, t) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = h => { const c = hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const INK = '#1B2530', WHITE = '#FFFFFF';

// The original house colours from book-style.mjs and the app template. Two were darkened on 15 Nov 2026 to pass
// contrast: the running head (#7C8894 to #66727E) and the app's dark gold text (#B87A0C to #7A5200).
const PINE = {
  label: 'Pine and marigold', mood: 'calm, natural, trusted (the house design)',
  book: {pine: '#156A5F', pineDeep: '#0E4A43', pineSoft: '#1D7B6F', marigold: '#F2B23E', ink: INK, muted: '#66727E', mint: '#E7F2EF', butter: '#FFF3D4', blush: '#FBEAE5', brick: '#B9432E', line: '#DCE3E1', fog: '#F1F3F4',
    onDark: '#D5E9E4', darkRule: '#4A9085', accentText: '#7A5200', headMuted: '#66727E', headRule: '#D3DBD9', grid: '#C9D4D1'},
  app: {pine: '#156A5F', deep: '#0E4A43', deeper: '#0A3832', marigold: '#F2B23E', 'marigold-dark': '#7A5200', ink: INK, soft: '#55626C', mint: '#E7F2EF', 'mint-line': '#C7DDD8', 'mint-mid': '#D5E8E3', butter: '#FFF3D4', 'butter-line': '#F0D89A', paper: WHITE,
    'pine-tint': '#9CC7BF', 'pine-text': '#CFE6E1', red: '#A63A28', 'red-tint': '#FBEAE5', 'red-line': '#EBC2B8', 'gold-hover': '#F6C262'},
};

// main: page colour of covers and openers (white text sits on it); deep, deeper: darker shades;
// accent: the warm highlight (dark ink sits on it); accentText: accent-coloured text on a pale accent box.
function derive({label, mood, main, deep, deeper, accent, accentText}) {
  return {label, mood,
    book: {pine: main, pineDeep: deep, pineSoft: mix(main, WHITE, 0.08), marigold: accent, ink: INK, muted: '#66727E', mint: mix(main, WHITE, 0.9), butter: mix(accent, WHITE, 0.82), blush: '#FBEAE5', brick: '#B9432E', line: mix(main, WHITE, 0.86), fog: '#F1F3F4',
      onDark: mix(main, WHITE, 0.84), darkRule: mix(main, WHITE, 0.3), accentText, headMuted: '#66727E', headRule: mix(main, WHITE, 0.82), grid: mix(main, WHITE, 0.76)},
    app: {pine: main, deep, deeper, marigold: accent, 'marigold-dark': accentText, ink: INK, soft: '#55626C', mint: mix(main, WHITE, 0.9), 'mint-line': mix(main, WHITE, 0.76), 'mint-mid': mix(main, WHITE, 0.84), butter: mix(accent, WHITE, 0.82), 'butter-line': mix(accent, WHITE, 0.5), paper: WHITE,
      'pine-tint': mix(main, WHITE, 0.6), 'pine-text': mix(main, WHITE, 0.8), red: '#A63A28', 'red-tint': '#FBEAE5', 'red-line': '#EBC2B8', 'gold-hover': mix(accent, WHITE, 0.2)},
  };
}

export const PALETTES = {
  pine: PINE,
  ocean: derive({label: 'Ocean and sand', mood: 'fresh, coastal, steady', main: '#1D4E73', deep: '#143853', deeper: '#0E2A3F', accent: '#F2B36B', accentText: '#7A4A0E'}),
  berry: derive({label: 'Berry and gold', mood: 'warm, playful, cosy', main: '#7A2E5C', deep: '#5A2143', deeper: '#431832', accent: '#F2C14E', accentText: '#735400'}),
  forest: derive({label: 'Forest and honey', mood: 'outdoorsy, earthy, grounded', main: '#2E5B3A', deep: '#21432A', deeper: '#18321F', accent: '#E9C46A', accentText: '#6E5310'}),
  terracotta: derive({label: 'Terracotta and cream', mood: 'sunny, homely, rustic', main: '#9C4129', deep: '#73301E', deeper: '#572416', accent: '#F4CE8A', accentText: '#7A4B00'}),
  slate: derive({label: 'Slate and coral', mood: 'modern, clean, minimal', main: '#35444F', deep: '#26323A', deeper: '#1C252B', accent: '#F59E7E', accentText: '#8A3519'}),
  lavender: derive({label: 'Lavender and butter', mood: 'gentle, soft, dreamy', main: '#56468A', deep: '#3F3366', deeper: '#2F264D', accent: '#F6CB72', accentText: '#735000'}),
  lagoon: derive({label: 'Lagoon and peach', mood: 'bright, friendly, upbeat', main: '#0E6577', deep: '#0A4A57', deeper: '#073742', accent: '#FFB59E', accentText: '#8C3A1E'}),
  cocoa: derive({label: 'Cocoa and caramel', mood: 'snug, classic, warm', main: '#5E3B24', deep: '#452B1A', deeper: '#342014', accent: '#EDBE7C', accentText: '#74490F'}),
  rose: derive({label: 'Rose and blush gold', mood: 'romantic, kind, elegant', main: '#8E3550', deep: '#69273B', deeper: '#4F1D2C', accent: '#F3CF8A', accentText: '#735000'}),
};

export const PALETTE_NAMES = Object.keys(PALETTES);

export function palette(name = 'pine') {
  const key = String(name || 'pine').trim().toLowerCase();
  if (!PALETTES[key]) throw new Error(`Unknown palette "${name}". Use one of: ${PALETTE_NAMES.join(', ')}.`);
  return PALETTES[key];
}

// The places where text sits on a palette colour, with the contrast each needs (4.5 normal text, 3 large text or rules).
export function paletteChecks(p) {
  const b = p.book, a = p.app;
  return [
    ['white text on the cover and openers', WHITE, b.pine, 4.5],
    ['white text on the darker shade', WHITE, b.pineDeep, 4.5],
    ['light text on the cover and openers', b.onDark, b.pine, 4.5],
    ['accent subtitle on the cover (large)', b.marigold, b.pine, 3],
    ['dark text on the accent seal', b.ink, b.marigold, 4.5],
    ['accent label on the "Try tonight" box', b.accentText, b.butter, 4.5],
    ['main colour headings on white', b.pine, WHITE, 4.5],
    ['main colour text on the pale tint', b.pine, b.mint, 4.5],
    ['body text on the pale tint', b.ink, b.mint, 4.5],
    ['running head on white', b.headMuted, WHITE, 4.5],
    ['muted text on white', b.muted, WHITE, 4.5],
    ['app: white text on the main colour', WHITE, a.pine, 4.5],
    ['app: white text on the deep shade', WHITE, a.deep, 4.5],
    ['app: light text on the deep shade', a['pine-text'], a.deep, 4.5],
    ['app: dark text on the accent button', a.ink, a.marigold, 4.5],
    ['app: dark text on the hovered button', a.ink, a['gold-hover'], 4.5],
    ['app: accent-dark text on the pale accent', a['marigold-dark'], a.butter, 4.5],
    ['app: soft text on the page', a.soft, a.mint, 4.5],
  ].map(([what, fg, bg, need]) => ({what, fg, bg, need, ratio: Math.round(contrast(fg, bg) * 100) / 100}));
}

// CSS variables for the app template, appended after the template's own :root so the palette wins.
export function appRootCSS(name) {
  const a = palette(name).app;
  return ':root{' + Object.entries(a).filter(([k]) => k !== 'gold-hover').map(([k, v]) => `--${k}:${v}`).join(';') + '}';
}
