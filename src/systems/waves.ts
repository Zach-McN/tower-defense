import { pressedIn, type Entity, type System } from 'kernel-2d/runtime'

import { distanceAlongNearest, routeThrough, type Route } from './route'

/**
 * Waves — and every one of them is drawn, not typed.
 *
 * The spec's run nouns live here: *Wave* ("an authored group of monsters: which
 * types, how many, in what order, how tightly spaced"), *Wave list*, and *Call
 * wave*. The parked question this was expected to fire — an authoring surface
 * for per-level wave data (`genre-spinup`, game-code T7's named trigger) — was
 * dodged a fourth time, by the same move as the last three: **ask what the
 * thing is before asking what would edit it.** A wave is a group of monsters,
 * a monster is placeable content, and everything the spec says a wave carries
 * is geometry:
 *
 *   - **which types** — which prefabs were placed;
 *   - **how many** — how many were placed;
 *   - **in what order, how tightly spaced** — where they stand in the queue.
 *
 * So a level's wave list is a line of monsters drawn *behind the spawn tile*,
 * off the edge of the map, in the order they will walk in — split into waves by
 * a break marker, which is a kind of thing and therefore a prefab
 * (`prefabs/wave-break.json`, the same reasoning as the road's two ends). The
 * road's arithmetic already gives "behind the spawn" a number: a queued
 * monster's distance along the road is negative (`route.ts`), which is both
 * what finds the queue and what orders it.
 *
 * **At the first step this system takes the whole queue out of the level** —
 * monsters and break markers alike — and keeps it beside the run, grouped into
 * waves. Nothing else ever sees a waiting monster: it is not walked, not shot,
 * not drawn. Break markers never come back; they are authoring punctuation.
 * A monster standing *on* the road stays exactly as it always was, which keeps
 * every earlier level and test true, and is still the way to watch one corner.
 *
 * **Call Wave is the spacebar.** The spec's "button the player presses" is a
 * press, and presses reach a system as data on the input entity the runner
 * feeds (`kernel-2d/runtime` `pressedIn`) — this game's first input, and the
 * consumer the kernel's keyboard seam was shaped by. Each press releases one
 * wave: its monsters rejoin the level exactly as drawn, slid forward as a
 * block so the leader stands just behind the spawn — the gaps inside a wave
 * are the author's, the dead ground between waves is not — and `march` walks
 * them in through the spawn mouth. No timer anywhere: an uncalled wave waits
 * forever, which is the spec's "no time pressure in the building phase".
 *
 * A level with no road has no "behind the spawn", so nothing is held and
 * nothing is released — the same silence as everything else about a broken
 * road (TG1), and the same fallback-free honesty.
 */
export const waveSystem: System = {
  id: 'waves',

  step: (entities) => {
    const waiting = queueOf(entities)
    if (waiting === null) return

    // A decided level takes no more calls: the run is over, and a wave walking
    // in past the verdict banner would be the game contradicting itself.
    if (entities.some((entity) => entity.components['verdict'] !== undefined)) return

    for (const press of pressedIn(entities)) {
      if (press !== CALL_WAVE) continue
      const wave = waiting.shift()
      if (wave === undefined) continue
      entities.push(...wave)
    }
  },
}

/**
 * How many waves are still waiting, or null before the queue has been taken —
 * which, systems running in list order, means "asked before `waves` ran".
 *
 * Exported for `verdict.ts`, which cannot know "the wave list is cleared" any
 * other way: the queue was confiscated out of the level precisely so nothing
 * else would trip over it, so the one thing that holds it answers for it.
 */
export function wavesWaiting(entities: readonly Entity[]): number | null {
  const waiting = queues.get(entities)
  return waiting === undefined ? null : waiting.length
}

/** The button. `KeyboardEvent.code`, so it is the physical spacebar anywhere. */
const CALL_WAVE = 'Space'

/** How far behind the spawn a called wave's leader starts, in scene units. */
const LEAD_IN = 8

/**
 * The waves still waiting, oldest first — worked out once per run, at the same
 * moment the queue is confiscated. Keyed on the entity list, exactly as the
 * road itself is (game-code T6): a run's waiting waves die with the run.
 */
const queues = new WeakMap<readonly Entity[], Entity[][]>()

function queueOf(entities: Entity[]): Entity[][] | null {
  const known = queues.get(entities)
  if (known !== undefined) return known

  const route = routeThrough(entities)
  if (route === null) return null

  const found = confiscate(entities, route)
  queues.set(entities, found)
  return found
}

/**
 * Takes the drawn queue out of the level and answers it as waves.
 *
 * Everything behind the spawn that walks is queued; every break marker goes
 * too, wherever it stands — one on the road is a misplacement, and quietly
 * removing it is better than a banner standing in the monsters' way.
 */
function confiscate(entities: Entity[], route: Route): Entity[][] {
  const queued = entities
    .filter((entity) => isBreak(entity) || walks(entity))
    .map((entity) => ({ entity, along: distanceAlongNearest(route, entity.transform) }))
    .filter((one) => isBreak(one.entity) || one.along < 0)
    .sort((a, b) => b.along - a.along)

  for (const one of queued) {
    const at = entities.indexOf(one.entity)
    if (at !== -1) entities.splice(at, 1)
  }

  const waves: Entity[][] = []
  let wave: Entity[] = []
  for (const one of queued) {
    if (isBreak(one.entity)) {
      if (wave.length > 0) waves.push(slidForward(wave, route))
      wave = []
      continue
    }
    wave.push(one.entity)
  }
  if (wave.length > 0) waves.push(slidForward(wave, route))

  return waves
}

/**
 * The wave as drawn, moved as one block so its leader stands `LEAD_IN` units
 * behind the spawn — along the road's own first direction, so a queue drawn on
 * the road's axis stays on it. One vector for the whole wave: the gaps and the
 * formation are the author's, and a per-monster slide would squeeze them.
 */
function slidForward(wave: Entity[], route: Route): Entity[] {
  const spawn = route.points[0]
  const next = route.points[1]
  if (spawn === undefined || next === undefined) return wave

  const along = { x: next.x - spawn.x, y: next.y - spawn.y }
  const length = Math.sqrt(along.x * along.x + along.y * along.y)
  if (length === 0) return wave

  const leader = Math.max(...wave.map((entity) => distanceAlongNearest(route, entity.transform)))
  const forward = -leader - LEAD_IN
  if (forward <= 0) return wave

  for (const entity of wave) {
    entity.transform.x += (along.x / length) * forward
    entity.transform.y += (along.y / length) * forward
  }
  return wave
}

/** Whether this entity is a wave break — punctuation in the drawn queue. */
function isBreak(entity: Entity): boolean {
  const component: unknown = entity.components['waveBreak']
  return typeof component === 'object' && component !== null
}

/** Whether this entity walks, by the same rule `march` uses: it carries a speed. */
function walks(entity: Entity): boolean {
  const component: unknown = entity.components['speed']
  if (typeof component !== 'object' || component === null) return false
  const rate: unknown = (component as { unitsPerSecond?: unknown }).unitsPerSecond
  return typeof rate === 'number' && Number.isFinite(rate)
}
