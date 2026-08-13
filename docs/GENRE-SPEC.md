# Genre Spec — Tower Defense

Authored by Zach, 2026-08-13. This is the human's document — a session proposes changes to
it and does not make them.

## What this document is for

This is the fence. Nothing gets built unless a noun in this document justifies it — that
includes game code, editor tools, and kernel promotions (`genre-spinup` G5). If a session
wants to build something and cannot point at a noun below, the answer is no, and the way to
change that is to add the noun here, deliberately, as a decision.

The noun list is therefore short on purpose. Everything in the **Not in this game** section
was considered and cut, so a future session finding it missing knows it is missing by choice.

---

## What the game is

A fantasy tower defense. Monsters walk a fixed road across the map toward the place you are
defending. You spend gold to build archer posts and mage spires on the ground beside the road,
and they shoot the monsters as they pass. Kill them all and you keep the level; let too many
walk past and you lose it.

You beat a level by surviving its authored list of waves. Then you go to the next level.
There is no story, no meta-game, no endless mode. The game is a series of hand-built puzzles
about where to put your towers and what to spend on next.

## What the player does

The loop, in order, forever:

1. **Look at the map.** The road is drawn and never moves. See where it bends, where a tower
   would cover two stretches at once, where the long straight is.
2. **Spend gold.** Build a new tower on a buildable tile, or pay to upgrade one you already
   own to its next tier, or sell one for a partial refund to free up the tile and the money.
3. **Call the next wave** when ready. Waves do not arrive on a timer — the player starts each
   one. There is no time pressure in the building phase; the pressure is that gold only comes
   from killing things.
4. **Watch.** Once the wave is walking, the player has no controls that affect it. Combat
   resolves itself. This is deliberate: every decision has already been made by the time the
   monsters appear, which is what makes the building phase worth thinking about.
5. Monsters that die drop gold. Monsters that reach the goal cost a life. Back to step 1.

Run out of lives and the level is lost. Clear the wave list with a life remaining and it is won.

---

## The nouns

Every entry here is a thing a future session is allowed to build. Nothing else is.

### The map

- **Level** — one map plus its authored wave list. The unit of play, and the unit of content.
- **Grid** — the map is a grid of square tiles. Everything sits on it.
- **Tile** — one cell of the grid. Every tile is exactly one of three kinds: **path**,
  **buildable**, or **scenery** (looks nice, cannot be built on, is not walked on).
- **Path** — the ordered run of tiles the monsters walk, drawn by hand when the level is
  authored. One route per level. It does not change, ever, during play or otherwise.
- **Spawn** — the tile where monsters come in.
- **Goal** — the tile they are walking toward.
- **Level select** — the list of levels and which have been completed. Minimal; a menu.

### The defense

- **Tower** — a permanent building on one buildable tile. One tower per tile.
- **Range** — a circle around a tower. It only shoots what is inside it.
- **Damage** and **rate of fire** — how hard and how often it shoots.
- **Projectile** — the thing that flies from tower to monster.
- **Upgrade tier** — a short ladder (three or so rungs) per tower, bought with gold. A tier
  raises that tower's numbers. It never changes the tower's role and never branches.
- **Sell** — remove a tower, get part of everything spent on it back, free the tile.
- **Tower role** — the reason a tower exists. Four core roles, plus one candidate:
  - **Single-target** — steady damage into one monster at a time. The backbone.
  - **Splash** — hits a small area. The answer to a tightly packed wave.
  - **Slow** — drags down the speed of everything in range. The answer to fast monsters.
  - **Long-range** — covers far more road for less damage per shot.
  - **Support** *(candidate, not committed)* — boosts adjacent towers instead of shooting.
    Build sessions may not assume this one exists until it is promoted out of "candidate".

### The monsters

- **Monster** — walks the path from spawn to goal. **Two things vary between monsters and only
  two: speed and health.** That is the whole axis list.
- **Monster type** — a named speed-and-health combination with fantasy art to match: the fast
  fragile runner, the slow heavy brute, and a few points in between.
- **Bounty** — the gold a monster drops when killed.
- **Leak** — a monster reaching the goal. Costs one life.

### The run

- **Wave** — an authored group of monsters: which types, how many, in what order, how tightly
  spaced.
- **Wave list** — the level's full ordered sequence of waves. Fixed count, authored, no
  procedural generation.
- **Call wave** — the button the player presses to start the next one.
- **Gold** — the only currency. Comes from bounties and from a per-level **starting purse**.
- **Lives** — a counter, set per level. Each leak takes one. Zero means the level is lost.
- **Win / lose** — clear the wave list, or run out of lives.
- **Speed controls** — pause and fast-forward. Load-bearing, not a nicety: the player spends
  most of the game watching, and watching at 1× is the difference between a good game and a
  slow one.

---

## Consequences worth knowing

Two axes of monster variety (speed, health) is a tight budget, and it rules some things out by
arithmetic rather than by taste. There is no anti-air role, because nothing flies. There is no
armor-piercing role, because nothing has armor. That leaves the four core roles above as the
honest full set — a fifth and sixth tower would have to earn its distinctness from range,
firing pattern, or the support idea, not from a monster trait, because there are no more
monster traits. If the roster later feels thin, the fix is to add a monster axis **here first**,
and then the tower that answers it. Not the other way round.

## Not in this game

Cut on purpose. Finding one of these missing is not a gap to fill.

- **Monster traits:** flying, armor, shields, invisibility, healing, splitting on death,
  spawning others, bosses.
- **Live player input:** spells, abilities, cooldowns, airstrikes, a controllable hero, manual
  aiming, per-tower targeting rules (first / last / strongest).
- **Path play:** maze building, player-placed or player-altered routes, blocking, multiple
  lanes, junctions, branching roads.
- **Economy play:** income buildings, end-of-wave interest, early-call bonuses, per-wave
  payouts, anything that makes money without killing something.
- **Upgrades:** branching or divergent upgrade paths. Tiers go up, not sideways.
- **Between levels:** meta-progression, unlock trees, tech trees, persistent currency, anything
  saved beyond which levels are done.
- **After the wave list:** endless mode, survival mode, scoring, leaderboards.
- **Around the game:** story, dialogue, cutscenes, named characters, multiplayer.

## Left to build sessions

Genuinely open, and fine to decide while building: exact numbers for everything, how many
tiers a tower has, art and audio, what the wave-authoring tool looks like, and how a level
file is structured on disk.
