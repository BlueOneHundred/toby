// Toby build 42: book types (care, recipe, project, routine). Made-up books only (test/fixtures/typed-books.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readType, planPaths, typeFromPlans, typeNotes, BOOK_TYPES} from '../src/book-types.mjs';
import {buildBook, bookToFix} from '../src/book-builder.mjs';
import {buildApp} from '../src/app-builder.mjs';
import {checkEdition} from '../src/edition-check.mjs';
import {RECIPE, PROJECT, ROUTINE, CARE, RECIPE_WRONG, SOURCES} from './fixtures/typed-books.mjs';

const TEMPLATE = readFileSync(new URL('../templates/app/template-general.html', import.meta.url), 'utf8');
const typed = type => ({type, confirm: false, value: type});
const app = (parts, type, extra = {}) => buildApp({files: {parts, plan: `Title: Test\nType: ${type}\n`, voice: '', appJson: extra.appJson || ''}, bookDir: 'ebooks/test', coverDataUrl: '', template: TEMPLATE, bookType: type ? typed(type) : null});
const data = html => JSON.parse(/const BOOK = (\{.*?\});\n/s.exec(html)[1]);

test('the Type line in plan.md is read, with its aliases, the confirm mark and unknown types', () => {
  assert.deepEqual(readType('Title: X\nType: recipe\n'), {type: 'recipe', confirm: false, value: 'recipe'});
  assert.equal(readType('- **Type:** Weekly routine').type, 'routine');
  assert.equal(readType('Type: Project and skill').type, 'project');
  const guess = readType('Type: routine (please confirm)');
  assert.equal(guess.type, 'routine'); assert.equal(guess.confirm, true);
  assert.match(readType('Type: knitting').error, /not a book type/);
  assert.equal(readType('Title: no type here').type, '');
  assert.deepEqual(Object.keys(BOOK_TYPES), ['care', 'recipe', 'project', 'routine']);
});

test('an edition or a sample takes its type from the base book\'s plan.md', () => {
  assert.deepEqual(planPaths('ebooks/meal-prep/editions/sam'), ['ebooks/meal-prep/editions/sam/plan.md', 'ebooks/meal-prep/plan.md']);
  assert.deepEqual(planPaths('ebooks\\meal-prep\\sample'), ['ebooks/meal-prep/sample/plan.md', 'ebooks/meal-prep/plan.md']);
  assert.deepEqual(planPaths('ebooks/meal-prep'), ['ebooks/meal-prep/plan.md']);
  assert.equal(typeFromPlans(['Title: Sam\'s edition', 'Type: recipe']).type, 'recipe');
  assert.equal(typeFromPlans(['', '']).type, '');
});

test('a book with no type is laid out exactly as before: new labels stay ordinary boxes', () => {
  const plain = buildBook({title: 'Old', parts: RECIPE});
  const none = buildBook({title: 'Old', parts: RECIPE, bookType: {type: '', confirm: false, value: ''}});
  assert.equal(plain.html, none.html);
  assert.ok(!/class="rcard|class="wgrid|class="trouble/.test(plain.html));
  assert.equal(plain.report.type, '');
  assert.ok(!plain.report.notes.some(n => /recipe|care books/i.test(n)), plain.report.notes.join('; '));
});

test('a recipe book gets recipe cards and a troubleshooting table, and passes its type check', () => {
  const {html, report} = buildBook({title: 'Prep', parts: RECIPE, bookType: typed('recipe'), palette: 'terracotta'});
  assert.equal(report.type, 'recipe');
  assert.deepEqual(bookToFix(report, false), []);
  assert.equal((html.match(/class="rcard"/g) || []).length, 2);
  assert.match(html, /<p class="rc-title">Chicken and rice bowls<\/p>/);
  assert.match(html, /<span><b>Makes<\/b> 4 lunches<\/span>/);
  assert.match(html, /<th>Ingredient<\/th><th>Metric<\/th><th>US<\/th>/);
  assert.match(html, /<td>Chicken thighs<\/td><td>680 g<\/td><td>1½ lb<\/td>/);
  assert.match(html, /<li><span class="rc-n">2<\/span><span>Season the chicken/);
  assert.match(html, /<table class="trouble small">/);
});

test('a recipe book with a Say this table, a Try tonight box and no recipe card is told what to fix', () => {
  const {report} = buildBook({title: 'Wrong', parts: RECIPE_WRONG, bookType: typed('recipe')});
  const fix = bookToFix(report, false).join('\n');
  assert.match(fix, /no recipe card/);
  assert.match(fix, /Chapter 1: a "Say this, not that" or "Do this, not that" table belongs in care books/);
  assert.match(fix, /"Try tonight" boxes belong in care books/);
  // a care book may keep both
  assert.deepEqual(typeNotes(typed('care'), {talk: ['Chapter 1'], tryTonight: ['Chapter 1'], recipe: 0, project: 0, week: 0}), []);
});

test('a type that is still a guess stops the book until Tavin confirms it', () => {
  const {report} = buildBook({title: 'Prep', parts: RECIPE, bookType: {type: 'recipe', confirm: true, value: 'recipe (please confirm)'}});
  assert.match(bookToFix(report, false).join('\n'), /Tavin has not confirmed this book type yet/);
  const {report: bad} = buildBook({title: 'Prep', parts: RECIPE, bookType: readType('Type: knitting')});
  assert.match(bookToFix(bad, false).join('\n'), /not a book type/);
  assert.equal(bad.type, '');
});

test('a project book gets project cards with difficulty dots, and a routine book a week grid and a habit page to print', () => {
  const p = buildBook({title: 'Hooks', parts: PROJECT, bookType: typed('project')});
  assert.deepEqual(bookToFix(p.report, false), []);
  assert.match(p.html, /class="rcard pcard"/);
  assert.match(p.html, /aria-label="Difficulty 2 of 5"/);
  assert.equal((p.html.match(/<i class="on"><\/i>/g) || []).length, 2);
  assert.match(p.html, /<th>You need<\/th><th>Which one<\/th>/);
  assert.match(p.html, /<table class="trouble small">/);
  const r = buildBook({title: 'Tidy', parts: ROUTINE, bookType: typed('routine')});
  assert.deepEqual(bookToFix(r.report, false), []);
  assert.match(r.html, /<div class="wg-row n7"><div class="wg-day"><p class="wg-when">Mon<\/p><div class="wg-what">Kitchen<\/div><\/div>/);
  assert.match(r.html, /<section class="worksheet" id="ws-1"><div class="ws-head"><h3>Habit/);
  assert.equal((r.html.match(/class="tickcell"/g) || []).length, 21);
  const missing = buildBook({title: 'Tidy', parts: CARE, bookType: typed('routine')});
  assert.match(bookToFix(missing.report, false).join('\n'), /no week grid/);
});

test('a care book keeps the Do this, not that bubbles', () => {
  const {html, report} = buildBook({title: 'Plants', parts: CARE, bookType: typed('care')});
  assert.deepEqual(bookToFix(report, false), []);
  assert.match(html, /<div class="talk">/);
});

test('the edition check keeps every card line in a typed book and still asks for rewritten text', () => {
  const base = {parts: RECIPE};
  const voice = s => s.replace('Rice, a tray of chicken and a pot of greens can all cook at the same time. While the oven works, you wash up and pack the boxes [S1].', 'In my kitchen the rice, the chicken tray and the greens all go on together, and I tidy up while they cook [S1].');
  const kept = checkEdition({base, edition: {parts: RECIPE.map(voice)}, type: 'recipe'});
  assert.ok(!kept.toFix.some(x => /card/.test(x)), kept.toFix.join('\n'));
  const dropped = checkEdition({base, edition: {parts: RECIPE.map(voice).map(s => s.replace('> - Frozen peas | 145 g | 1 cup\n', ''))}, type: 'recipe'});
  assert.ok(dropped.toFix.some(x => /the recipe card "Chicken and rice bowls" has 8 lines, the base book has 9/.test(x)), dropped.toFix.join('\n'));
  const renamed = checkEdition({base, edition: {parts: RECIPE.map(s => s.replace('| What went wrong | Why | Fix next time |', '| Oops | Why | Fix |'))}, type: 'recipe'});
  assert.ok(renamed.toFix.some(x => /heading row of table 1 must stay exactly/.test(x)), renamed.toFix.join('\n'));
  // card lines are data, so they never count as box text left unchanged
  assert.ok(kept.report.boxBase < checkEdition({base, edition: {parts: RECIPE}}).report.boxBase);
  // with no type the check is the same as before build 42
  const old = checkEdition({base, edition: {parts: RECIPE.map(s => s.replace('| What went wrong | Why | Fix next time |', '| Oops | Why | Fix |'))}});
  assert.ok(!old.toFix.some(x => /heading row/.test(x)));
});

test('the app gets the type\'s own tabs and data, and no puppy trackers are required', () => {
  const r = app(RECIPE, 'recipe');
  assert.equal(r.check.passed, true, r.check.problems.join('; '));
  assert.deepEqual(r.check.tabs, ['Today', 'Recipes', 'Timer', 'Read', 'Yours']);
  const book = data(r.html);
  assert.equal(book.type, 'recipe'); assert.equal(book.stallsTitle, 'What went wrong');
  assert.equal(book.recipes.length, 2);
  assert.deepEqual(book.recipes[0].meta[0], {k: 'Makes', v: '4 lunches'});
  assert.deepEqual(book.recipes[0].items[1], ['Chicken thighs', '680 g', '1½ lb']);
  assert.equal(book.recipes[0].steps.length, 4);
  assert.equal(book.stalls.rows.length, 2);
  const p = app(PROJECT, 'project');
  assert.equal(p.check.passed, true, p.check.problems.join('; '));
  assert.deepEqual(p.check.tabs, ['Today', 'Projects', 'Progress', 'Read', 'Yours']);
  assert.equal(data(p.html).projects[0].title, 'Granny square coaster');
  const w = app(ROUTINE, 'routine');
  assert.equal(w.check.passed, true, w.check.problems.join('; '));
  const wb = data(w.html);
  assert.deepEqual(wb.week.items[0], {day: 'Mon', job: 'Kitchen'});
  assert.deepEqual(wb.tools.habit.rows, ['10-minute reset', 'Sink empty at night', 'One load of laundry']);
  const c = app(CARE, 'care', {appJson: JSON.stringify({requiredTools: [], planDays: 1})});
  assert.deepEqual(c.check.tabs, ['Today', 'Plan', 'Log', 'Read', 'Yours']);
  assert.equal(app(CARE, 'care', {appJson: JSON.stringify({requiredTools: [], planDays: 0})}).check.passed, true, 'a care book with no day plan says planDays 0');
  assert.ok(app(CARE, 'care').check.problems.some(x => /Plan table does not have 30 days/.test(x)), 'otherwise a care book needs its day plan');
  assert.equal(data(c.html).chapters[0].blocks.filter(b => b.t === 'say').length, 1, 'Do this, not that is a say table in a typed book');
  const wrong = app(RECIPE_WRONG, 'recipe');
  assert.ok(wrong.check.problems.some(x => /no recipe card/.test(x)));
  assert.ok(wrong.check.problems.some(x => /Try tonight/.test(x)));
});

test('an app with no type is built as before', () => {
  const files = {parts: RECIPE, plan: 'Title: Old\n', voice: '', appJson: JSON.stringify({requiredTools: [], planDays: 0})};
  const a = buildApp({files, bookDir: 'ebooks/old', coverDataUrl: '', template: TEMPLATE});
  const b = buildApp({files, bookDir: 'ebooks/old', coverDataUrl: '', template: TEMPLATE, bookType: {type: '', confirm: false, value: ''}});
  assert.equal(a.html, b.html);
  const book = data(a.html);
  assert.equal(book.type, ''); assert.equal(book.recipes.length, 0);
  assert.ok(!book.chapters[0].blocks.some(x => x.t === 'recipe'));
  assert.deepEqual(a.check.tabs, []);
});

test('the general template knows every typed tab and the scaling of amounts', () => {
  for (const id of ['recipes', 'timer', 'projects', 'progress', 'week', 'streak']) assert.match(TEMPLATE, new RegExp(`V\\.${id} = \\(\\) =>`));
  // pull the scaling helpers out of the template and run them
  const src = /const FRAC = [\s\S]*?\nfunction recipeCard/.exec(TEMPLATE)[0].replace(/\nfunction recipeCard$/, '');
  const {scaleText, niceAmount} = new Function(`${src}; return {scaleText, niceAmount};`)();
  assert.equal(scaleText('370 g', 1.5), '555 g');
  assert.equal(scaleText('1½ lb', 1.5), '2¼ lb');
  assert.equal(scaleText('1 cup', 1.5), '1½ cups');
  assert.equal(scaleText('2 cups', 0.5), '1 cup');
  assert.equal(scaleText('3 tbsp [S2]', 2), '6 tbsp [S2]');
  assert.equal(niceAmount(0.5), '½');
});

test('make_book, check_edition and make_app read the type from the base book\'s plan.md in the team folder', async t => {
  const {mkdtemp, rm, readFile, writeFile, mkdir} = await import('node:fs/promises'); const {tmpdir} = await import('node:os'); const {join} = await import('node:path'); const {randomUUID} = await import('node:crypto');
  const {agentRuntime} = await import('../src/agent-tools.mjs'); const {WorkspaceFiles} = await import('../src/workspace-files.mjs'); const {TeamFolder} = await import('../src/team-folder.mjs');
  const d = await mkdtemp(join(tmpdir(), 'toby-types-')); t.after(() => rm(d, {recursive: true, force: true}));
  const dir = join(d, 'team', 'ebooks', 'prep'), ed = join(dir, 'editions', 'sam');
  await mkdir(ed, {recursive: true}); await mkdir(join(d, 'team', 'templates', 'app'), {recursive: true});
  await writeFile(join(d, 'team', 'templates', 'app', 'template-general.html'), TEMPLATE);
  await writeFile(join(dir, 'plan.md'), 'Title: Prep\nType: recipe\n');
  for (const [i, n] of ['part-a.md', 'part-b.md', 'part-c.md'].entries()) { await writeFile(join(dir, n), [RECIPE[0], RECIPE[1], SOURCES][i]); await writeFile(join(ed, n), [RECIPE[0], RECIPE[1], SOURCES][i]); }
  await writeFile(join(ed, 'app.json'), JSON.stringify({title: 'Prep with Sam'}));
  const png = Buffer.alloc(33); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(0x0d0a1a0a, 4); png.writeUInt32BE(13, 8); png.write('IHDR', 12, 'ascii'); png.writeUInt32BE(1600, 16); png.writeUInt32BE(2400, 20);
  await writeFile(join(dir, 'cover.png'), png);
  const none = {status: () => ({}), customMcp: () => ({}), customAskFirst: () => new Set(), appPublisher: () => null};
  const rt = await agentRuntime({conversationId: randomUUID(), files: new WorkspaceFiles(join(d, 'bots')), teamFolder: new TeamFolder(join(d, 'team')), onActivity: () => {}, approve: async () => false, signal: new AbortController().signal, wait: async () => {}, connections: none, bot: {id: randomUUID(), capabilities: {web: false, files: true, computer: false, connections: true}}});
  const call = async (name, input) => { const r = await rt.definitions.find(x => x.name === name).handler(input); return r.isError ? {error: r.content[0].text} : JSON.parse(r.content[0].text); };
  const book = await call('make_book', {parts: ['ebooks/prep/editions/sam/part-a.md', 'ebooks/prep/editions/sam/part-b.md', 'ebooks/prep/editions/sam/part-c.md'], title: 'Prep', htmlPath: 'ebooks/prep/editions/sam/book.html'});
  assert.equal(book.bookType, 'recipe', JSON.stringify(book)); assert.equal(book.passed, true, JSON.stringify(book.toFix));
  assert.match(await readFile(join(ed, 'book.html'), 'utf8'), /class="rcard"/);
  const check = await call('check_edition', {editionDir: 'ebooks/prep/editions/sam'});
  assert.match(await readFile(join(ed, 'edition-check.md'), 'utf8'), /^- Book type: recipe/m);
  assert.ok(!check.toFix.some(x => /card/.test(x)), check.toFix.join('\n'));
  // make_app needs a passed edition check; the base book's app shows the typed tabs
  const made = await call('make_app', {bookDir: 'ebooks/prep', coverImage: 'ebooks/prep/cover.png', template: 'templates/app/template-general.html'});
  assert.equal(made.passed, true, JSON.stringify(made.toFix));
  assert.match(await readFile(join(dir, 'app', 'app-check.md'), 'utf8'), /^- Book type: recipe \(tabs: Today, Recipes, Timer, Read, Yours\)$/m);
  // a guessed type stops the book
  await writeFile(join(dir, 'plan.md'), 'Title: Prep\nType: recipe (please confirm)\n');
  const held = await call('make_book', {parts: ['ebooks/prep/part-a.md'], title: 'Prep', htmlPath: 'ebooks/prep/book.html'});
  assert.equal(held.passed, false); assert.match(held.toFix.join('\n'), /Tavin has not confirmed/);
});
