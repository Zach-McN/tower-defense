import type { Entity, System } from 'kernel-2d/runtime'

import { distanceAlongNearest, pointAlong, routeThrough } from './route'
import { tempoOf } from './tempo'
import { isWare, slowAt } from './trade'

/**
 * Monsters walking the road, from the spawn to the goal, each at its own rate.
 *
 * The spec's central noun: *"Monster — walks the path from spawn to goal. Two
 * things vary between monsters and only two: speed and health."* This is the whole
 * of the speed half.
 *
 * **This is the system game-code T2 said would learn to read a path, and it is the
 * same system.** It kept its name, it kept the `speed` component, and nothing was
 * written beside it — only how it decides which way is forward has changed. That
 * was the named trigger and this is it firing.
 *
 * **The road comes from `route.ts`, which derives it from the tiles in the level.**
 * Nothing here knows what a tile is. Anything carrying `speed` walks, which is the
 * whole rule for what a monster is as far as this file is concerned — the spec has
 * one thing with a speed and it is the monster.
 *
 * **A monster that reaches the goal stops there.** The spec has a Leak costing a
 * life, and lives are not in this game yet, so arriving is where this ends. It is
 * not a monster standing still because something went wrong; it is a monster that
 * has finished walking, and the two look the same on screen, which is worth knowing
 * before reading anything into it.
 *
 * **A level with no road moves nothing** — no grid, no spawn or goal, a gap, a fork.
 * There is no way for a system to say so on screen, so the only sign is that
 * nothing walks. `route.ts` lists what can cause it.
 */
export const marchSystem: System = {
  id: 'march',

  step: (entities, dtSeconds) => {
    const route = routeThrough(entities)
    if (route === null) return

    // The player's speed controls, applied where time is spent (tempo.ts).
    const pace = tempoOf(entities)
    if (pace === 0) return

    for (const entity of entities) {
      const speed = speedOf(entity)
      // Null covers both "this thing does not walk" and "somebody typed something
      // that is not a speed into the file". Neither is worth stopping a level for,
      // and a system runs sixty times a second — a throw from in here is the
      // hardest kind of fault to trace back to the file that caused it.
      if (speed === null) continue

      // Where it had got to, or — on its first step — the point on the road
      // nearest to where the level put it. So a monster dropped halfway along the
      // road walks on from halfway rather than jumping back to the spawn, and one
      // placed behind the spawn starts below zero with that far still to come.
      const from = travelled.get(entity) ?? distanceAlongNearest(route, entity.transform)
      const to = Math.min(route.length, from + speed * dtSeconds * pace * chillOn(entity, entities))
      travelled.set(entity, to)

      if (to < 0) {
        // Not on the road yet: still `-to` short of the spawn, closing straight
        // toward it from wherever it is. Walking the line it already stands on —
        // rather than a lane the road prescribes — is what keeps a drawn queue's
        // shape while it files in.
        const spawn = route.points[0]
        if (spawn === undefined) continue
        const dx = entity.transform.x - spawn.x
        const dy = entity.transform.y - spawn.y
        const gap = Math.sqrt(dx * dx + dy * dy)
        if (gap === 0) continue
        entity.transform.x = spawn.x + (dx / gap) * -to
        entity.transform.y = spawn.y + (dy / gap) * -to
        continue
      }

      const standing = pointAlong(route, to)
      entity.transform.x = standing.x
      entity.transform.y = standing.y
    }
  },
}

/**
 * How far each monster has walked.
 *
 * **Kept beside the level rather than in it**, because it is the only thing here
 * that is not a fact about the game: a level says where a monster stands, and how
 * far it has got is true only of one run. Writing it into the component map would
 * put a word into levels that nothing authors and nothing means, and the engine
 * hands a system the copy it made when Play was pressed — so anything written there
 * is thrown away at Stop anyway, having briefly appeared in the Inspector as a
 * component nobody recognises.
 *
 * Weakly held, and keyed on the entity itself. Every run gets fresh copies, so a
 * run's bookkeeping dies with the run: pressing Stop and Play puts every monster
 * back at the start with nothing to reset.
 */
const travelled = new WeakMap<Entity, number>()

/**
 * How much the frost slows this walker: the strongest single aura it stands
 * in, or 1 in the open.
 *
 * The slow role is the spec's — *"drags down the speed of everything in
 * range"* — and it is an aura, not a projectile, so it lives here with the
 * walking rather than in `shoot`: a slow tower changes what moving *means*
 * near it, and the system that moves things is the one that must know. Two
 * totems do not stack: the strongest wins, because "half of a half of a half"
 * is a corridor nothing ever leaves and the spec's tight monster budget cuts
 * both ways.
 */
function chillOn(walker: Entity, entities: readonly Entity[]): number {
  let chill = 1

  for (const entity of entities) {
    // A ware's aura is a display piece's: the shop row chills nobody.
    if (isWare(entity)) continue
    const slow = slowOf(entity)
    if (slow === null) continue

    const dx = walker.transform.x - entity.transform.x
    const dy = walker.transform.y - entity.transform.y
    if (dx * dx + dy * dy > slow.rangeUnits * slow.rangeUnits) continue
    if (slow.factor < chill) chill = slow.factor
  }

  return chill
}

export interface Slow {
  rangeUnits: number
  factor: number
}

/**
 * The slow-aura component, whole or not at all (game-code T3). Exported for
 * `build.ts`, to whom a frost totem is a building like any tower.
 */
export function slowOf(entity: Entity): Slow | null {
  const component: unknown = entity.components['slow']
  if (typeof component !== 'object' || component === null) return null

  const { rangeUnits, factor } = component as Record<string, unknown>
  if (typeof rangeUnits !== 'number' || !Number.isFinite(rangeUnits) || rangeUnits <= 0) return null
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0 || factor > 1) return null
  // The authored base with every rung bought this run laid over it (trade.ts),
  // exactly as `towerOf` answers for the shooting kinds.
  return slowAt({ rangeUnits, factor }, entity)
}

/** The rate this entity walks at, or null if it does not walk. */
function speedOf(entity: Entity): number | null {
  const component: unknown = entity.components['speed']
  if (typeof component !== 'object' || component === null) return null

  const rate: unknown = (component as { unitsPerSecond?: unknown }).unitsPerSecond
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null
}
