// Toby: assemble a designed, print-ready ebook from Markdown parts in the team folder.
// Bots write chapters as Markdown with a few labelled blocks; this turns them into one
// self-contained HTML book in the house style (book-style.mjs): cover, title page, contents,
// full-page chapter openers, reading pages with tools, pages to print, a closing page and sources.
// No scripts: everything is static HTML and CSS that Chromium prints to PDF.
import {marked} from 'marked';
import {styleCSS, ICONS} from './book-style.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip = html => String(html).replace(/<[^>]+>/g, '');
const plain = html => strip(html).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const clean = html => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+="[^"]*"/gi, '');
const listItems = html => { const out = []; const re = /<li>([\s\S]*?)<\/li>/g; let m; while ((m = re.exec(html))) out.push(m[1].trim().replace(/^<p>([\s\S]*)<\/p>$/, '$1')); return out; };
const withoutList = html => html.replace(/<(ol|ul)>[\s\S]*<\/\1>/, '').trim();
const inline = text => marked.parseInline(String(text || ''));
// Headings become the PDF's bookmarks. Chromium drops the space where a heading wraps onto a new line
// ("Naps andthe Daily Rhythm"), so each space in a heading is a non-breaking one followed by a place to break.
const heading = html => String(html).replace(/ (?![^<]*>)/g, '\u00A0<wbr>');

export const PAGE_SIZES = {Book: ['177.8mm', '254mm', '7in 10in'], Letter: ['215.9mm', '279.4mm', 'Letter'], A4: ['210mm', '297mm', 'A4'], A5: ['148mm', '210mm', 'A5']};

// "[S7]:" becomes ":" then a small raised 7 that links to source 7, so punctuation never trails a citation.
const citeLinks = ids => ids.split(/\s*,\s*/).map(id => { const n = id.replace(/^S/i, ''); return `<a href="#src-${n}">${n}</a>`; }).join('<span class="cite-sep">,</span>');
const cite = html => html.replace(/\s*\[(S\d+(?:\s*,\s*S\d+)*)\]([.,:;!?]*)/g, (_, ids, punct) => `${punct}<sup class="cite">${citeLinks(ids)}</sup>`);

// Curly quotes and apostrophes in text (never inside tags).
export function smartQuotes(html) {
  let prev = ' ';
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) { if (/^<\/?(p|li|td|th|h\d|div|section|blockquote|br|span)\b/i.test(part)) prev = ' '; return part; }
    const text = part.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i + 1] || '';
      if (ch === '"') out += /[\s([{]/.test(prev) ? '“' : '”';
      else if (ch === "'") out += (/[\s([{“]/.test(prev) && /[A-Za-z0-9]/.test(next)) ? '‘' : '’';
      else out += ch;
      prev = ch;
    }
    return out;
  }).join('');
}

// ---------- labelled blocks ----------
const BOXES = {'the short version': 'short', 'try tonight': 'try', 'try this': 'try', 'remember': 'remember', 'safety note': 'safety', 'red flag': 'red', 'tip': 'tip'};
const VISUAL = {fact: 'facts', facts: 'facts', 'did you know': 'facts', stat: 'stat', steps: 'steps', before: 'before', after: 'after', checklist: 'checklist', timeline: 'timeline', quote: 'quote', 'key idea': 'key-idea'};
const BOX_ICON = {try: 'moon', tip: 'bulb', from: 'paw', safety: 'warn', red: 'flag'};

function labelOf(token) {
  if (!token || token.type !== 'blockquote') return null;
  const first = token.tokens?.find(t => t.type === 'paragraph');
  if (!first) return null;
  const match = /^\s*(?:\*\*)?([^:*\n]{2,60}?)(?:\*\*)?:(?:\*\*)?[ \t]*/.exec(first.raw || first.text || '');
  if (!match) return null;
  const name = match[1].trim(), key = name.toLowerCase();
  if (BOXES[key]) return {name, kind: BOXES[key], skip: match[0].length};
  if (VISUAL[key]) return {name, kind: VISUAL[key], skip: match[0].length};
  if (/^from\b/i.test(name)) return {name, kind: 'from', skip: match[0].length};
  return null;
}

// What follows the label: the whole body, the rest of the label line alone, and the blocks after it.
function boxParts(token, label) {
  const tokens = token.tokens.filter(t => t.type !== 'space');
  const first = tokens.find(t => t.type === 'paragraph');
  const rest = (first.raw || first.text).slice(label.skip).trim();
  const others = tokens.filter(t => t !== first);
  const restTokens = rest ? marked.lexer(rest).filter(t => t.type !== 'space') : [];
  return {body: marked.parser([...restTokens, ...others]), restOnly: rest ? inline(rest.split('\n')[0]) : '', others: marked.parser(others)};
}

function renderBox(token, label) {
  const {body, restOnly, others} = boxParts(token, label);
  switch (label.kind) {
    case 'stat': {
      const inner = body.trim().replace(/^<p>|<\/p>$/g, '');
      const cut = inner.indexOf('|');
      const number = cut >= 0 ? strip(inner.slice(0, cut)).trim() : strip(inner).trim().split(/\s+/)[0];
      const caption = cut >= 0 ? inner.slice(cut + 1).trim() : inner.slice(inner.indexOf(number) + number.length).trim();
      const shown = esc(number).replace(/[A-Za-z]+/g, word => `<span class="unit">${word}</span>`);
      return `<div class="stat"><div class="stat-number">${shown}</div><div class="stat-caption">${caption}</div></div>`;
    }
    case 'steps': {
      const intro = withoutList(body);
      const items = listItems(body);
      // Steps stay on one page. A very long set is set tighter; only one too long for any page may run on.
      const height = items.reduce((sum, item) => sum + Math.ceil(plain(item).length / 72) * 5.7 + 7, 0);
      const fit = height <= 185 ? '' : height * 0.84 <= 198 ? ' dense' : ' dense long';
      const steps = items.map((item, i) => `<div class="step"><div class="step-n">${i + 1}</div><div class="step-t">${item}</div></div>`);
      return `<div class="steps${fit}">${intro ? `<div class="steps-intro">${intro}</div>` : ''}${steps.join('')}</div>`;
    }
    case 'checklist': {
      const items = listItems(body);
      const short = items.length >= 6 && items.every(item => plain(item).length <= 40);
      return `<div class="checklist${short ? ' cols' : ''}${items.length > 18 ? ' long' : ''}"><p class="checklist-title">${restOnly || esc(label.name)}</p><ul>${items.map(item => `<li><span class="tick"></span><span>${item}</span></li>`).join('')}</ul></div>`;
    }
    case 'timeline': {
      const items = listItems(body).map(item => {
        const m = /^(?:<strong>)?([^:<]{1,40}):?(?:<\/strong>)?:?\s*([\s\S]*)$/.exec(item);
        return m && m[2] ? {when: m[1], what: m[2]} : {when: '', what: item};
      });
      const title = restOnly ? `<p class="stages-title">${restOnly}</p>` : '';
      // A few short stages sit side by side; longer ones run down the page with their labels in the margin.
      if (items.length >= 2 && items.length <= 4 && items.every(item => plain(item.what).length <= 64)) return `<div class="stages">${title}<div class="stages-row n${items.length}">${items.map(item => `<div class="stage">${item.when ? `<p class="stage-when">${item.when}</p>` : ''}${item.what}</div>`).join('')}</div></div>`;
      return `<div class="stages">${title}<div class="clock">${items.map(item => `<div class="clock-row"><div class="clock-time">${item.when}</div><div class="clock-what">${item.what}</div></div>`).join('')}</div></div>`;
    }
    case 'quote': return `<blockquote class="pull">${body}</blockquote>`;
    case 'key-idea': return `<div class="key-idea"><span class="ico">${ICONS.bulb}</span>${body}</div>`;
    case 'before': case 'after': return `<div class="ba-side ba-${label.kind}"><p class="box-label">${esc(label.name)}</p>${body}</div>`;
    case 'remember': return `<div class="recap"><p class="recap-title">${esc(label.name)}</p>${/<li>/.test(body) ? `<ul>${listItems(body).map(item => `<li>${item}</li>`).join('')}</ul>` : body}</div>`;
    case 'short': return `<div class="box box-short"><p class="box-label">${esc(label.name)}</p>${body}</div>`;
    default: return `<div class="box box-${label.kind}"><span class="ico">${ICONS[BOX_ICON[label.kind] || 'bulb']}</span><p class="box-label">${esc(label.name)}</p>${body}</div>`;
  }
}

// ---------- tables ----------
const cellText = cell => plain(inline(cell?.text || ''));
const isBlankRow = row => row.slice(1).every(cell => !cellText(cell));
const isFillIn = t => t.rows.length >= 3 && t.rows.filter(isBlankRow).length >= t.rows.length * 0.6;
const isTalk = t => t.header.length === 2 && t.header.some(h => /\bnot that\b|^instead of\b/i.test(cellText(h)));
// (day plans are laid out by renderBlocks, which knows the heading above them)
const isClock = t => t.header.length === 2 && /^(time|when)$/i.test(cellText(t.header[0])) && t.rows.length >= 4;
const isPlan = t => t.header.length >= 2 && /^day$/i.test(cellText(t.header[0])) && t.rows.length >= 10 && t.rows.every(r => /^\d+$/.test(cellText(r[0])));

function talkTable(t) {
  const noFirst = /\bnot that\b|^instead of\b/i.test(cellText(t.header[0]));
  const kind = i => ((i === 0) === noFirst ? 'no' : 'yes');
  const head = t.header.map((h, i) => `<span class="${kind(i)}"><i>${kind(i) === 'yes' ? ICONS.check : ICONS.cross}</i>${inline(h.text)}</span>`).join('');
  const rows = t.rows.map(r => `<div class="talk-row">${r.map((c, i) => `<div class="bubble ${kind(i)}">${inline(c.text)}</div>`).join('')}</div>`).join('');
  return `<div class="talk"><div class="talk-head">${head}</div>${rows}</div>`;
}
function clockTable(t) {
  return `<div class="clock">${t.rows.map(r => `<div class="clock-row"><div class="clock-time">${inline(r[0].text)}</div><div class="clock-what">${inline(r[1].text)}</div></div>`).join('')}</div>`;
}
// A day-by-day plan becomes one page to print per week, with rows that fill the page.
function planPages(t, heading, intro, ctx) {
  const weeks = [];
  t.rows.forEach((r, i) => { if (i % 7 === 0) weeks.push([]); weeks[weeks.length - 1].push(r); });
  if (weeks.length > 1 && weeks[weeks.length - 1].length <= 3) weeks[weeks.length - 2].push(...weeks.pop());
  const three = t.header.length >= 3;
  return weeks.map((rows, w) => {
    const id = `ws-${ctx.prints.length + 1}`;
    if (w === 0) ctx.prints.push({id, title: `${heading} (${weeks.length} pages)`});
    const from = cellText(rows[0][0]), to = cellText(rows[rows.length - 1][0]);
    const first = w === 0 && intro ? `<p class="ws-intro">${intro}</p>` : '';
    const height = `min(27mm, calc((var(--content-h) - ${first ? 36 : 24}mm) / ${rows.length}))`;
    return `<section class="plan-page"${w === 0 ? ` id="${id}"` : ''}><div class="ws-head"><h3>Week\u00A0${w + 1}<span>${from === to ? `Day ${from}` : `Days ${from} to ${to}`}</span></h3><span class="ws-tag">${ICONS.print}Print this page</span></div>${first}<div class="plan-rows">${rows.map(r => `<div class="plan-row" style="height:${height}"><div class="plan-n">${cellText(r[0])}</div><div class="plan-focus">${three ? inline(r[1].text) : ''}</div><div class="plan-do">${r.slice(three ? 2 : 1).map(c => inline(c.text)).join(' ')}</div><div class="plan-tick"></div></div>`).join('')}</div></section>`;
  }).join('');
}
function fillTable(t, hasIntro) {
  const allBlank = t.rows.every(r => r.every(c => !cellText(c)));
  const rows = allBlank ? Array.from({length: Math.max(t.rows.length, 14)}, () => t.header.map(() => ({text: ''}))) : t.rows;
  const height = `min(25mm, calc((var(--content-h) - ${hasIntro ? 50 : 35}mm) / ${rows.length}))`;
  const cols = t.header.length;
  const hasLabels = !allBlank && t.rows.some(r => cellText(r[0]));
  const tick = t.header.map((h, i) => i > 0 && /^(done\??|tick|yes\??|week \d+|mon|tue|wed|thu|fri|sat|sun)$/i.test(cellText(h)));
  const width = i => (i === 0 && hasLabels ? ` style="width:${cols > 5 ? 26 : cols > 3 ? 32 : 42}%"` : '');
  return `<table><thead><tr>${t.header.map((h, i) => `<th${width(i)}>${inline(h.text)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr style="height:${height}">${r.map((c, i) => { const text = inline(c.text); return text ? `<td class="lab">${text}</td>` : tick[i] ? '<td class="tickcell"><i></i></td>' : '<td></td>'; }).join('')}</tr>`).join('')}</tbody></table>`;
}
function plainTable(t) {
  const cols = t.header.length;
  const longest = Array.from({length: cols}, (_, c) => Math.max(cellText(t.header[c]).length, ...t.rows.map(r => cellText(r[c]).length)));
  const onlyCites = Array.from({length: cols}, (_, c) => t.rows.every(r => /^(\s*\[S\d+(?:\s*,\s*S\d+)*\]\s*)+$/.test(r[c]?.text || '')));
  const cls = i => (onlyCites[i] ? ' class="src"' : longest[i] <= 22 && i < cols - 1 ? ' class="nw"' : '');
  return `<table class="${t.rows.length <= 16 ? 'small' : 'long'}"><thead><tr>${t.header.map((c, i) => `<th${cls(i)}>${inline(c.text)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map((c, i) => `<td${cls(i)}>${inline(c.text)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function table(t) {
  if (isTalk(t)) return talkTable(t);
  if (isClock(t)) return clockTable(t);
  return plainTable(t);
}

// ---------- blocks ----------
const smallTable = t => t.type === 'table' && t.rows.length <= 16 && !isPlan(t) && !isFillIn(t);
// Rough height of a block in millimetres, from its wording. Used to decide what can share a page.
function tall(t) {
  if (!t) return 0;
  const lines = (text, perLine) => Math.ceil(Math.max(1, String(text).length) / perLine);
  if (t.type === 'paragraph') return lines(t.text, 74) * 5.7 + 3;
  if (t.type === 'list') return t.items.reduce((sum, item) => sum + lines(item.text, 70) * 5.7 + 1.5, 4);
  if (t.type === 'table') return t.rows.reduce((sum, r) => sum + Math.max(...r.map(c => lines(c.text, Math.max(18, 110 / r.length)))) * 4.6 + 5, 12);
  if (t.type === 'blockquote') {
    const kind = labelOf(t)?.kind, items = (t.raw.match(/^>\s*(?:[-*]|\d+\.) .*$/gm) || []);
    if (kind === 'steps') return items.reduce((sum, item) => sum + lines(item, 72) * 5.7 + 7, 0);
    if (kind === 'checklist') return items.length * 8.5 + 14;
    return lines(t.raw, 78) * 5.4 + 14;
  }
  return 12;
}
// A block that must stay whole on one page (everything except running text and oversized lists).
const whole = t => t && t.type !== 'heading' && (t.type === 'paragraph' ? t.text.length <= 560 : t.type === 'table' ? smallTable(t) : tall(t) <= 195) && labelOf(t)?.kind !== 'remember';
const leadsIn = (t, next) => t?.type === 'paragraph' && t.text.length <= 320 && /:\s*$/.test(t.text) && whole(next) && tall(t) + tall(next) <= 190;
function block(t) {
  if (t.type === 'blockquote') {
    const label = labelOf(t);
    if (!label) return `<div class="box box-plain">${marked.parser(t.tokens)}</div>`;
    return label.kind === 'stat' ? `<div class="stats n1">${renderBox(t, label)}</div>` : renderBox(t, label);
  }
  if (t.type === 'table') return table(t);
  if (t.type === 'list') return tall(t) > 195 ? marked.parser([t]).replace(/^<(ul|ol)/, '<$1 class="long"') : marked.parser([t]);
  if (t.type === 'paragraph' && /^\*[^*][\s\S]*\*$/.test(t.text.trim()) && t.text.length > 120) return `<p class="story">${inline(t.text.trim().slice(1, -1))}</p>`;
  return marked.parser([t]);
}

// Lays out one section. Every block sits in a wrapper (g-<section>-<n>-<kind>) with a tiny link at its foot;
// a first print shows where each wrapper starts and ends, which tells make_book where a block was pushed to
// the next page and how much room it left behind. ctx.gapFill holds what to put in that room on the second print.
function renderBlocks(tokens, ctx) {
  const out = [];
  const push = (html, kind = 's') => out.push({html, kind});   // s: stays whole, f: running text, p: its own page(s)
  const list = tokens.filter(t => t.type !== 'space');
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.type === 'heading') {
      const text = inline(t.text);
      if (t.depth >= 4) { push(`<h4>${heading(text)}</h4>`); continue; }
      // A heading followed (directly or after one paragraph) by a fill-in table or a day plan is a page to print.
      const ahead = [list[i + 1], list[i + 2]];
      const at = ahead.findIndex(x => x?.type === 'table' && (isFillIn(x) || isPlan(x)));
      if (at >= 0 && (at === 0 || ahead[0].type === 'paragraph')) {
        const intro = at === 1 ? inline(ahead[0].text) : '';
        if (isPlan(ahead[at])) push(planPages(ahead[at], plain(text), intro, ctx), 'p');
        else {
          const id = `ws-${ctx.prints.length + 1}`;
          ctx.prints.push({id, title: plain(text)});
          push(`<section class="worksheet" id="${id}"><div class="ws-head"><h3>${heading(text)}</h3><span class="ws-tag">${ICONS.print}Print this page</span></div>${intro ? `<p class="ws-intro">${intro}</p>` : ''}${fillTable(ahead[at], Boolean(intro))}</section>`, 'p');
        }
        i += at + 1;
        continue;
      }
      // A heading never sits alone: it is kept whole with the block under it (and a list or box that block leads into).
      const h3 = `<h3>${heading(text)}</h3>`;
      const next = list[i + 1], after = list[i + 2];
      if (whole(next) && tall(next) <= 160) {
        const group = [list[++i]];
        if (whole(after) && tall(next) + tall(after) <= 170 && (leadsIn(next, after) || (next.type === 'paragraph' && next.text.length <= 240))) group.push(list[++i]);
        push(`<div class="keep">${h3}${group.map(block).join('')}</div>`);
      } else push(h3);
      continue;
    }
    if (t.type === 'blockquote') {
      const label = labelOf(t);
      if (label?.kind === 'facts') continue;   // spare facts are placed by the layout, not here
      if (label?.kind === 'stat') {
        const group = [renderBox(t, label)];
        while (labelOf(list[i + 1])?.kind === 'stat' && group.length < 3) { i++; group.push(renderBox(list[i], labelOf(list[i]))); }
        push(`<div class="stats n${group.length}">${group.join('')}</div>`);
        continue;
      }
      if (label?.kind === 'before' && labelOf(list[i + 1])?.kind === 'after') { push(`<div class="ba">${renderBox(t, label)}${renderBox(list[i + 1], labelOf(list[i + 1]))}</div>`); i++; continue; }
      const longSteps = label?.kind === 'steps' && tall(t) * 0.84 > 198;
      if (longSteps) ctx.longLists.push(ctx.name);
      push(block(t), longSteps || (label?.kind === 'checklist' && (t.raw.match(/^>\s*[-*] /gm) || []).length > 18) ? 'f' : 's');
      continue;
    }
    if (leadsIn(t, list[i + 1])) { push(`<div class="keep">${block(t)}${block(list[++i])}</div>`); continue; }
    if (t.type === 'paragraph') { push(/:\s*$/.test(t.text) ? marked.parser([t]).replace(/^<p>/, '<p class="kw">') : block(t), 'f'); continue; }
    if (t.type === 'table' && isPlan(t)) { push(planPages(t, 'Day by day', '', ctx), 'p'); continue; }
    const longList = t.type === 'list' && tall(t) > 195;
    if (longList) ctx.longLists.push(ctx.name);
    push(block(t), longList || (t.type === 'table' && !smallTable(t)) || t.type === 'code' ? 'f' : 's');
  }
  const wrap = (entry, n) => { const id = `g-${ctx.section}-${n}-${entry.kind}`; if (ctx.texts) ctx.texts[id] = entry.html; return `${ctx.gapFill?.[id] || ''}<div class="b" id="${id}">${entry.html}<a class="pb" href="#${id}"></a></div>`; };
  return out.map(wrap).join('\n') + (ctx.gapFill?.[`g-${ctx.section}-end`] || '');
}

// ---------- spare facts: what fills the room a pushed block leaves behind ----------
function takeFacts(tokens) {
  const facts = [];
  for (const t of tokens) {
    const label = labelOf(t);
    if (label?.kind !== 'facts') continue;
    const {body} = boxParts(t, label);
    for (const item of (/<li>/.test(body) ? listItems(body) : [body.trim().replace(/^<p>|<\/p>$/g, '')])) {
      const cut = item.indexOf('|');
      const fact = cut >= 0 && cut <= 40 ? {num: strip(item.slice(0, cut)).trim(), text: item.slice(cut + 1).trim()} : {num: '', text: item};
      fact.length = plain(fact.text).replace(/\s*\[S\d[^\]]*\]/g, '').length;
      if (fact.length) facts.push(fact);
    }
  }
  return facts;
}
// The largest setting of a fact card whose text is sure to fit in the room (millimetres).
function factCard(fact, room) {
  const number = fact.num ? `<div class="filler-num">${esc(fact.num).replace(/[A-Za-z]+/g, word => `<span class="unit">${word}</span>`)}</div>` : '';
  const card = (cls, style = '') => `<aside class="filler ${cls}${fact.num ? ' has-num' : ''}" style="height:${room.toFixed(1)}mm${style}"><span class="ico">${ICONS.paw}</span><div class="filler-in"><p class="filler-label">Did you know?</p>${number}<p class="filler-text">${fact.text}</p></div></aside>`;
  // A full card: the type grows with the room. Heights are estimated from the wording, with a margin.
  const mmPerPt = 0.3528;
  const height = f => {
    const lines = Math.ceil(fact.length / Math.floor(124 / (0.178 * f)));
    return 2 * (5 + f * 0.32) + 12 + 8.5 + lines * f * mmPerPt * 1.26 + (fact.num ? Math.min(84, f * 3.2) * mmPerPt * 1.02 + 3 : 0) + 3;
  };
  for (let f = 27; f >= (fact.num ? 12.5 : 15); f -= 0.5) if (height(f) <= room) return card('f-big', `;--f:${f}pt`);
  // Less room: a short card with the icon at the side (the number, if any, beside the words), or a single line.
  const side = f => {
    // beside a number the words get what is left of the width
    const digits = fact.num.replace(/[A-Za-z\s]/g, '').length, letters = fact.num.replace(/[^A-Za-z]/g, '').length;
    const numberWidth = fact.num ? (digits * 0.6 + letters * 0.28 + 0.5) * f * 2.3 * mmPerPt + 6 : 0;
    const width = 124 - numberWidth;
    if (width < 40) return Infinity;
    const lines = Math.ceil(fact.length / Math.floor(width / (0.19 * f)));
    return 8 + 6.5 + Math.max(lines * f * mmPerPt * 1.32, fact.num ? f * 2.3 * mmPerPt : 0) + 2.5;
  };
  for (let f = 18; f >= 10.5; f -= 0.5) if (side(f) <= room) return card('f-s', `;--f:${f}pt`);
  if (room >= 6.5 + Math.ceil((fact.length + 16 + fact.num.length) / 80) * 4.9) return card('f-xs');
  return '';
}
// Hands the section's spare facts to its gaps, in reading order. Returns {markerId: html} and what was left unfilled.
function fillGaps(section, facts, gaps, report, texts = {}) {
  // A fact is not placed right beside the lines it repeats.
  const words = text => new Set(plain(text).toLowerCase().replace(/\[s\d[^\]]*\]/g, '').match(/[a-z0-9]{5,}/g) || []);
  const echoes = (fact, n) => {
    const mine = [...words(`${fact.num} ${fact.text}`)];
    if (!Number.isFinite(n) || mine.length < 3) return false;
    const near = words(Object.entries(texts).filter(([id]) => { const k = Number((/-(\d+)-[sfp]$/.exec(id) || [])[1]); return k >= n - 3 && k <= n; }).map(([, text]) => text).join(' '));
    return mine.filter(word => near.has(word)).length / mine.length >= 0.7;
  };
  const mine = Object.entries(gaps || {}).map(([id, room]) => ({id, room, m: /^g-(.+)-(\d+|end)(?:-[sfp])?$/.exec(id)})).filter(g => g.m && g.m[1] === section.id).sort((a, b) => (a.m[2] === 'end' ? 1e9 : Number(a.m[2])) - (b.m[2] === 'end' ? 1e9 : Number(b.m[2])));
  const pool = [...facts], out = {};
  // the largest spaces are served first, so if the facts run out only small ones are left
  for (const gap of [...mine].sort((a, b) => b.room - a.room)) {
    const at = gap.m[2] === 'end' ? Infinity : Number(gap.m[2]);
    const pick = strict => { return room => { for (let i = 0; i < pool.length; i++) { if (strict && echoes(pool[i], at)) continue; const html = factCard(pool[i], room); if (html) { pool.splice(i, 1); return html; } } return ''; }; };
    const take = room => pick(true)(room) || pick(false)(room);
    let html = '';
    if (gap.room >= 128 && pool.length >= 2) {   // a lot of room: two cards
      const half = (gap.room - 5.5) / 2, saved = [...pool];
      const a = take(half), b = a ? take(half) : '';
      if (a && b) html = a + b; else pool.splice(0, pool.length, ...saved);
    }
    if (!html) html = take(gap.room);
    if (html) out[gap.id] = html;
    report.gaps.push({id: gap.id, where: section.kind === 'chapter' ? `Chapter ${section.n}` : section.title, roomMm: Math.round(gap.room), filled: Boolean(html)});
  }
  return out;
}

// ---------- the book ----------
function splitSections(tokens) {
  const sections = [];
  let current = null;
  for (const t of tokens) {
    if (t.type === 'heading' && t.depth <= 2) {
      const title = plain(inline(t.text));
      const chapter = /^chapter\s+(\d+)\s*[:.]?\s*(.*)$/i.exec(title);
      current = {title, tokens: [], kind: chapter ? 'chapter' : /^(table of )?contents$/i.test(title) ? 'contents' : /^(sources|references)\b/i.test(title) ? 'sources' : /^(a )?(last|final|closing) word\b/i.test(title) ? 'closing' : 'plain'};
      if (chapter) { current.n = Number(chapter[1]); current.name = chapter[2] || title; }
      sections.push(current);
    } else if (t.type !== 'space') {
      if (!current) { current = {title: '', tokens: [], kind: 'plain'}; sections.push(current); }
      current.tokens.push(t);
    }
  }
  return sections.filter(s => s.kind !== 'contents' && (s.kind !== 'plain' || s.tokens.length));
}

function sourcesHTML(section) {
  const lines = [];
  for (const t of section.tokens) {
    if (t.type === 'paragraph') lines.push(...t.text.split(/\n+/));
    else if (t.type === 'list') lines.push(...t.items.map(item => item.text));
  }
  const items = lines.map(x => x.trim()).filter(Boolean).map(line => {
    const m = /^\[?S(\d+)\]?[.:)]?\s+(.*)$/i.exec(line);
    const text = inline(m ? m[2] : line).replace(/<a /g, '<a class="url" ');
    return m ? `<p class="source" id="src-${m[1]}"><span class="src-n">${m[1]}</span>${text}</p>` : `<p class="source">${text}</p>`;
  });
  return `<section class="sources" id="${section.id}" style="page:${section.page}"><h2>${heading(esc(section.title))}</h2><p class="sources-note">The small raised numbers in the text point to this list.</p><div class="sources-list">${items.join('')}</div></section>`;
}

export function buildBook({title, subtitle = '', author = '', tagline = '', badge = '', parts = [], coverDataUrl = '', highlights = [], pageSize = 'Book', pageNumbers = {}, fill = {}, gaps = {}}) {
  if (!title) throw new Error('Give the book a title.');
  if (!Array.isArray(parts) || !parts.length) throw new Error('Give at least one Markdown part.');
  const size = PAGE_SIZES[pageSize] ? pageSize : 'Book';
  const [pageW, pageH, sizeRule] = PAGE_SIZES[size];
  const sections = splitSections(parts.flatMap(part => [...marked.lexer(String(part || ''), {gfm: true})]));
  const chapters = sections.filter(s => s.kind === 'chapter');
  let plainCount = 0;
  for (const s of sections) {
    s.id = s.kind === 'chapter' ? `ch-${s.n}` : s.kind === 'sources' ? 'sources' : s.kind === 'closing' ? 'closing' : `sec-${++plainCount}`;
    s.page = s.kind === 'closing' ? 'closing' : `p-${s.id}`;
  }
  // Section titles that repeat in most chapters (like a "Say this, not that" table) stay off the opener lists.
  const counts = new Map();
  for (const c of chapters) for (const t of c.tokens) if (t.type === 'heading' && t.depth === 3) { const k = plain(inline(t.text)).toLowerCase(); counts.set(k, (counts.get(k) || 0) + 1); }
  const repeated = k => chapters.length >= 4 && (counts.get(k) || 0) >= chapters.length / 2;

  const ctx = {prints: [], longLists: []};
  const ends = [];
  const report = {gaps: [], facts: {}, notes: []};
  const probeIds = [];
  const body = sections.map((s, index) => {
    Object.assign(ctx, {section: s.id, name: s.kind === 'chapter' ? `Chapter ${s.n}` : s.title, gapFill: {}});
    if (s.kind === 'sources') return sourcesHTML(s);
    if (s.kind === 'closing') return `<section class="closing" id="${s.id}"><h2>${heading(esc(s.title))}</h2>${renderBlocks(s.tokens, ctx)}</section>`;
    if (s.kind === 'plain') return `<section class="part" id="${s.id}" style="page:${s.page};break-before:page"><div class="flow">${s.title ? `<h2 class="plain-head">${heading(esc(s.title))}</h2>` : ''}${renderBlocks(s.tokens, ctx)}</div></section>`;
    const facts = takeFacts(s.tokens);
    const body = s.tokens.filter(t => labelOf(t)?.kind !== 'facts');
    if (labelOf(body[0])?.kind !== 'short') report.notes.push(`Chapter ${s.n} does not start with "> The short version:".`);
    if (labelOf(body[body.length - 1])?.kind !== 'remember') report.notes.push(`Chapter ${s.n} does not end with "> Remember:" (the Facts block may come after it).`);
    const tokens = s.tokens.filter(t => labelOf(t)?.kind !== 'facts');
    report.facts[`Chapter ${s.n}`] = facts.length;
    let short = '';
    if (labelOf(tokens[0])?.kind === 'short') { const first = tokens.shift(); short = boxParts(first, labelOf(first)).body; }
    const heads = tokens.filter(t => t.type === 'heading' && t.depth === 3).map(t => plain(inline(t.text))).filter(k => !repeated(k.toLowerCase()));
    const opener = `<section class="opener" id="${s.id}"><div class="opener-num">${String(s.n).padStart(2, '0')}</div><div class="opener-body"><p class="opener-label">Chapter ${s.n}</p><h2>${heading(esc(s.name))}</h2>${short ? `<div class="opener-short">${short}</div>` : ''}</div>${heads.length >= 3 ? `<div class="opener-list"><p>In this chapter</p><ul>${heads.slice(0, 12).map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>` : ''}</section>`;
    // The chapter's "Remember" box closes it: a pine panel that runs to the foot of the page.
    let recap = '';
    if (labelOf(tokens[tokens.length - 1])?.kind === 'remember') {
      const last = tokens.pop();
      const {body: inner} = boxParts(last, labelOf(last));
      const room = Number(fill[`end-${s.id}`]) || 0;
      // Pick the largest setting whose text is sure to fit in the room (heights estimated from the wording).
      const texts = (/<li>/.test(inner) ? listItems(inner) : [inner]).map(item => plain(item).replace(/\s*\[S\d[^\]]*\]/g, ''));
      const need = (perLine, line, pad, fixed) => fixed + texts.reduce((sum, text) => sum + Math.ceil(text.length / perLine) * line + pad, 0);
      const sizeClass = !room ? '' : room >= need(42, 6.8, 10.8, 78) ? ' big' : room >= need(54, 5.7, 6, 54) ? ' mid' : room >= need(54, 5.7, 6, 42) ? ' mid slim' : room >= need(70, 5.1, 3.8, 30) ? ' foot' : '';
      ends.push(`end-${s.id}`);
      const next = sections.slice(index + 1).find(x => x.kind === 'chapter' || x.kind === 'closing');
      const pointer = next ? `<div class="recap-next">Next<a href="#${next.id}">${next.kind === 'chapter' ? `Chapter ${next.n}: ${esc(next.name)}` : esc(next.title)}</a></div>` : '<div></div>';
      recap = `<div class="recap${sizeClass}" id="end-${s.id}"${room ? ` style="min-height:${room.toFixed(1)}mm"` : ''}><p class="recap-title">${esc(labelOf(last).name)}</p>${/<li>/.test(inner) ? `<ul>${listItems(inner).map(item => `<li>${item}</li>`).join('')}</ul>` : inner}<div class="recap-foot">${pointer}<div class="recap-num">${String(s.n).padStart(2, '0')}</div></div></div>`;
    }
    // a dry run collects each block's words, so a fact is not set beside the passage it repeats
    const dry = {...ctx, prints: [...ctx.prints], longLists: [], texts: {}};
    if (Object.keys(gaps).some(id => id.startsWith(`g-${s.id}-`))) renderBlocks(tokens, dry);
    ctx.gapFill = fillGaps(s, facts, gaps, report, dry.texts);
    return `${opener}<section class="chapter" style="page:${s.page}"><div class="flow">${renderBlocks(tokens, ctx)}${recap}</div></section>`;
  }).join('\n');

  // running heads stay on one line: long titles are cut at a word
  const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}\u2026`);
  const runningHeads = sections.filter(s => s.kind !== 'closing').map(s => ({page: s.page, text: clip(s.kind === 'chapter' ? `Chapter ${s.n}: ${s.name}` : s.title, 52)}));
  const page = id => (pageNumbers[id] ? String(pageNumbers[id]) : '');
  const tocRow = (id, n, text, minor = false) => `<li${minor ? ' class="minor"' : ''}><a href="#${id}"><span class="toc-n">${n}</span><span class="toc-t">${text}</span><span class="toc-dots"></span><span class="toc-p">${page(id)}</span></a></li>`;
  const toc = sections.map(s => tocRow(s.id, s.kind === 'chapter' ? String(s.n).padStart(2, '0') : '', esc(s.kind === 'chapter' ? s.name : s.title), s.kind !== 'chapter')).join('');
  const prints = ctx.prints.length ? `<p class="toc-sub">Pages to print</p><ol class="prints">${ctx.prints.map(p => tocRow(p.id, ICONS.print, esc(p.title))).join('')}</ol>` : '';
  const sealMatch = /^(.*?)(\d[\d,]*)\s*(.*)$/.exec(badge);
  const seal = !badge ? '' : sealMatch ? `<div class="seal">${sealMatch[1].trim() ? `<div class="seal-top">${esc(sealMatch[1].trim())}</div>` : ''}<div class="seal-num">${esc(sealMatch[2])}</div><div class="seal-text">${esc(sealMatch[3].trim())}</div></div>` : `<div class="seal"><div class="seal-text">${esc(badge)}</div></div>`;
  const inside = (Array.isArray(highlights) && highlights.length ? highlights : [chapters.length >= 2 ? `${chapters.length} short chapters` : '', ctx.prints.length ? `${(body.match(/class="(worksheet|plan-page)"/g) || []).length} pages to print` : '', 'Every fact sourced']).map(x => String(x || '').trim()).filter(Boolean).slice(0, 3);
  const titleSize = title.length <= 20 ? '' : title.length <= 34 ? ' t2' : ' t3';
  const probes = `<div class="probes">${['cal-top', ...ends].map(id => `<a href="#${id}"></a>`).join('')}</div>`;
  const cover = `<section class="cover"><div class="cover-photo"${coverDataUrl ? ` style="background-image:url('${coverDataUrl}')"` : ''}></div><div class="cover-band"></div>${seal}<div class="cover-text"><div class="cover-title${titleSize}">${esc(title)}</div>${subtitle ? `<p class="cover-sub">${esc(subtitle)}</p>` : ''}${tagline ? `<p class="cover-tag">${esc(tagline)}</p>` : ''}${author ? `<p class="cover-by">${esc(author)}</p>` : ''}</div>${inside.length ? `<div class="cover-inside">${inside.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}${probes}</section>`;
  const titlePage = `<section class="title-page"><div><span id="cal-top"></span><p class="tp-title">${esc(title)}</p>${subtitle ? `<p class="tp-sub">${esc(subtitle)}</p>` : ''}<div class="tp-rule"></div></div><div class="tp-foot">${author ? `<p>${esc(author)}</p>` : ''}${badge ? `<p>${esc(badge)}. Every fact in this book carries a small number that links to its source at the back.</p>` : ''}</div></section>`;
  const content = smartQuotes(`${cover}\n${titlePage}\n<nav class="toc"><h2>Contents</h2><ol>${toc}</ol>${prints}</nav>\n<main>${cite(clean(body))}</main>`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${styleCSS({pageW, pageH, sizeRule, title: clip(title, 46), runningHeads})}</style></head><body>\n${content}\n</body></html>`;
  report.chapters = chapters.length;
  report.pagesToPrint = (body.match(/class="(worksheet|plan-page)"/g) || []).length;
  report.unfilledGaps = report.gaps.filter(g => !g.filled).length;
  report.listsTooLongForOnePage = [...new Set(ctx.longLists)];
  return {html, report};
}
export const bookHTML = options => buildBook(options).html;

// Plain instructions for the bot that wrote the book: what to change in the Markdown before running make_book again.
export function bookToFix(report, printed = true) {
  const out = [...(report.notes || [])];
  for (const [chapter, count] of Object.entries(report.facts || {})) if (count < 5) out.push(`${chapter} has ${count} spare facts. Add a "> Facts:" block with at least 5 short, sourced facts taken from that chapter.`);
  const empty = {};
  for (const gap of report.gaps || []) if (!gap.filled) (empty[gap.where] ||= []).push(gap.roomMm);
  for (const [where, rooms] of Object.entries(empty)) out.push(`${where} still has ${rooms.length} empty space${rooms.length > 1 ? 's' : ''} (${rooms.join(', ')} mm high) and no spare fact that fits. Add ${rooms.length + 1} more facts to its "> Facts:" block${rooms.some(r => r < 24) ? ', at least one of them under 60 characters' : ''}.`);
  for (const where of report.listsTooLongForOnePage || []) out.push(`${where} has a list or set of steps too long for one page. Split it into two shorter lists, each under its own heading.`);
  const check = report.check;
  if (check?.listsSplit) out.push(`A list, box or table is split across two pages in ${check.listsSplitIn.join(', ')}. Make it shorter, or split it into two under their own headings.`);
  if (printed && report.measured === false) out.push('Toby could not measure this PDF, so page numbers, spare facts and stretched chapter endings are missing. Run make_book once more; if this message comes back, tell Toby.');
  if (printed && report.layoutHeld === false) out.push('The layout would not settle, so this PDF has no spare facts or stretched chapter endings. Run make_book once more; if this message comes back, tell Toby.');
  return out;
}

// Ids whose page numbers the contents page shows; make_book reads them from a first print.
export const TOC_ID = /^(ch-\d+|sec-\d+|ws-\d+|sources|closing)$/;
// Ids of the chapter-end panels; make_book measures the room under each and passes it back as "fill".
export const END_ID = /^end-ch-\d+$/;
const MARK_ID = /^g-((?:ch|sec)-\d+)-(\d+)-([sfp])$/;
const HEAD_MM = 23, FOOT_MM = 20;   // the top and bottom page margins in book-style.mjs
// From a first print's link targets ({name: {page, top}} with top in points from the foot of the page):
// the page numbers for the contents page, and the room in millimetres under each chapter-end panel.
// The title page carries a marker at a known height, so any offset in the printer's numbers cancels out.
export function layoutFromDests(dests, pageSize = 'Book', links = {}) {
  const pageNumbers = {}, fill = {}, gaps = {};
  const mm = points => points * 25.4 / 72;
  const pageH = parseFloat((PAGE_SIZES[pageSize] || PAGE_SIZES.Book)[1]);
  const bodyH = pageH - HEAD_MM - FOOT_MM;
  const marker = dests?.['cal-top'];
  const offset = marker && typeof marker.top === 'number' ? mm(marker.top) - (pageH - HEAD_MM) : null;
  const sections = {};
  for (const [name, dest] of Object.entries(dests || {})) {
    if (TOC_ID.test(name)) pageNumbers[name] = dest.page;
    else if (END_ID.test(name) && offset !== null && typeof dest.top === 'number') {
      // A panel that starts a page keeps its top margin in the printer's sums, so leave room for it.
      const room = Math.min(mm(dest.top) - offset - FOOT_MM - 1.5, bodyH - 9);
      if (room > 20) fill[name] = Math.round(room * 10) / 10;
    } else {
      const m = MARK_ID.exec(name);
      // The block's last link is the probe at its foot (links inside the block come before it).
      const foot = (links[name] || []).filter(link => link.width < 4).sort((a, b) => b.page - a.page || a.bottom - b.bottom)[0];
      if (m && foot) (sections[m[1]] ||= []).push({name, n: Number(m[2]), kind: m[3], solid: m[3] !== 'f', page: dest.page, endPage: foot.page, bottom: foot.bottom});
    }
  }
  // A whole block (a list, a box, a table, a heading with its text) that did not fit was pushed to the next page.
  // The block before it ends where the empty room starts.
  const note = (name, block) => { const room = mm(block.bottom) - FOOT_MM - 8.5; if (room >= 11.5 && room <= bodyH - 20) gaps[name] = Math.round(room * 10) / 10; };
  const split = [];
  for (const [section, list] of Object.entries(sections)) {
    list.sort((a, b) => a.n - b.n);
    for (const block of list) if (block.kind === 's' && block.endPage !== block.page) split.push({section, page: block.page});
    list.forEach((block, i) => {
      const next = list[i + 1];
      if (next && next.solid && next.page > block.endPage) note(next.name, block);
      if (!next && (!dests[`end-${section}`] || dests[`end-${section}`].page > block.endPage)) note(`g-${section}-end`, block);
    });
  }
  return {pageNumbers, fill, gaps, split};
}

// Prints the book until the layout holds still. print(html) must return the PDF bytes.
// First print: plain. Second: with page numbers, chapter-end panels stretched and spare facts in the gaps.
// If anything moved to another page, the changes in the first section that moved are dropped and it prints again.
export async function layoutBook(options, print, readDests, readLinks = () => ({})) {
  const firstPdf = await print(buildBook(options).html);
  const first = readDests(firstPdf);
  const {split: _unused, ...layout} = layoutFromDests(first, options.pageSize, readLinks(firstPdf));
  const watched = Object.keys(first).filter(name => TOC_ID.test(name) || END_ID.test(name) || MARK_ID.test(name));
  const where = section => (/^ch-(\d+)$/.test(section) ? `Chapter ${section.slice(3)}` : 'the opening pages');
  // The last word goes to the finished PDF itself: is any whole block split, is any room left empty?
  const inspect = (pdf, built) => {
    const final = layoutFromDests(readDests(pdf), options.pageSize, readLinks(pdf));
    const filled = new Set(built.report.gaps.filter(g => g.filled).map(g => g.id));
    const empty = Object.entries(final.gaps).filter(([id]) => !filled.has(id) && /^g-ch-/.test(id));
    return {
      blocksMeasured: watched.filter(name => MARK_ID.test(name)).length,
      listsSplit: final.split.length, listsSplitIn: [...new Set(final.split.map(x => `${where(x.section)} (page ${x.page})`))],
      emptySpaces: empty.length, emptySpacesMm: empty.map(([, room]) => Math.round(room)),
    };
  };
  let prints = 1;
  for (let attempt = 0; attempt < 4; attempt++) {
    const built = buildBook({...options, ...layout});
    const pdf = await print(built.html);
    prints++;
    const now = readDests(pdf);
    const moved = watched.filter(name => now[name]?.page !== first[name].page);
    if (!moved.length) return {pdf, html: built.html, report: {...built.report, pages: Math.max(0, ...Object.values(now).map(d => d.page)), prints, layoutHeld: true, measured: Boolean(first['cal-top']), check: inspect(pdf, built)}};
    const sectionOf = name => (/^g-(.+)-(?:\d+-[sfp]|end)$/.exec(name) || [])[1] || name.replace(/^end-/, '');
    const bad = attempt < 2 ? sectionOf(moved.sort((a, b) => first[a].page - first[b].page)[0]) : null;
    for (const key of Object.keys(layout.gaps)) if (!bad || sectionOf(key) === bad) delete layout.gaps[key];
    for (const key of Object.keys(layout.fill)) if (!bad || sectionOf(key) === bad) delete layout.fill[key];
  }
  const built = buildBook({...options, pageNumbers: layout.pageNumbers});
  const pdf = await print(built.html);
  return {pdf, html: built.html, report: {...built.report, prints: prints + 1, layoutHeld: false, measured: Boolean(first['cal-top']), check: inspect(pdf, built)}};
}

export function imageDataUrl(bytes, name) {
  const ext = String(name).toLowerCase().split('.').pop();
  const type = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'}[ext];
  if (!type) throw new Error('Images must be PNG, JPEG or WebP.');
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}
