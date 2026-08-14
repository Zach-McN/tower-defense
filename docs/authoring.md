# Authoring this game

This page is for you, not for a session. `kernel-2d/docs/using-the-editor.md` says
what the **editor** can do; this one says how to build **this game** with it — how a
road is drawn, how a monster is placed, and what this game's levels carry that the
Inspector cannot show you.

If this page and the game disagree, the game is right and this page is a bug.

Last true as of: **this folder opens by double-clicking it** (2026-08-13).

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

It opens on `scenes/level-01.json` — a green field, a brown road with two corners,
and one monster standing at the left-hand end of the road.

**All of that is generated scaffolding and it is meant to be replaced.** Every file
in it says so inside itself: art, level, prefabs, the lot. Replace any piece whenever
you have something better; nothing depends on it being what it is.

---

## Press Play

The monster walks the road, turns both corners, reaches the far end and stops.

It stops because there is nothing yet for reaching the end to *mean* — a monster
getting through is supposed to cost you a life, and lives do not exist yet. So it
stands on the last tile.

Press Stop and it is back at the start.

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

- **Towers, gold, waves, lives.** None of it. Monsters walk and that is the whole game
  so far.
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
- **Buildable and scenery tiles.** The design has three kinds of tile; only `path`
  exists, because nothing reads the other two until there are towers to put on them.
