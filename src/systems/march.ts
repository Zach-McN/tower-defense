import type { Entity, System } from 'kernel-2d/runtime'

import { distanceAlongNearest, pointAlong, routeIn, type Route } from './route'

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
    const route = roadIn(entities)
    if (route === null) return

    for (const entity of entities) {
      const speed = speedOf(entity)
      // Null covers both "this thing does not walk" and "somebody typed something
      // that is not a speed into the file". Neither is worth stopping a level for,
      // and a system runs sixty times a second — a throw from in here is the
      // hardest kind of fault to trace back to the file that caused it.
      if (speed === null) continue

      // Where it had got to, or — on its first step — the point on the road
      // nearest to where the level put it. So a monster dropped halfway along the
      // road walks on from halfway rather than jumping back to the spawn.
      const from = travelled.get(entity) ?? distanceAlongNearest(route, entity.transform)
      const to = Math.min(route.length, from + speed * dtSeconds)

      travelled.set(entity, to)
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
 * The road, worked out once per run rather than once per step.
 *
 * **The spec is what makes this safe:** *"[the path] does not change, ever, during
 * play or otherwise."* The tiles a road is made of cannot move while a level is
 * running, so deriving it sixty times a second would be arriving at the same answer
 * repeatedly. Keyed on the entity list, which the engine makes once when a level
 * starts and holds for as long as it runs — so a level that is stopped and played
 * again derives its road again, and an edit made in between is picked up.
 */
const roads = new WeakMap<readonly Entity[], Route | null>()

function roadIn(entities: readonly Entity[]): Route | null {
  const known = roads.get(entities)
  if (known !== undefined) return known

  const found = routeIn(entities)
  roads.set(entities, found)
  return found
}

/** The rate this entity walks at, or null if it does not walk. */
function speedOf(entity: Entity): number | null {
  const component: unknown = entity.components['speed']
  if (typeof component !== 'object' || component === null) return null

  const rate: unknown = (component as { unitsPerSecond?: unknown }).unitsPerSecond
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null
}
