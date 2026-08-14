import type { Entity, System } from 'kernel-2d/runtime'

import { routeThrough } from './route'

/**
 * The leak: a monster reaching the goal costs a life.
 *
 * The spec's noun, exactly — *"Leak — a monster reaching the goal. Costs one
 * life."* — and the other half of what lives are. **A life is drawn**, like
 * everything else authored in this game: the level places heart tokens
 * (`prefabs/life.json`, a sprite and an empty `life` marker — T7's shape a
 * third time), and how many stand is how many lives the level has. A leak
 * removes the leaked monster and one heart; the count on screen *is* the
 * counter, and there is nothing else keeping score.
 *
 * A monster has leaked when it stands on the goal tile — within half a tile of
 * the road's end, which is where `march` walks it to and stops. Removing it is
 * what ends the old scaffolding behaviour of towers shooting a monster that
 * has already finished: an arrived monster is not a target, it is a cost that
 * has been paid.
 *
 * **A level with no hearts placed cannot lose, and that is content, not a
 * bug** — lives are authored, and a level that authors none has said "this one
 * is a sandbox". Monsters still leak out of it; there is simply nothing for
 * the leak to cost. What zero hearts *means* when some were placed is
 * `verdict.ts`'s question, not this one's.
 */
export const leakSystem: System = {
  id: 'leak',

  step: (entities) => {
    const route = routeThrough(entities)
    if (route === null) return

    const goal = route.points[route.points.length - 1]
    if (goal === undefined) return

    const leaked = entities.filter((entity) => isMonster(entity) && standsOn(entity, goal))
    for (const monster of leaked) {
      const at = entities.indexOf(monster)
      if (at !== -1) entities.splice(at, 1)

      // The hindmost heart in the list goes first, so the row the author drew
      // empties from one end rather than at random.
      const heart = [...entities].reverse().find(isLife)
      if (heart !== undefined) {
        const held = entities.indexOf(heart)
        if (held !== -1) entities.splice(held, 1)
      }
    }
  },
}

/** Half a tile: standing on the goal tile, not merely walking past its edge. */
const ON_GOAL = 8

function standsOn(entity: Entity, goal: { x: number; y: number }): boolean {
  const dx = entity.transform.x - goal.x
  const dy = entity.transform.y - goal.y
  return dx * dx + dy * dy <= ON_GOAL * ON_GOAL
}

/** A monster, for leaking purposes: it walks. The same rule `march` answers to. */
function isMonster(entity: Entity): boolean {
  const component: unknown = entity.components['speed']
  if (typeof component !== 'object' || component === null) return false
  const rate: unknown = (component as { unitsPerSecond?: unknown }).unitsPerSecond
  return typeof rate === 'number' && Number.isFinite(rate)
}

/** A heart on the board (game-code T3: malformed means not one). */
export function isLife(entity: Entity): boolean {
  const component: unknown = entity.components['life']
  return typeof component === 'object' && component !== null
}
