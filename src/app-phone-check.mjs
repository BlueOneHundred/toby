// Toby build 36: the app at phone size. Claude used to open every companion app at 390 px wide by hand, click
// "Skip for now", open all 5 tabs and a chapter, and look for broken pictures, sideways scrolling and a wrong
// Plan tab. This script does the same inside a hidden window (pdf-maker.cjs renderPage) and returns what it found.
export const PHONE = {width: 390, height: 844};
export const APP_PHONE_SCRIPT = `(async () => {
  const notes = [], problems = [];
  const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const visible = e => e && e.offsetParent !== null;
  const look = where => {
    const sw = document.documentElement.scrollWidth, iw = window.innerWidth;
    if (sw > iw + 1) problems.push(where + ': the page scrolls sideways (' + sw + ' px wide on a ' + iw + ' px screen).');
    const broken = [...document.images].filter(i => visible(i) && i.complete && i.naturalWidth === 0);
    if (broken.length) problems.push(where + ': ' + broken.length + ' picture(s) did not load.');
  };
  await pause(300);
  const skip = document.querySelector('[data-act="skipsetup"]') || [...document.querySelectorAll('button,a')].find(e => /skip for now/i.test(e.textContent));
  if (visible(skip)) { skip.click(); await frame(); notes.push('Clicked "Skip for now".'); } else notes.push('No "Skip for now" button showed.');
  look('Start screen');
  const tabs = [...document.querySelectorAll('nav [data-go]')].filter(visible);
  notes.push('Tabs: ' + tabs.map(t => t.textContent.trim()).join(', '));
  if (tabs.length !== 5) problems.push('Found ' + tabs.length + ' tabs at the bottom (5 expected).');
  const tabAt = go => [...document.querySelectorAll('nav [data-go]')].find(e => visible(e) && e.dataset.go === go);
  for (const go of tabs.map(t => t.dataset.go)) {
    const t = tabAt(go); if (!t) { problems.push('The ' + go + ' tab disappeared after another tab was opened.'); continue; }
    const name = t.textContent.trim() || go;
    t.click(); await frame(); await pause(150);
    look(name + ' tab');
    if (go === 'plan' && document.body.innerText.includes('First hours')) problems.push('Plan tab shows "First hours" (loaf steps under Week 1).');
  }
  const book = tabAt('book');
  if (book) { book.click(); await frame(); await pause(300); } else problems.push('No Read tab.');
  const chapters = [...document.querySelectorAll('[data-go^="ch-"]')].filter(e => visible(e) && /^ch-\\d+$/.test(e.dataset.go));
  if (!chapters.length) problems.push('The Read tab lists no chapters.');
  else {
    const ch = chapters[Math.min(4, chapters.length - 1)];
    const title = ch.dataset.go;
    ch.click(); await frame(); await pause(200);
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await pause(30); }
    await pause(400); look('Chapter "' + title + '"'); window.scrollTo(0, 0);
    notes.push('Opened chapter: ' + title + ' (' + chapters.length + ' chapters listed).');
    if (!/\\S/.test(document.body.innerText)) problems.push('The chapter page is empty.');
  }
  return {passed: problems.length === 0, problems, notes};
})()`;
