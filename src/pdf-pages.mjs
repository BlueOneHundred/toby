// Toby: read which page each named link target lands on in a PDF made by Chromium's printer.
// make_book prints twice: once to learn the page numbers, then again with them in the contents page.
// Chromium (Skia) writes the page tree and the named destinations as plain, uncompressed objects.
// Where each named target lands: its page and its distance from the foot of the page, in points.
export function pdfDests(buffer) {
  const text = Buffer.from(buffer).toString('latin1');
  const offsets = new Map();
  for (const m of text.matchAll(/(?:^|\n)(\d+) 0 obj\n/g)) offsets.set(Number(m[1]), m.index + m[0].length);
  const object = n => { const at = offsets.get(n); if (at === undefined) return ''; const end = text.indexOf('endobj', at); return text.slice(at, end < 0 ? at + 4000 : end); };
  const catalog = /\/Type \/Catalog[\s\S]{0,400}?\/Pages (\d+) 0 R|\/Pages (\d+) 0 R[\s\S]{0,400}?\/Type \/Catalog/.exec(text);
  const dests = /\/Dests (\d+) 0 R/.exec(text);
  if (!catalog || !dests) return {};
  const pages = [];
  const walk = (n, depth = 0) => {
    const body = object(n);
    if (depth > 12 || !body) return;
    if (/\/Type \/Pages\b/.test(body)) { const kids = /\/Kids \[([^\]]*)\]/.exec(body); for (const k of (kids ? kids[1] : '').matchAll(/(\d+) 0 R/g)) walk(Number(k[1]), depth + 1); }
    else pages.push(n);
  };
  walk(Number(catalog[1] || catalog[2]));
  const out = {};
  for (const m of object(Number(dests[1])).matchAll(/\/([^\s[\]/<>()]+) \[(\d+) 0 R(?: \/XYZ (-?[\d.]+) (-?[\d.]+))?/g)) {
    const page = pages.indexOf(Number(m[2]));
    if (page >= 0) out[m[1]] = {page: page + 1, top: m[4] === undefined ? null : Number(m[4])};
  }
  // Where each internal link sits: the last one found for a target wins (the builder's probes come last in a block).
  const links = {};
  pages.forEach((n, index) => {
    const annots = /\/Annots \[([^\]]*)\]/.exec(object(n));
    for (const ref of (annots ? annots[1] : '').matchAll(/(\d+) 0 R/g)) {
      const body = object(Number(ref[1]));
      const dest = /\/Dest \/([^\s[\]/<>()]+)/.exec(body), rect = /\/Rect \[(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\]/.exec(body);
      if (dest && rect) (links[dest[1]] ||= []).push({page: index + 1, bottom: Math.min(Number(rect[2]), Number(rect[4])), top: Math.max(Number(rect[2]), Number(rect[4])), width: Math.abs(Number(rect[3]) - Number(rect[1]))});
    }
  });
  Object.defineProperty(out, LINKS, {value: links});
  return out;
}
export const LINKS = Symbol('links');
// Every internal link in the PDF, by the name of its target: [{page, bottom, top, width}] in points from the foot.
export const pdfLinks = buffer => pdfDests(buffer)[LINKS] || {};

// Page number for each named target.
export function pdfDestPages(buffer) {
  return Object.fromEntries(Object.entries(pdfDests(buffer)).map(([name, dest]) => [name, dest.page]));
}
