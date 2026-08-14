import type { Entity, System } from 'kernel-2d/runtime'

import { isLife } from './leak'
import { wavesWaiting } from './waves'

/**
 * Win and lose — the spec's closing nouns, said with a banner.
 *
 * *"Clear the wave list with a life remaining and it is won"*: the queue is
 * empty, nothing that walks-and-bleeds is left on the board, and a heart still
 * stands. *"Run out of lives and the level is lost"*: hearts were placed and
 * none remain. Either way this system spawns one banner at the board's centre —
 * a trophy or a skull, art the Ground prefab names under its `outcome`
 * component (`texture` fields, so the kernel loaded both with the level) — and
 * the banner's `verdict` component is the fact itself: `waves` reads it to
 * refuse further calls, a test reads it to assert the outcome, and it is
 * exactly the entities-as-the-bus shape input arrived by.
 *
 * **What each verdict requires was decided by what a level authors:**
 *
 *   - Winning requires the level to *have* a wave list — a road with hand
 *     placed monsters and no queue is a sandbox, and clearing a wave list it
 *     never had would be a trophy for pressing Play.
 *   - Losing requires the level to have placed hearts. No hearts, no way to be
 *     out of them: also a sandbox, exactly as `leak.ts` says.
 *
 * Both initial counts are taken on this system's first step, which — running
 * last in `index.ts` — is after `waves` confiscated the queue, so "how many
 * waves does this level hold" has an answer by the time anybody asks.
 *
 * The banner is spawned once and the decision never re-opens: a level that is
 * won stays won, even as a straggler walks on below the trophy.
 */
export const verdictSystem: System = {
  id: 'verdict',

  step: (entities) => {
    if (decided.has(entities)) return

    const waiting = wavesWaiting(entities)
    if (waiting === null) return

    const opening = openings.get(entities) ?? { waves: waiting, lives: entities.filter(isLife).length }
    openings.set(entities, opening)

    const lives = entities.filter(isLife).length

    if (opening.lives > 0 && lives === 0) {
      decide(entities, false)
      return
    }

    const fighting = entities.some((entity) => entity.components['health'] !== undefined)
    if (opening.waves > 0 && waiting === 0 && !fighting && lives > 0) {
      decide(entities, true)
    }
  },
}

/** What the level opened with. Run state, dead with the run (game-code T6). */
const openings = new WeakMap<readonly Entity[], { waves: number; lives: number }>()

/** The runs that have been decided. The banner says which way. */
const decided = new WeakSet<readonly Entity[]>()

function decide(entities: Entity[], won: boolean): void {
  decided.add(entities)
  entities.push(bannerFor(entities, won))
}

/**
 * The banner, standing where the `outcome`-carrying entity stands — the Ground,
 * so the centre of the board — three times life size, because token art is one
 * tile and the moment deserves more than sixteen pixels. A level with no
 * well-formed `outcome` anywhere gets the bare marker at the end: the decision
 * is still made and still readable, with nothing drawn — a level that never
 * said what winning looks like degrades, never throws (game-code T3).
 */
function bannerFor(entities: readonly Entity[], won: boolean): Entity {
  for (const entity of entities) {
    const component: unknown = entity.components['outcome']
    if (typeof component !== 'object' || component === null) continue

    const side: unknown = (component as Record<string, unknown>)[won ? 'victory' : 'defeat']
    if (typeof side !== 'object' || side === null) continue
    const texture: unknown = (side as { texture?: unknown }).texture
    if (typeof texture !== 'object' || texture === null) continue
    const { id, path } = texture as Record<string, unknown>
    if (typeof id !== 'string' || typeof path !== 'string') continue

    return {
      id: won ? 'verdict#won' : 'verdict#lost',
      name: won ? 'Victory' : 'Defeat',
      transform: { ...entity.transform, rotation: 0, scaleX: 3, scaleY: 3 },
      components: {
        sprite: { texture: { id, path } },
        verdict: { won },
      },
    }
  }

  // No outcome art anywhere: the decision still stands, carried by a bare
  // marker so `waves` and tests read the same fact either way.
  return {
    id: won ? 'verdict#won' : 'verdict#lost',
    name: won ? 'Victory' : 'Defeat',
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    components: { verdict: { won } },
  }
}
