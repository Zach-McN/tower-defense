import type { Entity, System } from 'kernel-2d/runtime'

import { chosenOf, occupied } from './build'
import { slowOf } from './march'
import { routeThrough } from './route'
import { towerOf } from './shoot'
import { tempoOf } from './tempo'
import { isWare, nextRungOf, priceOf, type Rung } from './trade'
import { wavesWaiting } from './waves'

/**
 * The planning overlay: pause is when the player looks at the board, so pause
 * is when the board explains itself.
 *
 * The spec's loop starts with *"Look at the map"* and has *"no time pressure
 * in the building phase"* — pausing (`P`) is that phase made literal, and
 * while time stands still this system lays the answers to the three questions
 * a paused player is asking over the picture:
 *
 *   - **What does everything cover?** A range ring around every owned tower —
 *     its effective reach, tiers included — and a paler ring on every vacant
 *     pad showing what the *chosen ware* would cover from there. Rings are
 *     one texture scaled: art the Ground prefab names under `range.ring` and
 *     `range.pale`, sized so the drawn radius is the range in scene units.
 *   - **What would the next rung cost, and what does it buy?** Gold digits
 *     above every owned tower that has one left to buy — the price the next
 *     click would pay — and under the price, what the rung raises: a stat
 *     icon and the new number for each raise (`stats` art on the Ground —
 *     sword for damage, circle for range, bolt for rate, burst for splash,
 *     snowflake for the chill). Above the chosen ware, its build price.
 *     Digits are ten tiny textures the Ground names under `digits` (plus a
 *     `dot`, so a rate of 0.75 reads as one), composed side by side,
 *     because a price is a number and numbers are made of digits (the same
 *     picture-is-the-data reading as everything else on this board).
 *   - **How many waves are still coming?** The wave-break flag beside the
 *     spawn mouth with the count of waves not yet called — read from the
 *     confiscated queue (`wavesWaiting`), which is the one place the answer
 *     exists once the drawn queue has been taken off the board.
 *   - **What are the keys?** The legend panel (`help.legend` art) over the
 *     lower board, listing every control this game answers to. It appears
 *     with the pause and leaves with it — an unpaused board stays clean.
 *
 * Everything here is run state drawn as entities (game-code T6/T11): spawned
 * while paused, removed the moment time moves or the level is decided, and
 * rebuilt only when what it would say changes. A level whose Ground names
 * none of this art shows that much less and refuses nothing (T3's degrade).
 */
export const hudSystem: System = {
  id: 'hud',

  step: (entities) => {
    const state = overlays.get(entities) ?? { signature: '', spawned: [] }
    overlays.set(entities, state)

    const decided = entities.some((entity) => entity.components['verdict'] !== undefined)
    const wanted = tempoOf(entities) === 0 && !decided ? overlayFor(entities) : []

    const signature = JSON.stringify(wanted)
    if (signature === state.signature) return
    state.signature = signature

    for (const old of state.spawned) {
      const at = entities.indexOf(old)
      if (at !== -1) entities.splice(at, 1)
    }
    state.spawned = wanted
    entities.push(...wanted)
  },
}

/** What is currently laid over the board. Dies with the run (game-code T6). */
const overlays = new WeakMap<readonly Entity[], { signature: string; spawned: Entity[] }>()

/** The ring texture's own radius in pixels — what a range is divided by to scale it. */
const RING_RADIUS = 22

function overlayFor(entities: readonly Entity[]): Entity[] {
  const laid: Entity[] = []

  const ring = artOf(entities, 'range', 'ring')
  const pale = artOf(entities, 'range', 'pale')

  // Every owned tower's reach — effective numbers, so an upgraded archer's
  // ring grows with it — and the next rung's price above each.
  for (const post of entities) {
    if (isWare(post)) continue
    const reach = towerOf(post)?.rangeUnits ?? slowOf(post)?.rangeUnits
    if (reach === undefined) continue

    if (ring !== null) {
      laid.push(sprite(`hud#ring#${post.id}`, 'Range', post.transform.x, post.transform.y, ring, reach / RING_RADIUS))
    }

    const rung = nextRungOf(post)
    if (rung !== null) {
      laid.push(...priceTag(entities, `hud#price#${post.id}`, rung.price, post.transform.x, post.transform.y + 19))
      laid.push(...raiseTag(entities, `hud#raise#${post.id}`, rung, post.transform.x, post.transform.y + 27))
    }
  }

  // How many waves are still to be called, said beside the spawn mouth with
  // the same flag the queue was drawn with. Nothing to say once it is zero —
  // or before `waves` has taken the queue, which list order guarantees.
  const waiting = wavesWaiting(entities)
  const spawn = routeThrough(entities)?.points[0]
  if (waiting !== null && waiting > 0 && spawn !== undefined) {
    const flag = artOf(entities, 'waves', 'flag')
    if (flag !== null) {
      laid.push(sprite('hud#waves#flag', 'Waves left', spawn.x, spawn.y + 22, flag, 1))
      laid.push(...numberTag(entities, 'hud#waves#count', String(waiting), spawn.x + 13, spawn.y + 22))
    }
  }

  // The chosen ware: what a click on a vacant pad would build, said twice —
  // its price over the shop row, and its reach as a pale ring on every pad
  // still open.
  const chosen = chosenOf(entities)
  if (chosen !== null) {
    const price = priceOf(chosen)
    if (price !== null) {
      laid.push(...priceTag(entities, 'hud#price#chosen', price, chosen.transform.x, chosen.transform.y + 22))
    }

    const reach = towerOf(chosen)?.rangeUnits ?? slowOf(chosen)?.rangeUnits
    if (reach !== undefined && pale !== null) {
      for (const pad of entities) {
        const tile: unknown = pad.components['tile']
        if (typeof tile !== 'object' || tile === null) continue
        if ((tile as { kind?: unknown }).kind !== 'buildable') continue
        if (occupied(entities, pad)) continue
        laid.push(sprite(`hud#pad#${pad.id}`, 'Would cover', pad.transform.x, pad.transform.y, pale, reach / RING_RADIUS))
      }
    }
  }

  // The keys, over the lower board, twice life size so the small font reads —
  // low enough that the pause bars at the board's centre stay in view.
  const legend = artOf(entities, 'help', 'legend')
  const holder = entities.find((entity) => entity.components['help'] !== undefined)
  if (legend !== null && holder !== undefined) {
    laid.push(sprite('hud#legend', 'The keys', holder.transform.x, holder.transform.y - 56, legend, 2))
  }

  return laid
}

/** A price as gold digits, centred on `x`. A missing digit texture drops the tag. */
function priceTag(entities: readonly Entity[], id: string, price: number, x: number, y: number): Entity[] {
  return numberTag(entities, id, String(Math.floor(price)), x, y)
}

/** How wide each glyph advances: the dot is narrower than a digit. */
const DIGIT_ADVANCE = 5
const DOT_ADVANCE = 3

/**
 * A number as gold glyphs, centred on `x` — digits and, for the rates a rung
 * can raise, the decimal dot (`digits.dot` art). A missing glyph drops the
 * whole tag: half a number is worse than none.
 */
function numberTag(entities: readonly Entity[], id: string, text: string, x: number, y: number): Entity[] {
  const advances = [...text].map((char) => (char === '.' ? DOT_ADVANCE : DIGIT_ADVANCE))
  const width = advances.reduce((sum, advance) => sum + advance, 0)

  const glyphs: Entity[] = []
  let at = x - width / 2
  for (const [index, char] of [...text].entries()) {
    const art = artOf(entities, 'digits', char === '.' ? 'dot' : char)
    if (art === null) return []
    const advance = advances[index] ?? DIGIT_ADVANCE
    glyphs.push(sprite(`${id}#${String(index)}`, 'Number', at + advance / 2, y, art, 1))
    at += advance
  }
  return glyphs
}

/** Which stat icon says what a raised field means, in the order raises are shown. */
const RAISES: readonly { icon: string; of: (rung: Rung) => number | undefined }[] = [
  { icon: 'damage', of: (rung) => rung.tower?.damage },
  { icon: 'range', of: (rung) => rung.tower?.rangeUnits ?? rung.slow?.rangeUnits },
  { icon: 'rate', of: (rung) => rung.tower?.shotsPerSecond },
  { icon: 'splash', of: (rung) => rung.tower?.projectile?.splashUnits },
  { icon: 'chill', of: (rung) => rung.slow?.factor },
]

/** How wide a stat icon advances, and the gap between two raises. */
const ICON_ADVANCE = 8
const PAIR_GAP = 4

/**
 * What the next rung buys, as icon-and-new-number pairs centred on `x`: the
 * numbers are the rung's own — the same ones the prefab authors — so the
 * board and the file never disagree about what gold gets. A raise whose icon
 * or digits are missing from the level's art is left out rather than half
 * drawn.
 */
function raiseTag(entities: readonly Entity[], id: string, rung: Rung, x: number, y: number): Entity[] {
  const pairs = RAISES.map((raise) => ({ icon: raise.icon, value: raise.of(rung) }))
    .filter((pair): pair is { icon: string; value: number } => pair.value !== undefined)
    .map((pair) => ({ ...pair, text: String(pair.value) }))
  if (pairs.length === 0) return []

  const widthOf = (pair: { text: string }): number =>
    ICON_ADVANCE + [...pair.text].reduce((sum, char) => sum + (char === '.' ? DOT_ADVANCE : DIGIT_ADVANCE), 0)
  const width = pairs.reduce((sum, pair) => sum + widthOf(pair), 0) + (pairs.length - 1) * PAIR_GAP

  const laid: Entity[] = []
  let at = x - width / 2
  for (const pair of pairs) {
    const icon = artOf(entities, 'stats', pair.icon)
    if (icon === null) continue
    laid.push(sprite(`${id}#${pair.icon}`, 'Raise', at + ICON_ADVANCE / 2, y, icon, 1))
    const digits = numberTag(entities, `${id}#${pair.icon}#value`, pair.text, at + ICON_ADVANCE + (widthOf(pair) - ICON_ADVANCE) / 2, y)
    if (digits.length === 0) {
      laid.pop()
      continue
    }
    laid.push(...digits)
    at += widthOf(pair) + PAIR_GAP
  }
  return laid
}

function sprite(
  id: string,
  name: string,
  x: number,
  y: number,
  texture: { id: string; path: string },
  scale: number,
): Entity {
  return {
    id,
    name,
    transform: { x, y, rotation: 0, scaleX: scale, scaleY: scale },
    components: { sprite: { texture } },
  }
}

/** One face of a Ground-authored art bundle — the `waresArt` shape, generalised. */
function artOf(entities: readonly Entity[], component: string, side: string): { id: string; path: string } | null {
  for (const entity of entities) {
    const bundle: unknown = entity.components[component]
    if (typeof bundle !== 'object' || bundle === null) continue
    const face: unknown = (bundle as Record<string, unknown>)[side]
    if (typeof face !== 'object' || face === null) continue
    const texture: unknown = (face as { texture?: unknown }).texture
    if (typeof texture !== 'object' || texture === null) continue
    const { id, path } = texture as Record<string, unknown>
    if (typeof id !== 'string' || typeof path !== 'string') continue
    return { id, path }
  }
  return null
}
