// Toby build 47: "both units for every buyer" (Tavin, 23 Nov). A measurement shows the creator's unit first and the
// other system in brackets: "60 cm (24 in)", "635 kg (1,400 lbs)", "0°C to 40°C (32°F to 105°F)", "3 m (9 ft 10 in)".
// conversionPairs() finds those pairs in a line and says whether the bracketed figure really is a conversion,
// so the edition check can accept the new numbers a conversion brings while still refusing any other new figure.

// Each unit: the quantity it measures and its size in a base unit (metres, kilograms, litres, square metres, km/h).
// A unit with several sizes (US or UK gallon) is right if any of them fits.
const UNITS = [
  [['sq ft', 'square feet', 'square foot', 'sq. ft', 'ft²'], 'area', [0.09290304]],
  [['sq in', 'square inches', 'square inch', 'in²'], 'area', [0.00064516]],
  [['m²', 'sq m', 'square metres', 'square meters', 'square metre', 'square meter'], 'area', [1]],
  [['cm²', 'sq cm'], 'area', [0.0001]],
  [['km/h', 'kph', 'kmh'], 'speed', [1]],
  [['mph', 'miles per hour'], 'speed', [1.609344]],
  [['mm', 'millimetres', 'millimeters', 'millimetre', 'millimeter'], 'length', [0.001]],
  [['cm', 'centimetres', 'centimeters', 'centimetre', 'centimeter'], 'length', [0.01]],
  [['km', 'kilometres', 'kilometers', 'kilometre', 'kilometer'], 'length', [1000]],
  [['m', 'metres', 'meters', 'metre', 'meter'], 'length', [1]],
  [['in', 'inches', 'inch'], 'length', [0.0254]],
  [['ft', 'feet', 'foot'], 'length', [0.3048]],
  [['yd', 'yards', 'yard'], 'length', [0.9144]],
  [['miles', 'mile', 'mi'], 'length', [1609.344]],
  [['kg', 'kilograms', 'kilogram', 'kilos', 'kilo'], 'mass', [1]],
  [['g', 'grams', 'gram'], 'mass', [0.001]],
  [['tonnes', 'tonne', 't'], 'mass', [1000]],
  [['lbs', 'lb', 'pounds', 'pound'], 'mass', [0.45359237]],
  [['oz', 'ounces', 'ounce'], 'mass', [0.028349523]],
  [['fl oz', 'fluid ounces', 'fluid ounce'], 'volume', [0.0295735, 0.0284131]],
  [['ml', 'mL', 'millilitres', 'milliliters', 'millilitre', 'milliliter'], 'volume', [0.001]],
  [['l', 'L', 'litres', 'liters', 'litre', 'liter'], 'volume', [1]],
  [['quarts', 'quart', 'qt'], 'volume', [0.946353, 1.1365]],
  [['pints', 'pint', 'pt'], 'volume', [0.473176, 0.568261]],
  [['gallons', 'gallon', 'gal'], 'volume', [3.785412, 4.54609]],
  [['cups', 'cup'], 'volume', [0.2365882, 0.25]],
  [['°C', '° C', 'degrees C', 'degrees Celsius', 'Celsius'], 'temp', ['C']],
  [['°F', '° F', 'degrees F', 'degrees Fahrenheit', 'Fahrenheit'], 'temp', ['F']],
];
const unitOf = new Map();
for (const [names, kind, sizes] of UNITS) for (const name of names) unitOf.set(name.toLowerCase(), {name, kind, sizes});
const esc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const NAMES = [...unitOf.keys()].sort((a, b) => b.length - a.length).map(n => esc(n).replace(/ /g, '\\s?')).join('|');
const NUM = String.raw`(?:\d+\s\d+\/\d+|\d+\/\d+|\d[\d,]*(?:\.\d+)?|\.\d+)`;
const UNIT = String.raw`(?:${NAMES})(?![A-Za-z²])`;
// One amount: a number with its unit, a range ("0.6 to 0.7 m²", "0°C to 40°C"), feet and inches ("9 ft 10 in"),
// or sizes ("38 x 89 mm").
const AMOUNT = String.raw`${NUM}\s?(?:${UNIT}\s?)?(?:(?:to|-|–|x|×|by)\s?${NUM}\s?)*${UNIT}(?:\s${NUM}\s?(?:in|inches|inch)(?![A-Za-z]))?`;
const PAIR = new RegExp(String.raw`(${AMOUNT})\s*\(\s*(?:about|around|roughly|approx\.?|approximately|~|just under|just over|over|under|up to)?\s*(${AMOUNT})[^)]{0,40}\)`, 'gi');
// Insulation: "RSI 0.62 per 2.5 cm (R-3.5 per in)" and the other way round. RSI per 25 mm = R per inch x 0.1761.
const RVALUE = /RSI\s?(\d+(?:\.\d+)?)\s?(?:per|\/)\s?(?:2\.5\s?cm|25\s?mm)\s*\(\s*(?:about\s)?R-?\s?(\d+(?:\.\d+)?)\s?(?:per|\/)\s?(?:in|inch)\b[^)]*\)|R-?\s?(\d+(?:\.\d+)?)\s?(?:per|\/)\s?(?:in|inch)\b\s*\(\s*(?:about\s)?RSI\s?(\d+(?:\.\d+)?)\s?(?:per|\/)\s?(?:2\.5\s?cm|25\s?mm)[^)]*\)/gi;

const value = s => { s = s.trim(); const mixed = /^(\d+)\s(\d+)\/(\d+)$/.exec(s); if (mixed) return +mixed[1] + mixed[2] / mixed[3]; const frac = /^(\d+)\/(\d+)$/.exec(s); if (frac) return frac[1] / frac[2]; return Number(s.replace(/,/g, '')); };
// The numbers in an amount, as the edition check counts them ("1,400" -> "1400"), and the values with their units.
const tokens = s => [...s.matchAll(/\d+(?:[.,]\d+)*%?/g)].map(m => m[0].replace(/,/g, ''));
function parse(amount) {
  const text = amount.replace(/\s+/g, ' ').trim();
  const units = [...text.matchAll(new RegExp(UNIT, 'gi'))].map(m => unitOf.get(m[0].replace(/\s+/g, ' ').toLowerCase()) || unitOf.get(m[0].replace(/\s+/g, '').toLowerCase())).filter(Boolean);
  if (!units.length) return null;
  const feetInches = new RegExp(String.raw`^(${NUM})\s?(?:ft|feet|foot)\s(${NUM})\s?(?:in|inches|inch)$`, 'i').exec(text);
  if (feetInches) return {unit: unitOf.get('ft'), values: [value(feetInches[1]) + value(feetInches[2]) / 12], text};
  const unit = units[units.length - 1];
  const values = [...text.matchAll(new RegExp(NUM, 'g'))].map(m => value(m[0])).filter(n => Number.isFinite(n));
  return values.length ? {unit, values, text} : null;
}
const toC = (v, from) => (from === 'F' ? (v - 32) * 5 / 9 : v);
// How far one written figure may sit from the exact conversion: 8%, or half a step of the way it is written
// ("1.8" may be off by 0.05, "80" by 5, "1,400" by 50), whichever is larger.
function step(written) {
  const s = String(written);
  if (s.includes('.')) return 10 ** -(s.split('.')[1].length);
  const zeros = (/0+$/.exec(s) || [''])[0].length;
  return 10 ** Math.min(zeros, Math.max(0, s.length - 1));
}
function close(exact, written, writtenText) {
  const near = Math.max(Math.abs(exact) * 0.08, step(writtenText) / 2 + 1e-9);
  return Math.abs(exact - written) <= near;
}
function matches(a, b, aTexts, bTexts) {
  if (a.unit.kind !== b.unit.kind) return false;
  if (a.unit.kind === 'temp') {
    const pairs = a.values.length === b.values.length ? a.values.map((v, i) => [v, b.values[i], bTexts[i]]) : b.values.length === 1 ? a.values.map(v => [v, b.values[0], bTexts[0]]) : null;
    if (!pairs) return false;
    return pairs.every(([x, y, t]) => { const c = toC(x, a.unit.sizes[0]); const exact = b.unit.sizes[0] === 'F' ? c * 9 / 5 + 32 : c; return Math.abs(exact - y) <= Math.max(1.5, step(t) / 2); });
  }
  if (a.values.length !== b.values.length && b.values.length !== 1 && a.values.length !== 1) return false;
  const n = Math.max(a.values.length, b.values.length);
  return a.unit.sizes.some(sa => b.unit.sizes.some(sb => {
    for (let i = 0; i < n; i++) {
      const x = a.values[Math.min(i, a.values.length - 1)], y = b.values[Math.min(i, b.values.length - 1)];
      const exact = x * sa / sb, yText = bTexts[Math.min(i, bTexts.length - 1)];
      if (!close(exact, y, yText)) return false;
    }
    return true;
  }));
}
const writtenNumbers = s => [...s.matchAll(new RegExp(NUM, 'g'))].map(m => m[0].trim().replace(/,/g, '').replace(/^.*\s/, ''));

/** Every "amount (other amount)" pair in a line: {text, numbers, right}. numbers are the figures in the pair as the
 * edition check counts them; right says whether the bracket really is a conversion of the amount before it. */
export function conversionPairs(line) {
  const out = [];
  const s = String(line).replace(/[‘’]/g, "'");
  for (const m of s.matchAll(PAIR)) {
    const a = parse(m[1]), b = parse(m[2]);
    if (!a || !b || a.unit.kind !== b.unit.kind) continue;
    if (a.unit.name === b.unit.name && a.unit.kind !== 'temp') continue;
    const right = matches(a, b, writtenNumbers(m[1]), writtenNumbers(m[2])) || matches(b, a, writtenNumbers(m[2]), writtenNumbers(m[1]));
    out.push({text: m[0], numbers: [...tokens(m[1]), ...tokens(m[2])], right});
  }
  for (const m of s.matchAll(RVALUE)) {
    const rsi = Number(m[1] ?? m[4]), r = Number(m[2] ?? m[3]);
    out.push({text: m[0], numbers: tokens(m[0]), right: Math.abs(r * 0.1761 - rsi) <= Math.max(rsi * 0.05, 0.01)});
  }
  return out;
}
