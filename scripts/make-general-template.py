import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(o, n, count=1):
    global s
    c = s.count(o)
    if c != count: raise SystemExit(f'expected {count}, found {c}: {o[:90]!r}')
    s = s.replace(o, n)

# ---- the Track tab gets a chart icon (the first app's was a water drop) ----
rep("""  track: I('<path d="M12 3.2c3.2 4 5.6 6.900 5.600 10.200a5.600 5.600 0 0 1-11.200 0c0-3.300 2.400-6.200 5.600-10.200z"/><path d="M9.300 14.200a2.800 2.800 0 0 0 2.300 2.500"/>'),""",
    """  track: I('<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-7"/>'),""")

# ---- state and backup codes ----
rep("const blank = () => ({ v: 1, name: '', start: '', seen: false, days: {}, potty: [], skills: {}, planner: {}, social: {}, list: [], read: {}, tried: {}, checks: {}, updated: 0 });",
    "const blank = () => ({ v: 1, name: '', start: '', seen: false, days: {}, skills: {}, planner: {}, list: [], read: {}, tried: {}, checks: {}, updated: 0 });")
rep("function encodeState() { return 'F30.' +", "const CODE = 'BP1.';\nfunction encodeState() { return CODE +")
rep("replace(/^.*F30\\./s, '')", "replace(/^.*BP1\\./s, '')")
rep("""  for (const k of ['potty', 'list']) { const have = new Set(S[k].map((e) => e.id)); for (const e of o[k]) if (!have.has(e.id)) S[k].push(e); }""",
    """  { const have = new Set(S.list.map((e) => e.id)); for (const e of o.list || []) if (!have.has(e.id)) S.list.push(e); }""")
rep("""  for (const x in o.social) { const a = S.social[x] || {}, b = o.social[x] || {}; S.social[x] = { date: a.date || b.date || '', feel: a.feel || b.feel || '', note: a.note || b.note || '' }; }
""", "")
rep("""  S.potty.sort((a, b) => a.t < b.t ? -1 : 1);
}""", "}")

# ---- plan length and weeks follow the book ----
rep("const WEEKS = [[1, 7], [8, 14], [15, 21], [22, 30]];",
    "const DAYS = BOOK.plan.length;\nconst WEEKS = Array.from({ length: Math.ceil(DAYS / 7) }, (_, w) => [w * 7 + 1, Math.min(DAYS, w * 7 + 7)]);\nconst HAS = { plan: DAYS > 0, tracker: !!BOOK.tools.tracker, planner: !!BOOK.tools.planner, stalls: !!BOOK.stalls, help: !!BOOK.whoToCall, facts: BOOK.facts.length > 0 };")
rep("const nextDay = () => { for (let d = 1; d <= 30; d++) if (!S.days[d]) return d; return 0; };",
    "const nextDay = () => { for (let d = 1; d <= DAYS; d++) if (!S.days[d]) return d; return 0; };")
rep("const RES = { wee: 'Wee', poo: 'Poo', both: 'Wee and poo', nothing: 'Nothing' };\nconst who = () => S.name ? esc(S.name) : 'your puppy';",
    "const who = () => S.name ? esc(S.name) : 'you';")

# ---- routing: tabs only for what the book has ----
rep("""const TABS = [['today', 'Today', IC.today], ['plan', 'Plan', IC.plan], ['potty', 'Track', IC.track], ['book', 'Read', IC.book], ['yours', 'Yours', IC.yours]];
const TRACK = [['potty', 'Potty log'], ['tracker', 'Try tracker'], ['planner', 'Weekly planner'], ['social', 'Socialising']];
const YOURS = [['list', 'Your list'], ['facts', 'Did you know?'], ['say', 'Say this, not that'], ['stalls', 'When it stalls'], ['help', 'Who to call'], ['sources', 'Sources'], ['backup', 'Backup and partner']];""",
"""const TRACK = [['tracker', 'Try tracker'], ['planner', 'Weekly planner']].filter(([id]) => HAS[id]);
const TABS = [['today', 'Today', IC.today], HAS.plan && ['plan', 'Plan', IC.plan], TRACK.length && ['track', 'Track', IC.track], ['book', 'Read', IC.book], ['yours', 'Yours', IC.yours]].filter(Boolean);
const YOURS = [['list', 'Your list'], ['facts', 'Did you know?'], ['say', 'Say this, not that'], ['stalls', 'When it stalls'], ['help', 'Who to call'], ['sources', 'Sources'], ['backup', 'Backup and partner']];""")
rep("""  if (TRACK.some((t) => t[0] === r)) return 'potty';""", """  if (r === 'track' || TRACK.some((t) => t[0] === r)) return 'track';""")

# ---- Today ----
a = s.index("V.today = () => {"); b = s.index("V.plan = () => {")
s = s[:a] + r"""V.today = () => {
  const n = nextDay(), p = BOOK.plan.find((x) => x.day === n), done = doneCount();
  const fact = HAS.facts ? BOOK.facts[(Math.floor(Date.now() / 864e5)) % BOOK.facts.length] : null;
  const nextCh = chapters.find((c) => !S.read[c.id]);
  const pips = BOOK.plan.map((x) => `<i class="${S.days[x.day] ? 'on' : x.day === n ? 'now' : ''}"></i>`).join('');
  let hero;
  if (HAS.plan && p) hero = `
    <section class="hero on-dark">
      <div class="numwrap"><div class="of">Day</div><div class="num">${n}</div></div>
      <div>
        <h2>${fmt(p.focus)}</h2>
        <p class="txt">${fmt(p.text)}</p>
        <div class="row"><button class="btn gold" data-act="day" data-d="${n}">${IC.check} Tick off day ${n}</button><button class="btn small line" data-go="plan" style="background:var(--deep);color:#fff;border-color:var(--pine)">See all ${DAYS} days</button></div>
        <p class="quiet">If a day goes badly, repeat it. Nothing is lost.</p>
      </div>
      <div class="foot"><div class="pips" aria-label="${done} of ${DAYS} days ticked">${pips}</div><div class="weeklabels">${WEEKS.map((_, w) => `<span>Week ${w + 1}</span>`).join('')}</div></div>
    </section>`;
  else if (HAS.plan) hero = `
    <section class="hero on-dark">
      <div class="numwrap"><div class="of">All</div><div class="num">${DAYS}</div></div>
      <div><h2>Every day ticked</h2><p class="txt">The plan is done. Keep going at your own pace, and come back to any chapter whenever you need it.</p>
      <div class="row"><button class="btn gold" data-go="${chById('last-word') ? 'last-word' : 'book'}">${chById('last-word') ? 'Read the last word' : 'Back to the book'}</button></div></div>
      <div class="foot"><div class="pips">${pips}</div></div>
    </section>`;
  else hero = nextCh ? `
    <section class="hero on-dark">
      <div class="numwrap"><div class="of">Chapter</div><div class="num">${nextCh.num}</div></div>
      <div>
        <h2>${fmt(nextCh.title)}</h2>
        <p class="txt">${esc(plain(nextCh.short || ''))}</p>
        <div class="row"><button class="btn gold" data-go="${nextCh.id}">${IC.book} Start reading</button></div>
      </div>
    </section>` : '';
  return `<div class="col">
    ${storeOK ? '' : '<div class="notice bad">This browser is not saving. Your ticks will last only until you close this page. Take a backup code from Yours before you leave.</div>'}
    ${BOOK.sample ? `<div class="notice sample"><b>This is a sample.</b> It holds ${chapters.length} of the book’s ${chapters.length + BOOK.coming.length} chapters. <button class="linkbtn" data-go="book" style="padding:0">See what is in the full book</button></div>` : ''}
    <div class="hello"><div><h1>${S.name ? 'Hello, ' + esc(S.name) : esc(BOOK.title)}</h1>
      <p>${HAS.plan ? `${done} of ${DAYS} plan days ticked. ` : ''}${chapters.filter((c) => S.read[c.id]).length} of ${chapters.length} chapters read.</p></div>
      <button class="linkbtn" data-act="setup">${S.name ? 'Edit' : 'Add your name'}</button></div>
    ${hero}
    <div class="grid2">
      ${nextCh && HAS.plan ? `<section class="card"><button class="next-read" data-go="${nextCh.id}"><span class="n">${nextCh.num}</span><span><span style="color:var(--soft);font-size:13.5px;margin:0 0 2px">Next to read</span><b>${fmt(nextCh.title)}</b><span>${esc(plain(nextCh.short))}</span></span></button></section>` : ''}
      ${!HAS.plan ? `<section class="card"><h2>Your list</h2><p class="hint">Keep the things you want to remember: what to buy, what to try next, questions to ask.</p><button class="linkbtn" data-go="list">Open your list ${IC.fwd}</button></section>` : ''}
      ${fact ? `<section class="fact on-gold">
        <h2>Did you know?</h2>
        <p>${fmt(fact.text)}</p>
        <div class="more"><button class="linkbtn" data-go="${fact.ch ? 'ch-' + fact.ch : 'facts'}">From chapter ${fact.ch} ${IC.fwd}</button></div>
      </section>` : ''}
    </div>
  </div>`;
};

""" + s[b:]

# ---- Plan view ----
rep("""  return `<div class="col"><div class="pagehead"><h1>Your 30 day plan</h1><p>${done} of 30 ticked. Follow the days in order, or pick up where you are. It is an example, not a rule.</p></div>""",
    """  return `<div class="col"><div class="pagehead"><h1>Your ${DAYS} day plan</h1><p>${done} of ${DAYS} ticked. Follow the days in order, or pick up where you are. It is an example, not a rule.</p></div>""")

# ---- remove potty and social views ----
a = s.index("let pottyDay = null;\nV.potty = () => {"); b = s.index("V.tracker = () => {")
s = s[:a] + "V.track = () => V[TRACK[0][0]]();\n\n" + s[b:]
a = s.index("V.social = () => {"); b = s.index("V.book = () => {")
s = s[:a] + s[b:]
rep("""<p>Tick a week when ${who()} does the step calmly, three times in a row. ${n} of ${total} ticked.</p>""",
    """<p>Tick a week when you have done the step, three times in a row. ${n} of ${total} ticked.</p>""")
rep("""<p>Fill this in for your own week. Mark when a helper comes and when you practise alone time. It saves as you type.</p>""",
    """<p>Fill this in for your own week. It saves as you type.</p>""")

# ---- Read: the sample's chapters still to come ----
rep("""  <div class="toc">${BOOK.chapters.map(row).join('')}<button data-go="sources">""",
    """  <div class="tocwrap ${BOOK.coming.length ? 'has-coming' : ''}"><div class="toc" style="--rows:${Math.ceil((BOOK.chapters.length + 1) / 2)}">${BOOK.chapters.map(row).join('')}<button data-go="sources">""")
rep("""  .bookgrid .toc{margin-top:0;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(8,minmax(0,1fr));overflow:auto}""",
    """  .bookgrid .tocwrap{display:flex;flex-direction:column;gap:16px;min-height:0;overflow:auto}
  .bookgrid .toc{flex:1;margin-top:0;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(var(--rows,8),minmax(0,1fr));overflow:auto}
  .bookgrid .tocwrap.has-coming .toc{flex:none;grid-template-rows:none;overflow:visible}
  .bookgrid .tocwrap.has-coming .toc button{padding:14px 16px}
  .bookgrid .comingsoon{margin:0;flex:none}""")
rep("""<span class="s">All ${BOOK.sources.length}, numbered, with links you can open.</span></span></button></div></div>`;""",
    """<span class="s">All ${BOOK.sources.length}, numbered, with links you can open.</span></span></button></div>${BOOK.coming.length ? `<div class="comingsoon" id="coming"><h2>In the full book</h2><p>This sample holds ${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'}. The full book adds these:</p>${BOOK.coming.map((c) => `<div class="soon"><span class="n">${c.num}</span><b>${fmt(c.title)}</b></div>`).join('')}</div>` : ''}</div></div>`;""")

# ---- chapter blocks: plan and tool cards ----
rep("""      case 'plan': out.push(`<div class="toolcard"><div><b>Your 30 day plan</b><span>All 30 days, with a tick for each one. ${doneCount()} ticked so far.</span></div><button class="btn" data-go="plan">Open the plan</button></div>`); break;""",
    """      case 'plan': out.push(`<div class="toolcard"><div><b>Your ${DAYS} day plan</b><span>All ${DAYS} days, with a tick for each one. ${doneCount()} ticked so far.</span></div><button class="btn" data-go="plan">Open the plan</button></div>`); break;""")
rep("""      case 'tool': { const m = { potty: 'Log each trip in two taps and see the day as a pattern.', tracker: 'Tick each skill, week by week.', planner: 'Type your own week. It saves as you go.', list: 'Questions for the vet, numbers, things to buy.', social: 'Tick each new experience and note how it went.' };""",
    """      case 'tool': { const m = { tracker: 'Tick each step, week by week.', planner: 'Type your own week. It saves as you go.', list: 'Questions, numbers, things to buy.' };""")

# ---- Yours ----
rep("""  return `<div class="col"><div class="pagehead"><h1>Yours</h1><p>${S.name ? esc(S.name) + (S.start ? `, home since ${parseD(S.start).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}. ` : '. ') : ''}<button class="linkbtn" data-act="setup" style="padding:0">${S.name || S.start ? 'Edit puppy details' : 'Add your puppy’s name and start date'}</button></p></div>""",
    """  return `<div class="col"><div class="pagehead"><h1>Yours</h1><p>${S.name ? esc(S.name) + '. ' : ''}<button class="linkbtn" data-act="setup" style="padding:0">${S.name ? 'Edit your name' : 'Add your name'}</button></p></div>""")
rep("""    ${tile('stalls', IC.wrench, 'When it stalls', 'What you see, what to try')}
    ${tile('help', IC.phone, 'Who to call', 'Vet first, then who')}
    ${tile('say', IC.chat, 'Say this, not that', 'Every pair from the book')}
    ${tile('facts', IC.bulb, 'Did you know?', BOOK.facts.length + ' facts with sources')}""",
    """    ${HAS.stalls ? tile('stalls', IC.wrench, 'When it stalls', 'What you see, what to try') : ''}
    ${HAS.help ? tile('help', IC.phone, 'Who to call', 'Who helps with what') : ''}
    ${chapters.some((c) => c.blocks.some((x) => x.t === 'say')) ? tile('say', IC.chat, 'Say this, not that', 'Every pair from the book') : ''}
    ${HAS.facts ? tile('facts', IC.bulb, 'Did you know?', BOOK.facts.length + ' facts with sources') : ''}""")
rep("""<p class="hint" style="margin:18px 4px 0;color:var(--soft);font-size:13.5px;line-height:1.45">This app is general information, not veterinary, medical, legal or financial advice. It cannot know your puppy. If your puppy seems ill, hurt or very scared, call your vet.</p></div>`;""",
    """<p class="hint" style="margin:18px 4px 0;color:var(--soft);font-size:13.5px;line-height:1.45">${esc(BOOK.disclaimer || 'This app is general information, not medical, legal or financial advice. It cannot know your situation. If something feels unsafe, stop and ask a qualified person.')}</p></div>`;""")
rep("""<p>Anything you want to remember: questions for the vet, a class to book, a helper’s phone number, the cleaner you buy.</p>""",
    """<p>Anything you want to remember: things to buy, what to try next, questions to ask.</p>""")
rep("""V.stalls = () => `""", """V.stalls = () => !HAS.stalls ? V.yours() : `""")
rep("""V.help = () => { const ch = chById('ch-' + BOOK.whoToCall.chapter);""", """V.help = () => { if (!HAS.help) return V.yours(); const ch = chById('ch-' + BOOK.whoToCall.chapter);""")
rep("""<div class="pagehead"><h1>Who to call</h1><p>A vet is your first call for anything that looks like a health problem.</p></div>""",
    """<div class="pagehead"><h1>Who to call</h1><p>Who can help with what, from the book.</p></div>""")
rep("""<h2>Share with your partner</h2><p class="hint">Two phones, one puppy. Each phone keeps its own copy, and you can combine them whenever you like.</p>""",
    """<h2>Share with your partner</h2><p class="hint">Two phones, one plan. Each phone keeps its own copy, and you can combine them whenever you like.</p>""")
rep("""They paste it below on their phone and choose <strong>Add to mine</strong>. Ticks and log entries from both phones are kept.""",
    """They paste it below on their phone and choose <strong>Add to mine</strong>. Ticks and notes from both phones are kept.""")
rep("""placeholder="Paste a code that starts with F30." """, """placeholder="Paste a code that starts with BP1." """)
rep("""<p class="hint">Clears every tick, log entry and note on this device.</p>""", """<p class="hint">Clears every tick, list item and note on this device.</p>""")

# ---- shell ----
rep("""    <nav aria-label="Main">${TABS.map(([id, l, ic]) => `<button data-go="${id}" ${t === id && (id !== 'potty' && id !== 'yours' || route === id && id === 'yours') ? 'aria-current="page"' : ''}>${ic}${id === 'potty' ? 'Trackers' : l}</button>${id === 'potty' ? sub(TRACK) : ''}`).join('')}</nav>
    <div class="foot">${storeOK ? 'Saved on this device only.' : 'Not saving in this browser.'}<br>${doneCount()} of 30 days ticked.</div>`;""",
    """    <nav aria-label="Main">${TABS.map(([id, l, ic]) => `<button data-go="${id === 'track' ? TRACK[0][0] : id}" ${t === id && (id !== 'track' && id !== 'yours' || route === id && id === 'yours') ? 'aria-current="page"' : ''}>${ic}${id === 'track' ? 'Trackers' : l}</button>${id === 'track' ? sub(TRACK) : ''}`).join('')}</nav>
    <div class="foot">${storeOK ? 'Saved on this device only.' : 'Not saving in this browser.'}${HAS.plan ? `<br>${doneCount()} of ${DAYS} days ticked.` : ''}${BOOK.sample ? '<br>Sample edition.' : ''}</div>`;""")
rep("""  document.getElementById('tabs').innerHTML = TABS.map(([id, l, ic]) => `<button data-go="${id}" ${t === id ? 'aria-current="page"' : ''}><span class="ic">${ic}</span>${l}</button>`).join('');""",
    """  document.getElementById('tabs').innerHTML = TABS.map(([id, l, ic]) => `<button data-go="${id === 'track' ? TRACK[0][0] : id}" ${t === id ? 'aria-current="page"' : ''}><span class="ic">${ic}</span>${l}</button>`).join('');""")

# ---- setup sheet ----
a = s.index("function setupSheet(first) {"); b = s.index("/* ================= events ================= */")
s = s[:a] + r"""function setupSheet(first) {
  sheet(`<div class="welcome">${first ? `<div class="top"><img src="${COVER}" alt=""><div><h2>${esc(BOOK.title)}</h2><p class="lead" style="margin-top:4px">${BOOK.sample ? 'A sample of the book, with the chapters to read and a list that is yours.' : `The whole book${HAS.plan ? ', with a plan you tick' : ''}${TRACK.length ? ', trackers that save' : ''}, and a list that is yours.`}</p></div></div>` : '<h2>Your name</h2>'}
    <form data-form="setup" class="stack"><label class="field"><span>Your first name</span><input class="input" name="name" value="${esc(S.name)}" autocomplete="off" placeholder="Optional"></label>
    <div class="actions"><button type="button" class="btn line" data-act="skipsetup">${first ? 'Skip for now' : 'Cancel'}</button><button class="btn">${first ? 'Start' : 'Save'}</button></div></form>
    ${first ? '<p class="hint" style="color:var(--soft);font-size:13.5px;margin-top:14px">Saved on this device only. No account, nothing sent anywhere.</p>' : ''}</div>`, true);
}

""" + s[b:]

# ---- events ----
rep("""    case 'quick': S.potty.push({ id: uid(), t: new Date().toISOString(), where: 'out', res: d.r, reward: null, note: '' }); toast(`${RES[d.r]} logged at ${niceTime(new Date())}`); rer(); break;
    case 'padd': draft = null; pottySheet(); break;
    case 'draft': draft[d.k] = d.v === 'true' ? true : d.v === 'false' ? false : d.v; pottySheet(); break;
    case 'pdel': S.potty = S.potty.filter((x) => x.id !== d.id); rer(); break;
    case 'pday': { const x = parseD(pottyDay || today()); x.setDate(x.getDate() + (+d.step)); pottyDay = dkey(x) >= today() ? null : dkey(x); render(); break; }
""", "")
rep("""    case 'soc': { const s = S.social[d.i]; if (s && (s.feel || s.date)) delete S.social[d.i]; else S.social[d.i] = { date: today(), feel: '', note: '' }; rer(); break; }
    case 'feel': { const s = S.social[d.i] = S.social[d.i] || { date: today(), note: '' }; s.feel = s.feel === d.f ? '' : d.f; rer(); break; }
""", "")
rep("""    case 'close': closeLayer(); draft = null; break;""", """    case 'close': closeLayer(); break;""")
rep("""      const nd = Object.values(o.days).filter(Boolean).length, np = o.potty.length;
      const summary = `${nd} plan ${nd === 1 ? 'day' : 'days'} ticked and ${np} toilet ${np === 1 ? 'trip' : 'trips'}`;""",
    """      const nd = Object.values(o.days).filter(Boolean).length, nr = Object.values(o.read || {}).filter(Boolean).length;
      const summary = `${nd} plan ${nd === 1 ? 'day' : 'days'} ticked and ${nr} ${nr === 1 ? 'chapter' : 'chapters'} read`;""")
rep("""      if (a === 'merge') confirmBox('Add to mine?', `The code holds ${summary}. Your own ticks and entries stay, and theirs are added.`""",
    """      if (a === 'merge') confirmBox('Add to mine?', `The code holds ${summary}. Your own ticks and notes stay, and theirs are added.`""")
rep("""  if (b === 'socdate' || b === 'socnote') { const s = S.social[k] = S.social[k] || { date: '', feel: '', note: '' }; s[b === 'socdate' ? 'date' : 'note'] = v; }
""", "")
rep("""  if (kind === 'setup') { S.name = f.name.value.trim().slice(0, 30); S.start = f.start.value; S.seen = true; save(); closeLayer(); render(); }
  if (kind === 'potty') {
    const t = f.t.value ? new Date(f.t.value) : new Date();
    S.potty.push({ id: uid(), t: t.toISOString(), where: draft.where, res: draft.res, reward: draft.reward, note: f.note.value.trim().slice(0, 200) });
    S.potty.sort((a, b) => a.t < b.t ? -1 : 1); pottyDay = dkey(t) >= today() ? null : dkey(t); draft = null; save(); closeLayer(); render(); toast('Trip saved');
  }""", """  if (kind === 'setup') { S.name = f.name.value.trim().slice(0, 30); S.seen = true; save(); closeLayer(); render(); }""")
rep("""  if (h.startsWith('F30.')) {""", """  if (h.startsWith(CODE)) {""")
rep("""  setInterval(() => { if ((route === 'today' || route === 'potty') && !layer().innerHTML && !document.activeElement.matches('input,textarea')) { const y = window.scrollY; render(); window.scrollTo(0, y); } }, 60000);
""", "")

# ---- CSS for the sample notice and the coming list ----
rep("</style>", """.notice.sample{background:var(--butter);border:1px solid var(--butter-line);color:var(--ink);border-radius:14px;padding:12px 16px;margin-bottom:14px;font-size:15px}
.comingsoon{margin:18px 0 8px;padding:16px 18px;border:1.5px dashed var(--mint-line);border-radius:16px;background:var(--paper)}
.comingsoon h2{margin:0 0 4px;font-size:18px}.comingsoon>p{margin:0 0 10px;color:var(--soft);font-size:14.5px}
.comingsoon .soon{display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--mint)}
.comingsoon .soon .n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--mint);color:var(--soft);font-weight:700;font-size:14px}
.comingsoon .soon b{font-weight:600;color:var(--soft)}
</style>""")
open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
