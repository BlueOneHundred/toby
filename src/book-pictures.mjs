// Toby: pictures inside a book and its app.
// In the Markdown a picture is a line on its own: ![What it shows](images/ch2-starter.jpg "Caption under the picture")
// The path is read from the book's own folder (the folder of the first part), or from the team folder when it
// starts with "ebooks/". PNG, JPEG and WebP photos are built into the file; SVG diagrams are set inline, so they
// use the book's own fonts and palette colours (var(--pine), var(--marigold), var(--ink), var(--butter), var(--mint)).

export const PICTURE_LINE = /^\s*!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)\s*$/;
const PICTURE_ANY = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g;

/** Every picture path the parts point to, in order, each once. */
export function pictureRefs(parts) {
  const out = [];
  for (const part of parts || []) for (const m of String(part || '').matchAll(PICTURE_ANY)) if (!out.includes(m[2])) out.push(m[2]);
  return out;
}

/** Where a picture path lives in the team folder, given the folder of the book's first part. */
export function picturePath(ref, baseDir) {
  const clean = String(ref).replace(/\\/g, '/').replace(/^\.\//, '');
  if (/^ebooks\//.test(clean) || !baseDir) return clean;
  return `${String(baseDir).replace(/\\/g, '/').replace(/\/+$/, '')}/${clean}`;
}

/** Width and height in pixels of a PNG, JPEG or WebP, or of an SVG's viewBox. Null when it cannot tell. */
export function imageSize(bytes) {
  const b = Buffer.from(bytes);
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return {w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) return {w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5)};
      i += 2 + len;
    }
    return null;
  }
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return {w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3)};
    if (kind === 'VP8 ') return {w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff};
    if (kind === 'VP8L') { const v = b.readUInt32LE(21); return {w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1}; }
    return null;
  }
  const text = b.toString('utf8', 0, Math.min(b.length, 4000));
  const box = /<svg\b[^>]*\bviewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*["']/i.exec(text);
  return box ? {w: Number(box[1]), h: Number(box[2])} : null;
}

/** An SVG made safe to set inside the page: no scripts, event handlers, outside links or embedded HTML; it sizes to its box. */
export function cleanSvg(text) {
  let svg = String(text).replace(/^﻿/, '').replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!/^<svg\b/i.test(svg)) throw new Error('That file is not an SVG picture.');
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '');
  // the figure sets the size, so drop a fixed width and height on the outer element
  svg = svg.replace(/^<svg\b([^>]*)>/i, (m, attrs) => `<svg${attrs.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '')} preserveAspectRatio="xMidYMid meet" role="img">`);
  return svg;
}

const TYPES = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'};
/**
 * One picture, ready for the book or the app: {svg, w, h} for a diagram or {src, w, h, px} for a photo.
 * px is the width of the file as it was made, before any shrinking, so a picture too small to print sharply is caught.
 */
export function pictureEntry(bytes, name, original = null) {
  const ext = String(name).toLowerCase().split('.').pop();
  if (ext === 'svg') {
    const svg = cleanSvg(Buffer.from(bytes).toString('utf8'));
    const size = imageSize(Buffer.from(svg));
    if (!size) throw new Error(`${name}: an SVG picture needs a viewBox.`);
    return {svg, w: size.w, h: size.h};
  }
  if (!TYPES[ext]) throw new Error(`${name}: pictures must be PNG, JPEG, WebP or SVG.`);
  // the bytes decide the type, so a JPEG saved under a .png name still shows
  const b = Buffer.from(bytes);
  const type = b[0] === 0x89 && b[1] === 0x50 ? 'image/png' : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : TYPES[ext];
  const size = imageSize(bytes);
  if (!size) throw new Error(`${name}: the picture could not be read.`);
  const first = original ? imageSize(original) || size : size;
  return {src: `data:${type};base64,${Buffer.from(bytes).toString('base64')}`, w: size.w, h: size.h, px: first.w};
}

/** The picture a paragraph is, when the paragraph holds nothing but one picture. */
export function pictureOf(line) {
  const m = PICTURE_LINE.exec(String(line || ''));
  return m ? {alt: m[1].trim(), href: m[2], caption: (m[3] || '').trim()} : null;
}

/**
 * Copies a base book's picture lines into a creator edition: same chapter number and same "###" section (or straight
 * under the chapter heading for an opening picture), whatever the edition renamed. Paths become team paths (baseDir/...)
 * so the edition uses the base book's files. With us=true, captions get US spelling.
 * base and edition: arrays of Markdown parts. Returns {parts, placed, total, missing}.
 */
export function placeEditionPictures({base, edition, baseDir, us = false}) {
  const isPic = line => /^!\[[^\]]*\]\(/.test(line);
  const items = [];
  for (const part of base) {
    let chap = null, head = null, seen = false;
    for (const line of String(part).replace(/\r\n/g, '\n').split('\n')) {
      const m = /^## Chapter (\d+):/.exec(line);
      if (m) { chap = Number(m[1]); head = null; seen = false; continue; }
      if (line.startsWith('## ')) { chap = null; continue; }
      if (line.startsWith('### ')) { head = line.slice(4).trim(); continue; }
      if (isPic(line) && chap) items.push({chap, head: head || seen ? head : null, line});
      else if (line.trim()) seen = true;
    }
  }
  const norm = h => h.toLowerCase().replace(/flavou?r/g, 'flavor').replace(/fibre/g, 'fiber').replace(/colou?r/g, 'color').replace(/\s+/g, ' ').trim();
  const spell = line => line.replace(/fibre/g, 'fiber').replace(/Fibre/g, 'Fiber').replace(/flavour/g, 'flavor').replace(/Flavour/g, 'Flavor').replace(/colour/g, 'color').replace(/Colour/g, 'Color');
  const dir = String(baseDir).replace(/\\/g, '/').replace(/\/+$/, '');
  const repath = line => line.replace(/\]\(\s*<?(?!ebooks\/)([^)\s>]+)/, (m, p) => `](${dir}/${p.replace(/^\.\//, '')}`);
  const missing = [], placedLines = new Set();
  const parts = edition.map(text => {
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');
    for (const item of items) {
      const pic = repath(us ? spell(item.line) : item.line);
      if (lines.includes(pic)) { placedLines.add(item.line); continue; }
      const start = lines.findIndex(l => new RegExp(`^## Chapter ${item.chap}:`).test(l));
      if (start < 0) continue;
      let end = lines.findIndex((l, i) => i > start && l.startsWith('## ')); if (end < 0) end = lines.length;
      if (item.head === null) { lines.splice(start + 1, 0, '', pic); placedLines.add(item.line); continue; }
      const h = lines.findIndex((l, i) => i > start && i < end && l.startsWith('### ') && norm(l.slice(4)) === norm(item.head));
      if (h < 0) continue;
      let next = lines.findIndex((l, i) => i > h && l.startsWith('#')); if (next < 0) next = lines.length;
      while (next > h + 1 && !lines[next - 1].trim()) next--;
      lines.splice(next, 0, '', pic); placedLines.add(item.line);
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  });
  for (const item of items) if (!placedLines.has(item.line)) missing.push(`Chapter ${item.chap}${item.head ? `, "### ${item.head}"` : ' opening'}: ${(/\]\(([^)\s]+)/.exec(item.line) || [])[1]}`);
  const total = parts.reduce((n, p) => n + p.split('\n').filter(isPic).length, 0);
  return {parts, placed: placedLines.size, total, missing};
}
