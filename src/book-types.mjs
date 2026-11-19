// Toby build 42: book types. Every book keeps the shared core (cover, contents, The short version, Remember, Tip,
// From boxes, Facts, Steps, Checklist, tables, Sources). A base book's plan.md may also say what type of book it is:
//   Type: care | recipe | project | routine
// The type adds its own blocks and app tabs, and make_book checks the book against it. A book with no Type line is
// laid out exactly as before build 42, so the finished books (puppy, sourdough) never change.
// Agreed with Tavin on 19 Nov 2026 (doc 65). A type marked "(please confirm)" is a guess that Tavin has not confirmed.

export const BOOK_TYPES = Object.freeze({
  care: {name: 'Care routine', tabs: [['plan', 'Plan'], ['track', 'Log']], stalls: 'When it stalls'},
  recipe: {name: 'Recipe and process', tabs: [['recipes', 'Recipes'], ['timer', 'Timer']], stalls: 'What went wrong'},
  project: {name: 'Project and skill', tabs: [['projects', 'Projects'], ['progress', 'Progress']], stalls: 'Fix it'},
  routine: {name: 'Weekly routine', tabs: [['week', 'This week'], ['streak', 'Streak']], stalls: 'When it stalls'},
});
export const TYPE_NAMES = Object.keys(BOOK_TYPES);

// Words a bot might write for each type; the first word of the type's name always works.
const ALIASES = {care: 'care', 'care routine': 'care', recipe: 'recipe', recipes: 'recipe', 'recipe and process': 'recipe',
  project: 'project', projects: 'project', 'project and skill': 'project', routine: 'routine', 'weekly routine': 'routine'};

/** The "Type:" line of a plan.md: {type, confirm, value} (type '' when the line is missing; error when it is unknown). */
export function readType(text) {
  const m = /^[-*\s]*\**Type\**:\s*(.+?)\s*$/mi.exec(String(text || ''));
  if (!m) return {type: '', confirm: false, value: ''};
  const value = m[1].replace(/\*+/g, '').trim();
  const confirm = /\(\s*please confirm\s*\)/i.test(value);
  const word = value.replace(/\(.*?\)/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const type = ALIASES[word] || '';
  return type ? {type, confirm, value} : {type: '', confirm, value, error: `plan.md says "Type: ${value}", which is not a book type. Use one of: ${TYPE_NAMES.join(', ')}.`};
}

/** The plan.md files that can carry a book's type: the book's own folder first, then the base book of an edition. */
export function planPaths(dir) {
  const d = String(dir || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const out = [d ? d + '/plan.md' : 'plan.md'];
  const m = /^(.*)\/editions\/[^/]+(?:\/.*)?$/.exec(d);
  if (m) out.push(m[1] + '/plan.md');
  const s = /^(.*)\/sample$/.exec(d);
  if (s) out.push(s[1] + '/plan.md');
  return out;
}

/** The first plan text (in planPaths order) with a Type line decides. */
export function typeFromPlans(texts) {
  for (const t of texts) { const r = readType(t); if (r.type || r.error || r.confirm) return r; }
  return {type: '', confirm: false, value: ''};
}

/**
 * What make_book and make_app say about a typed book. found counts the blocks in the book:
 * {talk: [where...], tryTonight: [where...], recipe, project, week}.
 */
export function typeNotes(t, found) {
  const out = [];
  if (t.error) { out.push(t.error); return out; }
  if (!t.type) return out;
  if (t.confirm) out.push(`plan.md says "Type: ${t.value}". Tavin has not confirmed this book type yet. Stop, ask Toby to raise it with Tavin, and build nothing more until the line says just "Type: ${t.type}".`);
  const where = list => [...new Set(list)].join(', ');
  if (t.type === 'recipe' && !found.recipe) out.push('This is a recipe book (Type: recipe) but it has no recipe card. Write each recipe as a "> Recipe: <name>" block: a line of "Makes: ... | Prep: ... | Cook: ... | Keeps: ...", then the ingredients as "- name | grams | cups" lines, then the method as numbered steps.');
  if (t.type === 'project' && !found.project) out.push('This is a project book (Type: project) but it has no project card. Write each project as a "> Project: <name>" block: a line of "Difficulty: 1 to 5 | Time: ...", then the materials as "- item | which one" lines, then the steps as numbered steps.');
  if (t.type === 'routine' && !found.week) out.push('This is a routine book (Type: routine) but it has no week grid. Add a "> This week: <title>" block with one line per day: "- Mon: Kitchen" and so on.');
  if ((t.type === 'recipe' || t.type === 'project') && found.talk.length) out.push(`${where(found.talk)}: a "Say this, not that" or "Do this, not that" table belongs in care books, not in a ${t.type} book. Turn it into text, a Tip, or a "${t.type === 'recipe' ? 'What went wrong | Why | Fix next time' : 'Looks like | What to do'}" table.`);
  if (t.type !== 'care' && found.tryTonight.length) out.push(`${where(found.tryTonight)}: "Try tonight" boxes belong in care books. Use "> Try this:" instead.`);
  return out;
}
