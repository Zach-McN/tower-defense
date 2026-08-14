# Authoring this game

This page is for you, not for a session. `kernel-2d/docs/using-the-editor.md` says
what the **editor** can do; this one says how to build **this game** with it — how a
road is drawn, how a monster is placed, and what this game's levels carry that the
Inspector cannot show you.

If this page and the game disagree, the game is right and this page is a bug.

Last true as of: **scenery, and the paused planning view — range rings, prices,
and the keys on screen** (2026-08-14).

---

## Opening it

**Double-click `Open editor.cmd`**, in this folder. A black window appears and the
editor opens in your browser a few seconds later; that window is the editor running,
so leave it be and close it when you are finished.

The same thing typed out, from the `kernel-2d` folder, if you would rather have a
terminal:

```bash
npm run editor -- ../games/tower-defense
```

**If you ever move this folder, or move the `kernel-2d` folder, ask Claude to refresh
this launcher.** It remembers where the editor was, so moving either one leaves it
pointing at the wrong place. Double-clicking it then says exactly that and waits —
nothing is lost, and a session puts it right in one command. Moving the whole
`gamedev` folder as one piece is fine and needs nothing.

It opens on `scenes/select.json` — the level select, which is itself just a scene:
a green field with a numbered pennant per level. Press Play and click a pennant to
enter that level; win it and the pennant wears a green check from then on. To edit a
*level*, open it from the Assets panel like any scene — `scenes/level-01.json` is a
green field, a brown road with two corners, two archer posts standing at the road's
bends, a row of five hearts by the goal, a shop row of four towers parked off the
map edge, and a line of monsters queued up in the dark to the left of the map: the
level's two waves, drawn where they will come in from, with a little banner
splitting them. `scenes/level-02.json` is the harder one: an S-shaped road, three
waves, three lives.

**All of that is generated scaffolding and it is meant to be replaced.** Every file
in it says so inside itself: art, level, prefabs, the lot. Replace any piece whenever
you have something better; nothing depends on it being what it is.

---

## Press Play

Nothing moves. The queued monsters vanish from the picture, the road stands empty,
and the game is waiting for you — waves come when you call them, and never on a
timer.

**Press the spacebar.** The first wave files in through the spawn mouth, walks the
road, and the archer posts start shooting as it comes into reach. Arrows fly,
monsters fall, and **every kill drops a coin where the monster fell** — the gold
lying on the map is the gold you have earned. Press space again whenever you are
ready for the next wave — including straight away, if you want them overlapping.

**A monster that reaches the goal takes a heart with it.** It disappears into the
goal, and the row of hearts by the goal is one shorter. The hearts are the lives:
what you see is the whole count.

**You control the speed of time.** Press **P** to pause — pause bars appear
mid-map, everything freezes where it stands, and P again resumes. Press **F** to run
at triple speed — chevrons appear, and F again returns to normal. Pause wins if both
are on. You can call a wave while paused; it stands ready at the spawn until time
moves again, which is a fine way to take a breath and look at the board.

**Pausing is also the planning view.** While time stands still the board explains
itself: a gold ring around every tower you own showing exactly what it covers
(rings grow when you upgrade), a paler ring on every open pad showing what the
*chosen* ware would cover from there, gold numbers over each tower saying what its
next tier costs and over the chosen ware saying its price, and a panel listing
every key the game answers to. Unpause and it all vanishes — the running board
stays clean. Everything on the panel and every number is readable before you spend
a coin, which is the point.

**Click a grey pad to buy a tower there.** The flagstone pads are the buildable
tiles, and clicking a vacant one builds whatever the golden arrow points at, paid
with the coins lying on the map. Not enough coins and the click simply does
nothing; too many and the change is dropped at the new tower's foot. Building works
while paused, and that is the intended rhythm: pause, look, spend, unpause. What
you cannot do is build on the grass — no pad, no tower — or twice on one pad.

**The number keys choose what to buy — or click the ware itself.** A little golden
arrow hangs over one piece of the shop row; press **1**–**4**, or click a ware, to
move it. Both levels sell all four:

| Key | Tower | Price | What it does |
|---|---|---|---|
| 1 | Archer post | 30 | Steady single-target arrows. The backbone. |
| 2 | Mage spire | 45 | Slower bolts that hit everything packed around the target. |
| 3 | Frost totem | 25 | No shots at all — everything walking near it moves at half speed. |
| 4 | Ballista | 40 | Nearly twice the reach of anything else, one heavy spear every two seconds. |

**Click a tower you own to upgrade it.** Every tower type has a short ladder of
tiers; each click buys the next rung with coins from the board, raises that tower's
numbers, and hangs another gold star above it. Two rungs per type, prices rising —
at the top of the ladder, or short of coins, the click does nothing. The rungs and
their prices live on the tower's prefab under `tiers`, editable in a text editor
like every other number.

**Press X, then click a tower, to sell it.** While a sell is armed the golden arrow
becomes a coin-and-arrow sign; the next click sells the tower it lands on for
**seventy percent of everything spent on it** — price plus rungs — dropped as a
coin where it stood. A click anywhere else stands the sell down, and so does
pressing a number key. The shop row cannot be sold, and neither can anything twice.

The level ends one of two ways, and says so in the middle of the map:

- **A trophy** — you cleared every wave with a heart still standing. Won, and
  remembered: the level select shows a check on this level from now on, even after
  the editor is closed.
- **A skull** — the last heart is gone. Lost, and the spacebar will not bring any
  more waves.

**Click the trophy or the skull to go back to the level select.** Winning again is
fine; losing forgets nothing.

Press Stop and everything is back where it started — waves re-queued, hearts
restored, coins gone. Only the completion checks persist.

---

## Drawing a road

A road is made of road tiles, and you click them out one at a time.

**Set the snap first — it is the whole trick.** In the bar under the picture, set
**Snap** to `16` and **from** to `8`.

That is this game's grid written down: a tile is 16 units across and sits on the
middle of its square, so the tiles of a road are at 8, 24, 40, 56 and so on. With
those two numbers set, every tile you put down lands on one of those positions and
you cannot miss.

Then:

1. Click **`prefabs/road-tile.json`** in the Assets panel.
2. Press **Place by clicking**.
3. Click your way along the road. Each click drops a tile.
4. Press **Esc** when the road is done.

Then mark the two ends — they are tiles of their own, and *The two ends* below says
how.

Clicking on top of the green field is fine — while you are placing, a click puts a
tile down rather than picking up whatever is underneath.

Got one wrong? `Ctrl-Z` takes them back one at a time. Or press Esc, click the stray
tile, and press Delete in the Hierarchy.

**Tiles must not touch corner to corner.** Two tiles diagonally beside each other are
not connected. A road turns by going along, then up, with a tile in the corner.

There is still room for error — about five units — so a tile nudged out of line by
hand is still part of the road. With the snap set you will not need it, and it is
what keeps roads drawn before the snap existed working.

### The two ends

**The ends of a road are their own tiles.** There are three road prefabs, not one:

| Place this | For |
|---|---|
| `prefabs/road-spawn.json` | The first tile. A dark mouth — where monsters come in. |
| `prefabs/road-tile.json` | Every tile in between. |
| `prefabs/road-goal.json` | The last tile. A gold marker — what they are walking toward. |

All three are road, so all three are walked. You can see which end is which by
looking at the map, and no level file has to be opened to say so.

So a road is: place the spawn tile, place the ordinary tiles along it, place the goal
tile at the far end. Each of the three is placed the same way — click the prefab in
the Assets panel, then **Place**, or **Place by clicking** for the long middle
stretch. The mode places whichever prefab it was switched on for, so changing tile
means Esc, click the other prefab, and press it again.

**Exactly one spawn and one goal per level.** Two of either and nothing walks — see
*When nothing walks*. The trap worth knowing: **Place by clicking** left on while the
spawn tile is selected puts down another spawn on every click, and eight dark mouths
in a row look exactly as deliberate as one. Nothing says the level is broken; it just
does not walk. Place the two ends one at a time.

**To change an end, delete the tile and place the other kind.** There is no way to
turn a road tile into a spawn tile where it stands; click it, press Delete in the
Hierarchy, and place the one you wanted. It lands in the same square if the snap is
still `16 from 8`.

### One Ground per level

The Ground is the green backdrop, and it is also **the thing that says how big a tile
is**. Every level needs exactly one.

- Delete it and nothing walks, because nothing knows what a tile is.
- Place a second one and nothing walks either, because the level has said two
  different things.

Neither of those tells you anything is wrong — see *When nothing walks* below.

---

## Placing a monster

1. Click **`prefabs/monster-runner.json`** or **`prefabs/monster-brute.json`**.
2. Press **Place**, and drag it onto the road.
3. Press Play.

For a lot of them at once, **Place by clicking** works here too — and a monster does
not have to be on the grid, so turn the snap off (set **Snap** to `0`) if you want
them scattered.

A monster does not have to start at the spawn. **It sets off from wherever you put
it**, joining the road at the nearest point — so dropping one just before a corner to
watch that corner is a normal thing to do. Put one out in the field and it steps onto
the nearest part of the road and walks from there.

### Setting its speed

**You choose a speed by choosing which monster you place.** Speed belongs to the
*type*, not to the one you dropped: a Runner is fast and a Brute is slow, and that is
the whole of what makes them different so far.

That is not a limitation of the editor, it is what a monster type is — the design
says a type is a named speed-and-health combination, so two monsters of the same type
walking at different speeds would not mean anything.

**To change what a type's speed is**, open its prefab file in a text editor and
change the number:

```json
"speed": { "unitsPerSecond": 56 }
```

Units per second, and a tile is 16 units — so 56 is three and a half tiles a second.
The Inspector will list `speed` under *Other components* and offer no control for it,
because the editor deliberately knows nothing about this game's vocabulary. When
tuning these numbers becomes the annoying part, that is the moment to ask for a tool
for it.

**To add a monster type**, copy one of the two prefab files, give it a new name and a
new speed. Nothing has to be told about it.

### Setting its toughness

Health works exactly like speed: **it belongs to the type**, a Runner takes three
hits and a Brute takes ten, and changing what a type can take means opening its
prefab file in a text editor:

```json
"health": { "total": 3 }
```

Hits, not points — every archer arrow takes one off, so a Runner survives two arrows
and falls to the third.

---

## Drawing a wave

**A wave is drawn, not typed.** You place its monsters in a line behind the spawn
tile — off the left edge of the map, on the dark background — in the order they
will walk in. Everything about the wave is the drawing:

- **Which monsters, and how many** — which prefabs you place, and how many.
- **Their order** — nearest the spawn goes first.
- **How tightly they follow each other** — the gaps you leave between them. A
  monster twenty units behind another comes through the spawn about a third of a
  second later, if they walk at the same speed.

To split the line into separate waves, place **`prefabs/wave-break.json`** — the
little banner — between the groups. Everything between two banners is one wave;
one press of the spacebar calls one wave.

So the whole gesture is: click a monster prefab, **Place by clicking**, click out a
few of them leading away from the spawn; drop a banner; draw the next wave behind
it. The snap does not matter here — monsters can stand anywhere, so `0` is fine —
and the queue does not have to be a perfectly straight line: whatever shape you
draw is the shape the wave files in with.

Two things worth knowing:

- **How far back a wave is drawn does not delay it.** When you call a wave it is
  slid up so its leader starts just behind the spawn — the gaps *inside* the wave
  are kept exactly as drawn, but the dead ground between waves is not walked.
- **A monster placed on the road is not in any wave.** It starts walking the moment
  you press Play, exactly as before — still the quickest way to watch what one
  tower does to one monster.

---

## Giving a level its lives

**Lives are hearts, and you place them.** Click **`prefabs/life.json`**, press
**Place by clicking**, and put a row of hearts somewhere they read well — beside the
goal is the natural spot. Five hearts is five lives; a hard level might offer three.
Each monster that reaches the goal takes one, from the end of the row; when the last
one goes, the level is lost.

A level with no hearts placed cannot be lost — monsters that get through simply
leave. That is a fine way to build a practice map, and it means an unfinished level
never shows a skull by accident.

**What a monster is worth** lives on its prefab, like its speed and health — a
Runner drops 5 gold, a Brute 20:

```json
"bounty": { "gold": 5 }
```

Coins lie where they were earned until they are spent — on new towers, on upgrade
rungs — and every coin remembers its worth, change and refunds included.

---

## Laying out the build spots and the purse

**Where the player may build is level design, and you draw it.** Click
**`prefabs/tile-buildable.json`** and place flagstone pads on the grass — beside
bends for value, beside straights for coverage. The pads are the whole of the
building rules: no pad, no tower, and one tower per pad. Level 1 has six.

**Scenery is the third tile kind, and it is pure decoration.** Place
**`prefabs/scenery-tree.json`** and **`prefabs/scenery-rock.json`** wherever the
grass looks empty: monsters never walk them, towers can never be built on them,
and nothing about play changes. Both levels have a scattering. Add more kinds by
copying a prefab and swapping its art — anything carrying
`tile: { kind: "scenery" }` is scenery.

**The starting purse is coins you place.** Click **`prefabs/coin.json`** and put
down ten-gold coins somewhere tidy — level 1 stacks three in the top-left corner,
thirty gold, exactly one archer post. Everything the player can spend is visible on
the map before they spend it: the purse you placed, plus the bounties their kills
drop.

**A level offers the towers it shows, and the shop row is marked.** Building copies
a standing example, so the catalogue is a display row of towers parked off the map
edge — one of each kind for sale, in the order the number keys should pick them.
Each display piece carries a `ware` mark (two lines typed into the level file on
the placed instance: `"ware": {}` beside its `prefab`), which is what says
*merchandise*: a marked tower never shoots, never chills, and cannot be sold or
upgraded. Towers placed *without* the mark are the player's starting defense —
they fight from the first step, and the player may upgrade or sell them. A level
with no marked wares falls back to offering one of each unmarked kind it shows; a
level with no towers at all offers nothing — pads or not.

---

## Placing a tower

1. Click **`prefabs/tower-archer.json`** in the Assets panel.
2. Press **Place**, and drag it onto the grass beside the road.
3. Press Play, and it shoots whatever walks into reach.

The snap set to `16 from 8` lands it neatly on a square, same as a road tile. It does
not have to be on the grid — anywhere on the grass works — but it must not be *on*
the road: nothing stops you putting it there yet, and a tower standing in the road
looks wrong even though the monsters walk straight through it.

**Where you put it is the whole game.** A post beside a bend covers two stretches of
road at once; a post beside the middle of a straight covers that straight and nothing
else. The archer post reaches three tiles in every direction.

An archer post shoots one arrow a second at the monster in reach that is furthest
along the road, and every arrow takes one hit off. Those numbers live in
`prefabs/tower-archer.json`, in a text editor, the same way a monster's speed does:

```json
"tower": {
  "rangeUnits": 48,
  "damage": 1,
  "shotsPerSecond": 1
}
```

Range is in units — 48 is three tiles. The `projectile` part next to those numbers
says what an arrow looks like and how fast it flies; swap its texture to re-fletch
every arrow this kind of tower shoots.

**Placing here is authoring; buying happens in play.** A tower placed in the editor
is part of the level — pre-built defense the player starts with, and the catalogue
of what they may buy. The towers the *player* adds are bought with clicks on pads
during play, cost gold, and vanish with Stop like everything else a run does.

---

## The level select

The menu is a scene like any other, and you author it the same way:
`scenes/select.json` holds the Ground and one **level banner** per level —
`prefabs/level-banner-01.json` and `-02.json`, a numbered pennant each. During
play, clicking a banner opens its level; a level that has been won wears a green
check on its banner, and the game remembers that across sessions (it sleeps in the
browser, not in any file of this game).

**To add a level to the menu**, copy a banner prefab, point its `portal` at the new
scene file, give it its own numeral art, and place it in the select scene. The
`portal` component is the whole mechanism:

```json
"portal": { "scene": "scenes/level-03.json", "reach": 16 }
```

**Every level knows the way home** — the Ground prefab carries it — which is why
the trophy and the skull are clickable: one click and you are back at the menu.

---

## When nothing walks

A monster standing still is either finished or stuck, and they look the same. There
is no message anywhere — a level's own code has no way to put one on screen — so this
is the checklist:

- **Is there exactly one Ground?** Not none, not two.
- **Is there one spawn tile and one goal tile?** One each, not none and not two. The
  Hierarchy names them *Spawn* and *Goal*, so counting them is quicker there than on
  the map.
- **Is there a gap?** Two road tiles more than about 21 units apart are not connected.
- **Does the road fork?** A stray road tile beside the middle of the road gives it two
  ways to go, and it refuses rather than guessing. That includes a road running
  alongside itself one tile away.
- **Has it already arrived?** Press Stop and look at where it is.

---

## What this game cannot do yet

- **A wave counter.** The paused panel lists the keys, but nothing counts the
  waves or shows how many are left — the queue you drew is the only picture of
  what is coming, and it is off-screen once the level starts.
- **See what a tier raises.** The paused view prices the next rung; what the gold
  buys — more damage, more reach — is still only written in the prefab file.
- **Forget a completed level.** The checks on the level select persist in the
  browser; nothing in the editor clears them. (Clearing the browser's site data
  does.)
- **Keep a tower off the road.** Nothing refuses a tower placed on a road tile;
  monsters walk through it.
- **Paint a road by dragging along it.** One click per tile. Clicking is quick enough
  that dragging a stroke has not been worth building.
- **See the grid.** The snap lines the tiles up; nothing draws the lines it lined them
  up to, so a half-finished road is the only picture of where the squares are.
- **Remember the snap.** Set it to `16 from 8` each time you open the editor — it goes
  back to `1 from 0` on every reload.
- **Turn a road tile into a spawn or a goal where it stands.** Delete it and place the
  other kind; nothing swaps one prefab for another in place.
- **Edit a speed, or any of this game's own settings, in the Inspector.** They are
  named there and cannot be changed there.
- **Say why a road is broken** — including the easiest one to do by accident, two
  spawn tiles. Nothing is reported; the level simply does not walk. See *When nothing
  walks*.
