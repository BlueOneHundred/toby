// Toby build 42: made-up books, one per book type, for tests and visual checks. All text is invented for testing.
const facts = n => `> Facts:\n${[1, 2, 3, 4, 5].map(i => `> - ${i * n} | A short made-up fact number ${i} [S1]`).join('\n')}\n`;
const end = n => `> Remember:\n> - The main point of chapter ${n} [S1]\n> - A second point to keep [S2]\n\n${facts(n)}`;
export const SOURCES = '\n## Sources\n\nS1. A made-up guide to testing. Example Org. 2025. https://example.org/one\nS2. Another made-up page. Example Group. 2024. https://example.org/two\n';

export const RECIPE = [`## Chapter 1: Sunday prep in an hour

> The short version: One hour on Sunday gives you four lunches. Cook the slow things first [S1].

### Why an hour is enough

Rice, a tray of chicken and a pot of greens can all cook at the same time. While the oven works, you wash up and pack the boxes [S1].

> Recipe: Chicken and rice bowls
> Makes: 4 lunches | Prep: 15 min | Cook: 25 min | Keeps: 4 days in the fridge
>
> - Long-grain rice | 370 g | 2 cups
> - Chicken thighs | 680 g | 1½ lb
> - Frozen peas | 145 g | 1 cup
> - Soy sauce | 45 ml | 3 tbsp
>
> 1. Rinse the rice and start it cooking.
> 2. Season the chicken and roast at 425°F (220°C) for 25 minutes [S1].
> 3. Stir the peas into the hot rice.
> 4. Slice the chicken and split everything into 4 boxes.

### What went wrong

| What went wrong | Why | Fix next time |
|---|---|---|
| Rice is hard by Thursday | It dried out in the fridge | Add a spoon of water before reheating [S2] |
| Chicken is dry | It cooked too long | Take it out at 165°F (74°C) [S2] |

> Tip: Label each box with the day you will eat it.

${end(1)}`, `## Chapter 2: Breakfast you can grab

> The short version: Overnight oats take five minutes and wait for you in the fridge [S2].

### The basic jar

Oats soak up milk overnight and turn soft. Nothing needs cooking [S2].

> Recipe: Overnight oats
> Makes: 2 jars | Prep: 5 min | Keeps: 3 days in the fridge
>
> - Rolled oats | 90 g | 1 cup
> - Milk | 240 ml | 1 cup
> - Chia seeds | 10 g | 1 tbsp
>
> 1. Stir everything together in a jar.
> 2. Leave in the fridge for at least 4 hours [S2].

### Your shopping list

> Checklist: Shopping list for the week
> - Rolled oats
> - Milk
> - Chia seeds
> - Chicken thighs
> - Long-grain rice
> - Frozen peas

${end(2)}`, SOURCES];

export const PROJECT = [`## Chapter 1: Your first granny square

> The short version: A granny square is four groups of stitches around a ring. Make one and you can make a blanket [S1].

### Before you start

Pick a smooth cotton yarn in a light colour so you can see each stitch [S1].

> Project: Granny square coaster
> Difficulty: 2 | Time: 40 minutes
>
> - Yarn | Worsted weight cotton, 2 colors, about 20 yards each
> - Hook | 5 mm (US H-8)
> - Also | Scissors and a yarn needle
>
> 1. Make a magic ring and chain 3.
> 2. Work 2 double crochets into the ring [S1].
> 3. Chain 2 for the first corner.
> 4. Repeat until you have four groups, then close the round.

### Fix it

| Looks like | What to do |
|---|---|
| The square curls into a bowl | Add 1 more chain at each corner [S2] |
| The square ripples | Use 1 fewer chain at each corner [S2] |

${end(1)}`, `## Chapter 2: Keep track of your projects

> The short version: A simple record of what you made helps you see how far you have come [S2].

### Project tracker

Fill in a row each time you finish something.

| Project | Started | Finished | Notes |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
| | | | |

${end(2)}`, SOURCES];

export const ROUTINE = [`## Chapter 1: A week that cleans itself

> The short version: One zone a day, twenty minutes, and the whole home stays tidy [S1].

### One zone a day

Short daily sessions beat one long weekend clean, because nothing has time to build up [S1].

> This week: One zone a day, 20 minutes
> - Mon: Kitchen
> - Tue: Bathrooms
> - Wed: Floors
> - Thu: Bedrooms
> - Fri: Laundry
> - Sat: Catch-up
> - Sun: Rest

> Checklist: The 10-minute reset
> - Clear the sink
> - Wipe the counters
> - Put shoes away
> - Empty one bin

### Habit tracker

Tick a box each day you do it.

| Habit | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|
| 10-minute reset | | | | | | | |
| Sink empty at night | | | | | | | |
| One load of laundry | | | | | | | |

${end(1)}`, SOURCES];

export const CARE = [`## Chapter 1: Watering without guessing

> The short version: Most houseplants die from too much water. Check the soil before you pour [S1].

### The finger test

Push a finger into the soil before you water [S1].

| Do this | Not that |
|---|---|
| Push a finger 2 inches into the soil and water only if it is dry | Water every Sunday whatever the soil feels like |
| Pour until water runs out of the bottom, then empty the saucer | Give a small splash every day |

> Red flag: Yellow lower leaves and soil that smells sour: stop watering and check the roots [S2].

${end(1)}`, SOURCES];

// A typed book that breaks its type's rules: a recipe book with a "Say this" table and a "Try tonight" box, no recipe card.
export const RECIPE_WRONG = [`## Chapter 1: Reading your dough

> The short version: Hydration is the share of water to flour [S1].

### Talk like a baker

| Say this | Not that |
|---|---|
| It is a 72% dough | It is quite a wet dough |

> Try tonight: Mix a small test dough [S1].

${end(1)}`, SOURCES];
