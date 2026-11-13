// Toby: assemble a designed, print-ready ebook from Markdown parts in the team folder.
// Bots write chapters as Markdown with a few labelled blocks; this turns them into one
// self-contained HTML book (cover, contents, chapter openers, visual blocks, tables, sources)
// that make_pdf prints with Chromium. No scripts: everything is static HTML and CSS.
import {marked} from 'marked';
import {THEMES, themeCSS, boxIcon} from './book-themes.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip = html => String(html).replace(/<[^>]+>/g, '');
const slug = value => strip(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
const cite = html => html.replace(/\[(S\d+(?:\s*,\s*S\d+)*)\]/g, '<span class="cite">[$1]</span>');
const clean = html => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+="[^"]*"/gi, '');
const listItems = html => (html.match(/<li>[\s\S]*?<\/li>/g) || []).map(li => li.replace(/^<li>|<\/li>$/g, '').trim());
const withoutList = html => html.replace(/<(ol|ul)>[\s\S]*<\/\1>/, '').trim();

export const PAGE_SIZES = {Book: ['177.8mm', '254mm', '7in 10in'], Letter: ['215.9mm', '279.4mm', 'Letter'], A4: ['210mm', '297mm', 'A4'], A5: ['148mm', '210mm', 'A5']};
export const THEME_NAMES = Object.keys(THEMES);

// Labelled boxes: "> Label: text". Colour boxes keep their colour; visual blocks get their own layout.
const BOXES = {
  'the short version': 'short', 'try tonight': 'try', 'try this': 'try', 'remember': 'remember',
  'safety note': 'safety', 'red flag': 'red', 'tip': 'tip',
};
const VISUAL = {stat: 'stat', steps: 'steps', before: 'before', after: 'after', checklist: 'checklist', timeline: 'timeline', quote: 'quote', 'key idea': 'key-idea'};

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

// A blockquote's content without its leading "Label:" text.
function boxBody(token, label) {
  const tokens = structuredClone(token.tokens);
  const first = tokens.find(t => t.type === 'paragraph');
  const index = tokens.indexOf(first);
  const rest = (first.raw || first.text).slice(label.skip).trim();
  if (rest) tokens.splice(index, 1, ...marked.lexer(rest).filter(t => t.type !== 'space'));
  else tokens.splice(index, 1);
  return marked.parser(tokens);
}

function renderBox(token, label) {
  const body = boxBody(token, label);
  switch (label.kind) {
    case 'stat': {
      const inner = body.replace(/^\s*<p>|<\/p>\s*$/g, '');
      const cut = inner.indexOf('|');
      const number = cut >= 0 ? strip(inner.slice(0, cut)).trim() : strip(inner).trim().split(/\s+/)[0];
      const caption = cut >= 0 ? inner.slice(cut + 1).trim() : inner.slice(inner.indexOf(number) + number.length).trim();
      return `<div class="stat"><div class="stat-number">${esc(number)}</div><div class="stat-caption">${caption}</div></div>`;
    }
    case 'steps': {
      const intro = withoutList(body);
      const steps = listItems(body).map((item, i) => `<div class="step"><div class="step-n">${i + 1}</div><div class="step-t">${item}</div></div>`);
      return `<div class="steps">${intro ? `<div class="steps-intro">${intro}</div>` : ''}<div class="steps-row n${steps.length > 4 ? 5 : steps.length}">${steps.join('')}</div></div>`;
    }
    case 'checklist': {
      const items = listItems(body).map(item => `<li><span class="tick"></span><span>${item}</span></li>`);
      return `<div class="checklist"><p class="box-label">${esc(label.name)}</p>${withoutList(body)}<ul>${items.join('')}</ul></div>`;
    }
    case 'timeline': {
      const items = listItems(body).map(item => {
        const m = /^(?:<strong>)?([^:<]{1,40}):(?:<\/strong>)?\s*([\s\S]*)$/.exec(item);
        return m ? `<div class="tl-item"><div class="tl-when">${m[1]}</div><div class="tl-what">${m[2]}</div></div>` : `<div class="tl-item"><div class="tl-what">${item}</div></div>`;
      });
      const intro = withoutList(body);
      return `<div class="timeline">${intro ? `<div class="tl-intro">${intro}</div>` : ''}${items.join('')}</div>`;
    }
    case 'quote': return `<blockquote class="pull">${body}</blockquote>`;
    case 'key-idea': return `<div class="key-idea"><p class="box-label">Key idea</p>${body}</div>`;
    case 'before': case 'after':
      return `<div class="ba-side ba-${label.kind}"><p class="box-label">${esc(label.name)}</p>${body}</div>`;
    default:
      return `<blockquote class="box box-${label.kind}">${boxIcon(label.kind)}<p class="box-label">${esc(label.name)}</p>${body}</blockquote>`;
  }
}

function table(t) {
  const html = marked.parser([t]);
  const small = t.rows.length <= 8;
  const blankRows = t.rows.filter(r => r.slice(1).every(c => !strip(c.text).trim())).length;
  const fill = t.rows.length >= 3 && blankRows >= t.rows.length * 0.6;
  return html.replace('<table>', `<table class="${small ? 'small' : 'long'}${fill ? ' fill-in' : ''}">`);
}

function block(t) {
  if (t.type === 'blockquote') { const label = labelOf(t); return label ? renderBox(t, label) : `<blockquote class="box box-plain">${marked.parser(t.tokens)}</blockquote>`; }
  if (t.type === 'table') return table(t);
  return marked.parser([t]);
}

const leadsIn = (t, next) => t?.type === 'paragraph' && /:\s*$/.test(t.text) && next && ((next.type === 'list' && next.items.length <= 8) || (next.type === 'table' && next.rows.length <= 8));

// Turn the token stream into HTML, grouping blocks that must stay on the same page.
function renderTokens(tokens, state) {
  const out = [];
  const list = tokens.filter(t => t.type !== 'space');
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.type === 'heading' && t.depth <= 2) {
      const text = marked.parseInline(t.text);
      const plain = strip(text).trim();
      if (/^(table of )?contents$/i.test(plain)) { // the book makes its own contents page
        while (i + 1 < list.length && !(list[i + 1].type === 'heading' && list[i + 1].depth <= 2)) i++;
        continue;
      }
      const id = slug(plain) + '-' + state.toc.length;
      const chapter = /^chapter\s+(\d+)\s*[:.]?\s*(.*)$/i.exec(plain);
      state.inSources = /^(sources|references)\b/i.test(plain);
      if (chapter) {
        const n = chapter[1], name = chapter[2] || plain;
        state.toc.push({id, number: n, title: name});
        const art = state.chapterImages[String(Number(n))];
        let short = '';
        const next = list[i + 1];
        if (labelOf(next)?.kind === 'short') { short = boxBody(next, labelOf(next)); i++; }
        out.push(state.theme.opener({n, name, art, short}).replace('<section class="page-opener"', `<section id="${id}" class="page-opener"`));
        state.dropNext = true;
      } else {
        state.toc.push({id, number: '', title: plain});
        out.push(`<h2 id="${id}" class="section-open">${text}</h2>`);
      }
      continue;
    }
    if (state.inSources && t.type === 'paragraph') {
      out.push(t.text.split(/\n+/).map(x => x.trim()).filter(Boolean).map(line => `<p class="source">${marked.parseInline(line).replace(/<a /g, '<a class="url" ')}</p>`).join(''));
      continue;
    }
    if (state.inSources && t.type === 'list') { out.push(`<div class="source-list">${marked.parser([t]).replace(/<a /g, '<a class="url" ')}</div>`); continue; }
    if (t.type === 'blockquote') {
      const label = labelOf(t);
      if (label?.kind === 'stat') {
        const group = [renderBox(t, label)];
        while (labelOf(list[i + 1])?.kind === 'stat' && group.length < 3) { i++; group.push(renderBox(list[i], labelOf(list[i]))); }
        out.push(`<div class="stats n${group.length}">${group.join('')}</div>`);
        continue;
      }
      if (label?.kind === 'before' && labelOf(list[i + 1])?.kind === 'after') {
        out.push(`<div class="ba">${renderBox(t, label)}<div class="ba-arrow">&#8594;</div>${renderBox(list[i + 1], labelOf(list[i + 1]))}</div>`);
        i++;
        continue;
      }
      out.push(block(t));
      continue;
    }
    if (t.type === 'heading' && t.depth >= 3) { out.push(marked.parser([t]).replace(/^<h(\d)>/, '<h$1 class="kw">')); continue; }
    if (t.type === 'paragraph' && state.dropNext) { state.dropNext = false; out.push(marked.parser([t]).replace(/^<p>/, '<p class="drop">')); continue; }
    if (leadsIn(t, list[i + 1])) { out.push(`<div class="keep">${block(t)}${block(list[++i])}</div>`); continue; }
    if (t.type === 'paragraph' && /:\s*$/.test(t.text)) { out.push(marked.parser([t]).replace(/^<p>/, '<p class="kw">')); continue; }
    out.push(block(t));
  }
  return out.join('\n');
}

export function bookHTML({title, subtitle = '', author = '', tagline = '', badge = '', parts = [], coverDataUrl = '', chapterImages = {}, theme = 'warm', pageSize = 'Book'}) {
  if (!title) throw new Error('Give the book a title.');
  if (!Array.isArray(parts) || !parts.length) throw new Error('Give at least one Markdown part.');
  const look = THEMES[theme] || THEMES.warm;
  const size = PAGE_SIZES[pageSize] ? pageSize : 'Book';
  const [pageW, pageH, sizeRule] = PAGE_SIZES[size];
  const state = {toc: [], inSources: false, chapterImages, theme: look, dropNext: false};
  const body = parts.map(part => { state.inSources = false; return renderTokens(marked.lexer(String(part || ''), {gfm: true}), state); }).join('\n');
  const html = cite(clean(body));
  const toc = state.toc.map(item => `<li><a href="#${item.id}"><span class="toc-n">${item.number ? esc(String(item.number).padStart(2, '0')) : ''}</span><span class="toc-t">${esc(item.title)}</span><span class="dots"></span></a></li>`).join('');
  const titlePage = `<section class="title-page"><p class="tp-title">${esc(title)}</p>${subtitle ? `<p class="tp-sub">${esc(subtitle)}</p>` : ''}<div class="tp-rule"></div>${tagline || badge ? `<p class="tp-note">${esc([tagline, badge].filter(Boolean).join('. '))}${/[.!?]$/.test(badge || tagline) ? '' : '.'}</p>` : ''}${author ? `<p class="tp-note">${esc(author)}</p>` : ''}</section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${themeCSS(look, {pageW, pageH, pageSize: sizeRule, title})}</style></head><body>
${look.cover({title, subtitle, tagline, badge, author, coverDataUrl})}
${titlePage}
<nav class="toc"><h2>Contents</h2><ol>${toc}</ol></nav>
<main>${html}</main>
</body></html>`;
}

export function imageDataUrl(bytes, name) {
  const ext = String(name).toLowerCase().split('.').pop();
  const type = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'}[ext];
  if (!type) throw new Error('Images must be PNG, JPEG or WebP.');
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}
