import type { Entity, System } from 'kernel-2d/runtime'

/**
 * Things that move at their own speed.
 *
 * The first behaviour this game has, and it is the first sliver of the spec's
 * central noun: *"Monster — walks the path from spawn to goal. Two things vary
 * between monsters and only two: speed and health."* Speed is half of that, and
 * this is speed.
 *
 * **It does not follow the path yet, and that is not a shortfall being hidden.**
 * There is no path in a level to follow — no tiles, no route, no spawn — so this
 * moves along the x axis, which is what "walking" reduces to on a level with
 * nothing in it. When levels carry a path, this is the system that learns to read
 * one; the component it reads and the noun it serves do not change.
 *
 * **The `speed` component is this game's, not the kernel's.** The scene format
 * tolerates components it does not know, so a game can carry data the engine has
 * never heard of and read it here. Nothing was added to the kernel to make this
 * work, which is the rule about extraction rather than anticipation actually
 * happening rather than being restated.
 *
 * ```json
 * "components": { "speed": { "unitsPerSecond": 24 } }
 * ```
 */
export const marchSystem: System = {
  id: 'march',

  step: (entities, dtSeconds) => {
    for (const entity of entities) {
      const speed = speedOf(entity)
      // Null covers both "this thing does not move" and "somebody typed something
      // that is not a speed into the file". Neither is worth stopping a level for,
      // and a system runs sixty times a second — a throw from in here is the
      // hardest kind of fault to trace back to the file that caused it.
      if (speed === null) continue

      entity.transform.x += speed * dtSeconds
    }
  },
}

/** The rate this entity walks at, or null if it does not walk. */
function speedOf(entity: Entity): number | null {
  const component: unknown = entity.components['speed']
  if (typeof component !== 'object' || component === null) return null

  const rate: unknown = (component as { unitsPerSecond?: unknown }).unitsPerSecond
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : null
}
