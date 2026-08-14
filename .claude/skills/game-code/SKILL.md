---
name: game-code
description: How this tower defense game's own code is organised — what systems exist, what components they read, and the conventions those follow. Consult whenever adding or changing anything under `src/`, inventing a component for a level to carry, or deciding whether something belongs in this game or in the kernel underneath it.
---

# game-code

Knowledge true of **this game only**. Anything here that turns out to be true of any
game on this kernel gets promoted to `gamedev-skills` when a second game proves it
general, and not before (`genre-spinup` S2).

## Decisions

### T1: A component this game invents is this game's, and adding one is never a kernel change

The scene format carries components it has never heard of — the loader keeps them,
the Inspector names them without offering to edit them, and a system here can read
them. So a behaviour that needs data on an entity gets a component **here**, and the
kernel gains nothing.

The vocabulary now, all of it justified by a noun in `docs/GENRE-SPEC.md`:

```json
"components": { "grid": { "tileSize": 16 } }
"components": { "tile": { "kind": "path" }, "spawn": {} }
"components": { "tile": { "kind": "path" }, "goal": {} }
"components": { "speed": { "unitsPerSecond": 56 } }
```

`spawn` and `goal` are components with nothing in them, which is worth stating
because it looks like an oversight. Each is a fact with no detail attached — *this*
is the tile monsters come in at — and a field invented to stop the object being
empty would be a field nothing reads.

**The pressure this exists to resist** is the obvious-looking fix of adding these to
the kernel's `COMPONENT_SCHEMAS` so the Inspector can edit them. That is the kernel
acquiring a genre's vocabulary, and the rule is that it grows by extraction once a
*second* game wants the same primitive (`genre-spinup` S1). Wanting a nicer editing
experience is not that. **T5 is what that pressure turned out to be worth**: it
mostly went away once speed belonged to a monster type rather than to a placement.
_[earned 2026-08-13, extended 2026-08-13]_

### T2: `march` reads the road the level draws, and it is the same system that used to move along x

Recorded when there was no path to follow: `march` moved along the x axis and this
entry named its trigger — *"when levels carry a path, this is the system that learns
to read one. The component it reads and the noun it serves do not change; only how
it decides which way is forward. Do not write a second movement system beside it."*

**The trigger fired the same day and the estimate held exactly.** `march` kept its
name, kept `speed`, and gained nothing beside it; what changed is where it gets its
direction from. The one thing the estimate did not mention is that the *reading* of
the road wanted its own file (`src/systems/route.ts`) — a system stayed a system, and
the arithmetic that says what a road is became the thing worth testing on its own.

The rule to carry forward, since this game will do this again with towers and waves:
**a system that learns something new is amended, not joined.** A second mover beside
`march` would be two answers to "where is this monster", and the first level to
carry both components would show which one wins by moving. _[earned 2026-08-13,
trigger fired 2026-08-13]_

### T3: A malformed component means "this does not apply", never a throw

Systems run sixty times a second, so an exception from inside one is the hardest kind
of fault to trace back to the file that caused it — and the file that caused it is
usually a level somebody hand-edited. Every component reader here validates and
answers `null`, and the caller skips that entity.

Follow it for every component reader added: check the shape, answer null, skip.
_[earned 2026-08-13]_

### T4: The road is worked out from the tiles that are drawn, never carried as a list beside them

The spec's Path is *"the ordered run of tiles the monsters walk, drawn by hand when
the level is authored"*. So the drawing **is** the authoring: `route.ts` takes the
path tiles that are in the level and answers with the order to walk them.

**The rejected alternative is the obvious one and will be proposed again:** a `path`
component holding an ordered list of coordinates, with the tiles drawn beside it. It
is far easier to read and it is two answers to one question — the list and the tiles
agree on the day they are written and drift the first time somebody drags a tile.
Deriving the order means the road you can see *is* the road that gets walked, and
there is nowhere for the two to disagree. It is also what makes the eventual tile
painter a tool that only has to paint: it writes tiles, and the road follows.

What deriving it costs, and it is worth knowing before extending this: the road has
to be **unambiguous geometry**. Exactly one grid, exactly one spawn, exactly one
goal, and every path tile with at most two neighbours. A fork is refused rather than
resolved, which is the spec's *"no junctions, no branching"* being checked instead of
assumed. _[earned 2026-08-13]_

### T5: Speed belongs to a monster *type*, and a monster type is a prefab

The spec says *"Monster type — a named speed-and-health combination"*. So speed is
not a property of a placement, and there is nothing for a per-monster speed field in
the Inspector to be for. `prefabs/monster-runner.json` and `prefabs/monster-brute.json`
carry a speed each; placing one is choosing a speed.

**This is the answer to "the Inspector cannot edit a component it does not know" that
costs the kernel nothing** — and it was reached by reading the spec rather than by
working around the editor, which is why it is a better answer than the field would
have been. The remaining gap is real but much smaller: changing what a type's speed
*is* still means a text editor, and that is a handful of numbers in a handful of
files rather than a number on every monster in every level.

The named trigger for building something: when the *number of types*, or the
frequency of tuning them, makes editing those files the real cost. The answer then is
a tool in this folder speaking this game's words — not a field in the kernel.
_[earned 2026-08-13]_

### T6: What a monster has done during a run is kept beside the level, never in it

`march` remembers how far each monster has walked in a `WeakMap` keyed on the entity,
in the module. Not in the entity's component map, which is the tempting place.

Three reasons, and the third is the one that decides it:

1. A level says where a monster stands; how far it has got is true of one run only.
2. The engine hands a system the copy it made when Play was pressed, so anything
   written into that map is thrown away at Stop anyway — after briefly appearing in
   the Inspector as a component nobody recognises.
3. Held weakly and keyed on the entity, a run's bookkeeping **dies with the run**.
   Every run gets fresh copies, so Stop and Play puts every monster back at the start
   with nothing to reset — there is no state to clear, because there is no state that
   outlives what it is about.

The same shape applies to the road itself: it is worked out once per run and cached
on the entity list, which the engine makes once when a level starts. That is only
safe because the spec says the road *"does not change, ever, during play or
otherwise"* — a cache justified by the game's own rules rather than by hoping.
_[earned 2026-08-13]_

## Gotchas

### TG1: A level that does not describe a road is completely silent

No grid, no spawn, no goal, a gap between two tiles, a fork — every one of them means
`route.ts` answers null, `march` moves nothing, and **nothing anywhere says why**. A
monster standing still because the road is broken and a monster standing still
because it has reached the goal look identical.

There is no fix inside this game. A system is handed entities and a step size; it has
no channel to the viewport's caption, which is where the kernel says the things it
knows (a missing texture, a prefab that has gone). Reporting from a system would be a
kernel change, and it is the kind that should wait until there is more than one thing
wanting to report.

**What to do meanwhile:** when a level will not walk, the first check is the level and
not the code — one grid entity, one `spawn`, one `goal`, and no gap in the tiles.
_[earned 2026-08-13]_

### TG2: How far out of line a tile may sit is bounded by arithmetic, not by taste

Neighbours are decided by distance, with room in it, because the editor has no grid
snap and a road is drawn by dragging. The tolerance is a third of a tile, and the
ceiling is not a preference: **a diagonal neighbour sits √2 tiles away, which is
0.414 of a tile further than a square one.** Any tolerance at or above that starts
joining tiles that touch only at a corner, and a road quietly acquires shortcuts
nobody drew.

The obvious-looking value is half a tile. It is above the ceiling, and what it breaks
is invisible: every level whose road never passes diagonally beside itself keeps
working, so the first level that does would be the one that mysteriously walks
through a wall. _[earned 2026-08-13]_

### TG3: The entity that carries the grid is the backdrop, so deleting the backdrop stops the road working

`grid` sits on the Ground entity, because the board is the thing that has a grid and
there is one board per level. That is defensible and it has a consequence worth
knowing: a level with its backdrop deleted has no tile size, so `route.ts` answers
null and nothing walks — see TG1 for how quiet that is.

The same edge cuts the other way: **two Ground entities is two grids, which is also
refused.** Placing a second backdrop is not a natural thing to do — there is one
board — but it is one press in the Assets panel, and the level looks fine afterwards.
_[earned 2026-08-13]_

## Contracts

- `src/systems/index.ts` — the ordered list of everything this game runs. The engine
  runs nothing that is not in it; there is no per-level system list and no fallback.
- `src/systems/march.ts` — `march`, the `speed` component, and where a run's
  bookkeeping lives (T6).
- `src/systems/route.ts` — what a drawn road *is*: the `grid`, `tile`, `spawn` and
  `goal` components, how the order is derived from them, and every way a level can
  fail to describe a road.
- `tests/levels.ts` — levels to test against, built as entity lists rather than as
  files. A system is handed entities and nothing else, so a fixture that went through
  JSON would be testing the kernel's loader on the way past.
- `prefabs/monster-runner.json`, `prefabs/monster-brute.json` — the monster types,
  and therefore the speeds (T5).
- `prefabs/road-tile.json`, `prefabs/ground.json` — what placing a tile places. The
  ground prefab is what carries `grid` into a level (TG3).
- `scenes/level-01.json` — the first level. Generated scaffolding, marked as such,
  meant to be replaced.
- `docs/authoring.md` — the human's page: how to draw a road and place a monster with
  the tools that exist today.
- `tsconfig.json` — the only file here that says where the kernel sits on disk. Code
  names the package `kernel-2d/runtime` and never a path.
- `package.json` — this game's own test runner. The kernel's suite cannot reach in
  here by design (`genre-spinup` S5).
- `docs/GENRE-SPEC.md` — the fence. Nothing gets built here without a noun in it.
