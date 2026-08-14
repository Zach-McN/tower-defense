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
"components": { "health": { "total": 3 } }
"components": { "tower": { "rangeUnits": 48, "damage": 1, "shotsPerSecond": 1,
                           "projectile": { "texture": { "id": "…", "path": "…" }, "unitsPerSecond": 160 } } }
"components": { "waveBreak": {} }
"components": { "life": {} }
"components": { "bounty": { "gold": 5, "texture": { "id": "…", "path": "…" } } }
"components": { "coin": { "gold": 5 } }            // run-only, on dropped coins
"components": { "verdict": { "won": true } }       // run-only, on the banner
"components": { "outcome": { "victory": { "texture": { … } }, "defeat": { "texture": { … } } } }
"components": { "tempo": { "paused": { "texture": { … } }, "fast": { "texture": { … } } } }
"components": { "tile": { "kind": "buildable" } }
"components": { "price": { "gold": 30 } }
"components": { "slow": { "rangeUnits": 36, "factor": 0.5 } }
"components": { "wares": { "chosen": { "texture": { … } } } }
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

**Every one of those four components now reaches a level through a prefab**, and
none of them is typed into a scene file any more — `grid` rides on the Ground
prefab (TG3), `speed` on a monster type (T5), and `tile`, `spawn` and `goal` on the
three road prefabs (T7). The vocabulary above is what a *system* reads after the
kernel has resolved an instance against what it was placed from; where it was
written is a separate question, and the answer to it has turned out to be "a
prefab" three times running. _[earned 2026-08-13, extended 2026-08-13, extended
2026-08-13]_

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

### T7: An end of the road is a *kind of tile*, so it is a prefab — and that is the whole answer to marking one

Marking a spawn and a goal was the last thing about this game that was **impossible**
rather than merely slow: two lines typed into a level file per level, because the
Inspector names `spawn` and offers no control for it and T1/T5 forbid teaching the
kernel this game's words. It is the case `genre-spinup`'s parked question was
waiting for — the first genre tool that cannot be done with the kernel's existing
gestures — and it turned out not to be one.

**The spec settles it before any editor question arises.** Spawn is *"the tile where
monsters come in"*. A tile. And a *kind* of tile is a prefab, exactly as a kind of
monster is (T5). So there are three road prefabs rather than one:

```
prefabs/road-tile.json    tile: { kind: "path" }
prefabs/road-spawn.json   tile: { kind: "path" }, spawn: {}
prefabs/road-goal.json    tile: { kind: "path" }, goal: {}
```

Placing one **is** marking one. Nothing in `src/` changed, no component was invented,
the kernel gained nothing and the level format gained nothing: the whole feature is
four content files, written by a throwaway generator through the kernel's own schemas
(`genre-spinup` S6). **A session that answers a parked architecture question by
committing no code is the outcome to expect from S1, not a suspicious one.**

**Why it works at all is worth knowing, because it is the load-bearing kernel
behaviour this game leans on twice.** A placed entity holds a reference and the
loader merges the prefab's components onto it, with anything the entity carries
itself winning per component. A system is handed that resolved list — so `route.ts`
reads `spawn` without ever knowing whether it was typed into the level or inherited
from what the tile was placed from. That is the same road `speed` already travelled.

**What it costs, weighed before it was built rather than discovered after:**

1. **Converting a tile is delete-and-place**, because nothing swaps one prefab for
   another in place. Cheap with the snap set: the replacement lands in the same
   square.
2. **Nothing stops two spawns**, and this makes that *easier* to do by accident than
   the text editor ever was — one press of Place by clicking and every click lays
   another one. Refused in silence, per TG1.
3. **Two more textures**, which is the cost that pays for itself: the ends of the
   road are now visible on the map, which a mark inside a file never was.

**The general shape, and the thing to reach for before asking for an authoring
surface: ask what the thing *is* before asking what would edit it.** A mark that says
which *kind* of thing this is, is content — and content in this kernel is a prefab.
The question only becomes real for something that must differ *per placement*, which
a prefab cannot express.

**The named trigger, therefore:** a marker that has to carry a value of its own —
this spawn's wave list, this goal's life cost. A prefab cannot vary per instance, so
that is the day `genre-spinup`'s parked question is genuinely asked rather than
dodged. Two dodges in a row is a good record and not a proof. _[earned 2026-08-13]_

### T8: Combat is one system, and the things it makes exist for one run only

`shoot` is towers firing, arrows flying, wounds landing and monsters dying — one
system, not three, because a shot is one story with an order inside it: arrows in
the air land *before* towers loose new ones, so a kill frees every tower to retarget
the same step and an arrow always spends at least one step visibly flying. Order
between systems is list order (`index.ts`, `march` before `shoot` so arrows fly at
where a monster is); order inside a story belongs to the file that tells it.

**An arrow is an entity made mid-run, and it carries only a sprite.** Its target,
damage and speed are true of one run only, so they live in a WeakMap keyed on the
arrow (T6 applied to something that did not exist at Play) — which is also the
answer to "which entities are arrows", because membership in that map *is* being
one. The renderer needs nothing new: it syncs by id, so pushing an entity into the
list is the whole of making it visible, and splicing it out is the whole of a death.
Spawned ids are `arrow#<n>` off a module counter — authored ids are hex, so the
namespaces cannot collide.

Targeting is code's choice, not the player's (the spec cuts per-tower targeting
rules): farthest along the road in range, because that is the monster closest to
costing a life. A level with no road falls back to nearest-to-tower, so combat
still works on a broken or roadless level rather than silently not. _[earned
2026-08-14]_

### T9: Art for what a run spawns is declared in authored content, under a field named `texture`

A spawned entity can only wear a texture that was loaded with the level — nothing
can fetch mid-run. The kernel loads every reference sitting under a field called
`texture`, at any depth, in any component, including ones it has no schema for
(`textureRefsOf`, text-formats). So the archer post's prefab declares its arrow's
art *inside the tower component* — `"projectile": { "texture": … }` — and the
spawned arrow wears that same reference.

**This is why the tower component carries an asset reference rather than a
filename**, and the rule to carry forward for waves: whatever a system will spawn,
the authored content that causes the spawning names the art, under the one agreed
word. Nothing in this game tells the kernel what a tower or a wave is; the field
name is the entire contract. _[earned 2026-08-14]_

### T10: A wave is drawn, not typed — the fourth dodge of the authoring-surface question, and the biggest

The wave list was `genre-spinup`'s named example of the thing that would finally
force a bespoke authoring surface: authored, per-level, and unreachable by the
Inspector. It fired nothing, by the established move — **ask what the thing is
before asking what would edit it** — applied to every clause of the spec's own
definition. *"Which types, how many, in what order, how tightly spaced"*: which
prefabs were placed, how many were placed, and where they stand. So a level's
wave list is its monsters **placed in a queue behind the spawn tile**, split
into waves by a break marker that is a kind of thing and therefore a prefab
(`wave-break.json`, T7's move re-used), and the whole of wave authoring is the
placement gestures the editor already has.

What made it expressible as geometry: `route.ts` extended "how far along the
road" to be **negative before the spawn** — a queued monster's distance is how
far it has still to walk before its road begins — and `march` walks a negative
monster straight in through the spawn mouth. `waves` confiscates everything
negative (and every break, wherever it stands) at the run's first step, holds
it beside the run (T6), and releases one wave per press, slid up as a block so
the leader starts just behind the spawn: **gaps inside a wave are the author's;
dead ground between waves is not walked.** Order in `index.ts` is load-bearing:
`waves` before `march`, or the first step walks the queue before it can be held.

The call is the spacebar, read with the kernel's `pressedIn` — input arrives as
data on an entity the runner injects, so a test presses a key by putting
`inputEntity(['Space'])` in its fixture list. This game is the consumer that
input seam was shaped by. _[earned 2026-08-14]_

### T11: Lives are drawn, gold is dropped, and the verdict is an entity — the run's whole ledger is the picture

The spec's closing nouns went the same way as the wave list, because the same
question kept answering: **a life is a heart token placed by the author**
(`prefabs/life.json` — sprite plus empty `life` marker, T7's shape a third
time), how many stand is the count, and `leak` removes one per monster that
reaches the goal, hindmost first. **A bounty is a coin entity dropped where the
monster died** — its art named inside the monster's `bounty` component (T9
again), its amount carried in a run-only `coin` component for the day building
spends it; until then a level's wealth is literally the coins lying on it.
**Win and lose are a banner** `verdict` spawns at the outcome-carrier's
transform (the Ground, so the board's centre), wearing art the Ground prefab
names under `outcome`, and carrying `verdict: { won }` — which `waves` reads
to refuse calls on a decided level, and tests read to assert the ending.
Entities are the bus between systems, exactly as input arrived.

Two authored-content rules fell out and both are load-bearing:

1. **A level that authors no waves cannot be won, and one that places no hearts
   cannot be lost.** Both verdicts require the level to have opened with the
   thing being run out of — counts `verdict` captures on its first step, which
   (running last) is after `waves` confiscated the queue. A road with
   hand-placed monsters is a sandbox, and a sandbox never shows a banner.
2. **`leak` removes an arrived monster**, ending the scaffolding-era behaviour
   of towers shooting something that already finished. Kills drop gold; leaks
   only cost.

Order in `index.ts` is now five long and each adjacency is argued there:
waves, march, shoot, leak, verdict. _[earned 2026-08-14]_

### T12: Time is scaled by the systems that spend it, and the kernel's clock never hears about it

The speed controls (`P` pause, `F` fast-forward at 3×, pause winning while both
are toggled) live in `tempo.ts`: a per-run toggle state (T6), a glyph entity at
the board's centre wearing art the Ground prefab names under `tempo` (T9), and
one exported number — `tempoOf(entities)`: 0, 1 or 3. Every system that
consumes time multiplies its own `dtSeconds` by it; the kernel's fixed step is
untouched and every system still runs sixty times a second.

**Why game-side:** extraction over anticipation — the kernel is asked for a
rate control the day a second game wants one — and because *a paused game is
not a paused program*: presses still land while paused, so a wave can be
called and stand frozen at the spawn, which is this genre's look-at-the-board
moment and would be unreachable if the loop itself had stopped.

**The rule that keeps it honest:** any `dtSeconds * x` in this game has
`tempoOf` beside it, and `march`/`shoot` early-return at 0 so a paused tower
with a ready cooldown does not fire into a world that is standing still. A
system that forgets runs at 1× inside a paused game — visible the first time
`P` is pressed, which is the right way for that mistake to fail.
`tempoOf` answers 1 for a run it never saw, so driving one system alone in a
test still means what it always meant. _[earned 2026-08-14]_

### T13: A level offers what it shows — building copies a standing tower, and the purse is placed coins

Build-during-play (`build.ts`) closed the spec's loop with three decisions,
each the placement pattern again:

1. **Buildable is the spec's third tile kind, drawn** —
   `prefabs/tile-buildable.json`, `tile: { kind: "buildable" }`. Where the
   player may build is level design; a click during play (`clickedIn`, the
   kernel's pointer in scene units — this system is the consumer that seam was
   shaped by) on a vacant pad builds, anywhere else is nobody's. One tower per
   pad, by a vacancy check with the same half-tile arithmetic as a leak.
2. **What gets built is a copy of a tower already standing in the level**
   (`copyEntity` on the first entity carrying valid `tower` + `price`). The
   prefab stays the single source of what a tower is, nothing reads a file
   mid-run, and a level's catalogue is its pre-placed towers — both defense
   and shop. The rejected alternative was the buildable tile carrying a full
   tower description: a second answer to "what is an archer post" that drifts
   the day Zach tunes one (T4's failure, resisted again). Price sits on the
   tower prefab (`price: { gold: 30 }`), beside the stats it prices.
3. **The starting purse is coins the author places** —
   `prefabs/coin.json`, ten gold each — because the first playtest proved a
   bounty-only economy pays out at the exact moment there is nothing left to
   buy. Payment removes coins largest-first and drops one change coin at the
   new tower's foot, so the board's arithmetic always balances in public.

Building deliberately ignores the tempo — pausing to spend calmly is the
spec's no-time-pressure build phase working — and refuses on a decided level,
same as waves. _[earned 2026-08-14]_

### T14: A role is where the behaviour lives, not a new machine — splash is a field, slow is an aura, and the shop is number keys

The spec's committed roles landed as amendments, not systems (T2's rule
holding at scale):

- **Splash is one optional field**, `projectile.splashUnits` on the `tower`
  component: a landing strikes every live monster within that radius of the
  target, and a plain arrow is the one-monster case of the same sentence.
  Each splash kill drops its own coin. Present-but-mangled refuses the whole
  tower, absent means plain (T3's "whole or not at all" with an optional).
- **Slow is its own component** (`slow: { rangeUnits, factor }`), because the
  spec's slow role is an *aura* — "drags down the speed of everything in
  range" — not a projectile, so it is read by `march` (which owns what moving
  means) and never by `shoot`. The frost totem is a priced building with no
  `tower` component at all: it cannot shoot by construction. Auras do not
  stack; the strongest single one wins.
- **Choosing a ware is `build.ts`'s third input**: `Digit1..9` pick from the
  catalogue — the *distinct kinds* on show, told apart by prefab reference
  (which bought copies inherit, so building never grows the catalogue) in
  order of first appearance. The choice is shown as a golden arrow over one
  standing example (`wares` art on the Ground, the fourth board-centre glyph
  family). "Building" generalised from `tower` to `tower`-or-`slow` in the
  occupancy and catalogue checks the day the totem arrived.

A catalogue exemplar can be parked off the map edge — the display row beside
the wave queue — because offered-by-presence (T13) never asked where the
example stands, only that it does. _[earned 2026-08-14]_

### T15: The market's other verbs — a ladder is type data, a climb is run state, and merchandise is marked

Upgrade and sell (`trade.ts` for the arithmetic, `build.ts` for the click
routing) split cleanly along the same line every earlier feature drew:

- **The tiers ladder is on the tower's prefab** (`tiers: [rung, rung]`, each a
  price plus the numbers it raises, written as new values). What a *type's*
  second rung costs is type data, exactly as its speed is (T5). A rung cannot
  carry a texture or a role — the spec forbids sideways upgrades and the
  shape cannot express one. One malformed rung refuses the whole ladder (T3).
- **How far a tower has climbed is run state** — a WeakMap standing (T6),
  dead at Stop — *shown* as star-pip entities above the tower (the board says
  everything, T11). `shoot` and `march` read effective numbers through
  `towerAt`/`slowAt` inside their own component readers, so nothing else in
  the game knows tiers exist.
- **What one click means is decided in order** (`build.ts`): a ware chooses,
  an armed sell (`X`, one-shot, shown by the marker swapping to the selling
  sign) sells, an owned tower upgrades, a vacant pad builds. Same clicked
  list read once, no click consumed twice by accident.
- **"Everything spent" is a sum `trade.ts` keeps** — base price plus rungs
  bought — and the refund (70%, floor) lands as a coin wearing the
  `wares.coin` face, because a refund with no authored face drops nothing
  rather than inventing art (T3's degrade).
- **The ware mark** (`ware: {}`, empty like `spawn`) says *merchandise*: the
  marked shop row is the catalogue, never fights, and cannot be sold or
  upgraded; bought copies shed the mark. It exists because the unmarked shop
  row was quietly wrong — the level-01 mage could snipe monsters filing past
  the map edge, which nobody authored. A level with no marks falls back to
  offering its distinct standing kinds, so sandboxes and old tests hold.

_[earned 2026-08-14]_

### T16: The menu is a scene, a banner is a prefab, and "completed" is a remembered fact — the sixth dodge

The spec's *Level select* ("the list of levels and which have been completed.
Minimal; a menu") is `scenes/select.json`: a Ground and one numbered-pennant
banner per level (`prefabs/level-banner-*.json` — a banner *for level 1* is a
kind of thing, T7 again). The whole mechanism is one component and one system:

- **`portal: { scene, reach?, done? }`** on a banner names the scene a click
  opens, through the kernel's door seam (`openDoor` — the ask crosses as an
  entity, the host does the opening). `portal.done.texture` names the check
  art, loaded by the texture-field rule.
- **`portal.ts`** routes clicks to portals and hangs a check on every portal
  whose remembered fact says won. It runs last in `index.ts`, so the banner
  `verdict` spawns is a door the next click can take.
- **Victory learns `facts[scene] = { won: true }`** through the kernel's
  story seam — the scene's own path is the key, stated by the host on the
  story carrier, because a system cannot know its own file name any other
  way. `verdict.ts` also gives its banner a portal home, aimed at the `home`
  scene the Ground prefab authors: the trophy and the skull are the way back.
- **A run with no story carrier** (every older test, a sandbox) wins quietly,
  travels nowhere, shows no checks — the menu degrades, never throws (T3).

The export ships what doors reach (`sceneRefsOf`, the `scene`-key mirror of
the texture rule) — so `project.json` starting on the select ships both
levels. _[earned 2026-08-14]_

### T17: Pause is the planning view — the HUD is entities that exist only while time stands still

The spec's loop opens with *"Look at the map"* and promises *"no time
pressure in the building phase"*; `hud.ts` makes pause that phase made
visible. While `tempoOf` is 0 (and the level is undecided), the board wears:
a range ring per owned tower (effective reach — rings grow with tiers), a
paler ring on every vacant pad sized to the *chosen* ware, gold digits over
each tower pricing its next rung and over the chosen ware pricing a build,
and a key-legend panel. Unpause and all of it is removed.

What holds it together is that **nothing here is a UI layer** — the seventh
straight time that instinct lost (`genre-spinup`'s tally):

- A ring is one texture scaled: drawn radius = range ÷ the ring art's own
  radius (22px), so one PNG serves every range including upgraded ones.
- A price is digits, and digits are ten tiny textures the Ground names under
  `digits` — composed side by side per price, because the art cannot know
  the number in advance and the number cannot ship as text. A `dot` texture
  joined them the day rungs raised rates: 0.75 is a number too, and glyphs
  advance by their own widths so it reads as one.
- **What a rung buys is icon-and-new-number pairs** under its price (`stats`
  art: sword, circle, bolt, burst, snowflake), the rung's own authored
  values — so the board and the prefab never disagree about what gold gets.
- **The wave counter is the confiscated queue said out loud**: the wave-break
  flag (`waves.flag` art — the same texture the queue is drawn with) beside
  the spawn with `wavesWaiting`'s count in digits. It exists because the
  queue leaves the board at the first step (T10), taking the only picture of
  "what is coming" with it; `hud` running after `waves` in list order is
  what guarantees the count is never asked before the queue is taken.
- The legend is one authored panel (`help.legend`), replaceable art like
  every glyph.
- Rebuild-on-signature: the overlay is recomputed each step but respawned
  only when its JSON differs, so a paused board is not sixty splices a
  second.

`build.ts` exports `chosenOf` and `occupied` for this — the overlay asks the
spending system what a click would do rather than re-deriving it. Scenery
(`tile: { kind: "scenery" }`, the spec's third tile kind) landed the same
day as pure content: route walks only `path`, build only `buildable`, so a
tree is inert by construction and two prefabs were the whole feature.
_[earned 2026-08-14]_

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

**One of those cases got likelier the day the ends became prefabs (T7).** Two spawns
used to require typing `"spawn": {}` twice into a file; now it is one press of Place
by clicking with the spawn tile selected, and eight of them look exactly like eight
road tiles. The silence is unchanged and the road to it is shorter — which is the
kind of thing that decides *when* the reporting channel is worth building, without
changing the argument about where it belongs. _[earned 2026-08-13, extended
2026-08-13]_

### TG2: How far out of line a tile may sit is bounded by arithmetic, not by taste

Neighbours are decided by distance, with room in it. The tolerance is a third of a
tile, and the ceiling is not a preference: **a diagonal neighbour sits √2 tiles
away, which is 0.414 of a tile further than a square one.** Any tolerance at or
above that starts joining tiles that touch only at a corner, and a road quietly
acquires shortcuts nobody drew.

The obvious-looking value is half a tile. It is above the ceiling, and what it breaks
is invisible: every level whose road never passes diagonally beside itself keeps
working, so the first level that does would be the one that mysteriously walks
through a wall.

**The reason it exists has changed, and the number has not — which is the part
worth recording.** It was written because the editor had no grid snap, and the
editor gained one the next day: set to `16 from 8`, every tile a click puts down is
exactly one tile from its neighbour and the tolerance is never consulted. It stays
anyway, and not out of caution — the snap is *window* state that starts at whole
units every time the editor opens (`editor-ui` U31), so a road drawn by somebody
who did not set it is a road drawn on whole units, and refusing it would be the
tool declining to read what it just helped write.

The general shape: **a tolerance that exists to forgive a missing tool is not
retired by the tool arriving**, because the tool is optional and the content it
forgave is already on disk. What retires it is the sloppy input becoming
unreachable. _[earned 2026-08-13, reason superseded 2026-08-13]_

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
- `src/systems/shoot.ts` — combat whole: the `tower` and `health` components,
  arrows, wounds, cooldowns, targeting and death (T8, T9).
- `src/systems/waves.ts` — the drawn queue: the `waveBreak` component, what is
  confiscated and when, the spacebar as Call Wave, and `wavesWaiting`, the one
  window into the confiscated queue (T10).
- `src/systems/tempo.ts` — the speed controls: the `tempo` component's glyph
  art, the toggle keys, and `tempoOf`, the number every time-spending system
  multiplies by (T12).
- `src/systems/build.ts` — spending: the `buildable` tile kind, the `coin`
  component's spending half, the offered-by-presence rule, and what one click
  means in what order — choose, sell, upgrade, build (T13, T15).
- `src/systems/trade.ts` — the market's arithmetic: the `price`, `tiers` and
  `ware` components, a tower's climb and everything spent on it, effective
  numbers (`towerAt`/`slowAt`), the refund rate, and the `wares` art bundle
  reader (T15).
- `src/systems/portal.ts` — the `portal` component, click-to-travel through
  the kernel's door, and the completion checks read from the story (T16).
- `src/systems/hud.ts` — the paused planning overlay: rings, prices, the
  legend, and the `range`/`help`/`digits` art bundles it reads (T17).
- `src/systems/leak.ts` — the `life` component, what counts as arriving, and
  which heart a leak takes (T11).
- `src/systems/verdict.ts` — the `outcome`, `verdict` and `home` components,
  what each ending requires the level to have authored, the banner, and what
  victory learns through the story seam (T11, T16).
- `src/systems/route.ts` — what a drawn road *is*: the `grid`, `tile`, `spawn` and
  `goal` components, how the order is derived from them, every way a level can
  fail to describe a road — and the once-per-run road cache (`routeThrough`),
  moved here the day a second system needed the same road.
- `tests/levels.ts` — levels to test against, built as entity lists rather than as
  files. A system is handed entities and nothing else, so a fixture that went through
  JSON would be testing the kernel's loader on the way past.
- `prefabs/monster-runner.json`, `prefabs/monster-brute.json` — the monster types,
  and therefore the speeds *and healths* (T5 — both halves of the spec's
  "speed-and-health combination" now live there).
- `prefabs/tower-archer.json`, `prefabs/tower-mage.json`,
  `prefabs/tower-frost.json`, `prefabs/tower-ballista.json` — the four
  buildable kinds: single-target, splash, slow, and long-range, each carrying
  its `price` and its `tiers` ladder (T8, T9, T13, T14, T15).
- `prefabs/level-banner-01.json`, `prefabs/level-banner-02.json` — the level
  select's pennants: one `portal` each, plus the check art for a completed
  level (T16).
- `prefabs/coin.json` — the placeable ten-gold coin: how a level draws its
  starting purse (T13).
- `prefabs/tile-buildable.json` — the buildable tile kind, where building
  happens (T13).
- `prefabs/scenery-tree.json`, `prefabs/scenery-rock.json` — the scenery tile
  kind: looks nice, cannot be built on, is not walked on (T17).
- `prefabs/wave-break.json` — the banner that splits the drawn queue into waves
  (T10).
- `prefabs/life.json` — a heart: one life, counted by placement (T11).
- `prefabs/ground.json` — the backdrop, the grid (TG3), the way `home` (T16),
  and the board's glyph art: `outcome` for the verdict banner (T11), `tempo`
  for the pause and fast-forward signs (T12), `wares` for the chosen arrow,
  the selling sign, the refund coin's face and the tier star (T14, T15), and
  the planning overlay's `range`, `help`, `digits`, `stats` and `waves`
  bundles (T17).
- `prefabs/road-tile.json`, `prefabs/road-spawn.json`, `prefabs/road-goal.json` —
  the three kinds of road tile, and therefore the two ends (T7). All three carry
  `tile: { kind: "path" }`; the two ends add an empty `spawn` or `goal`.
- `scenes/level-01.json`, `scenes/level-02.json` — the two levels;
  `scenes/select.json` — the menu, itself a scene (T16). All generated
  scaffolding, marked as such, meant to be replaced. `project.json` starts the
  game on the select.
- `docs/authoring.md` — the human's page: how to draw a road and place a monster with
  the tools that exist today.
- `tsconfig.json` and `vitest.config.ts` — the two files here that say where the
  kernel sits on disk, because the typechecker and the test runner each need
  telling and neither reads the other. Both point at `runtime/game/api.ts` — the
  kernel's game-facing, DOM-free surface, which exists because the full runtime
  barrel reaches Phaser and Phaser reaches for `window`, and this game's tests
  run in plain Node. Code names the package `kernel-2d/runtime` and never a path;
  if this folder moves, those two lines change together and nothing under `src/`
  does.
- `package.json` — this game's own test runner. The kernel's suite cannot reach in
  here by design (`genre-spinup` S5).
- `docs/GENRE-SPEC.md` — the fence. Nothing gets built here without a noun in it.
