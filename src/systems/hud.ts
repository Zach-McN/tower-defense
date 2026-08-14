import type { Entity, System } from 'kernel-2d/runtime'

import { chosenOf, occupied } from './build'
import { slowOf } from './march'
import { towerOf } from './shoot'
import { tempoOf } from './tempo'
import { isWare, nextRungOf, priceOf } from './trade'

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
 *   - **What would the next rung cost?** Gold digits above every owned tower
 *     that has one left to buy — the price the next click would pay — and
 *     above the chosen ware, its build price. Digits are ten tiny textures
 *     the Ground names under `digits`, composed side by side, because a
 *     price is a number and numbers are made of digits (the same
 *     picture-is-the-data reading as everything else on this board).
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
  const chars = [...String(Math.floor(price))]
  const digits: Entity[] = []
  for (const [index, char] of chars.entries()) {
    const art = artOf(entities, 'digits', char)
    if (art === null) return []
    digits.push(sprite(`${id}#${String(index)}`, 'Price', x + (index - (chars.length - 1) / 2) * 5, y, art, 1))
  }
  return digits
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
