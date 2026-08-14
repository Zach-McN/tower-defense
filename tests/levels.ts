import type { Entity } from 'kernel-2d/runtime'

/**
 * Levels to test against, built the way a level is built.
 *
 * Shared by both test files rather than written twice, because both are about the
 * same thing seen from two distances: what a drawn road *is*, and what a monster
 * does on one.
 *
 * **These are entity lists, not files.** A system is handed the entities of a
 * running level and nothing else, so a fixture that went through JSON would be
 * testing the kernel's loader on the way past — which the kernel already tests, and
 * which would make a failure here two possible faults instead of one.
 */

export const TILE = 16

/** Where the middle of a cell sits, in scene units. Scene space is y-up. */
export function centre(column: number, row: number): { x: number; y: number } {
  return { x: column * TILE + TILE / 2, y: row * TILE + TILE / 2 }
}

export function entity(name: string, x: number, y: number, components: Record<string, unknown>): Entity {
  return { id: name, name, transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 }, components }
}

/** The entity that says how big a tile is. In a real level this is the backdrop. */
export function grid(tileSize: number = TILE): Entity {
  return entity('Ground', 0, 0, { grid: { tileSize } })
}

/**
 * A run of road tiles through the given cells, the first marked as the spawn and
 * the last as the goal.
 *
 * Cells are given in walking order for the convenience of whoever is reading the
 * test — nothing under test knows that, and `scrambled` below is what proves it.
 */
export function road(cells: readonly (readonly [number, number])[]): Entity[] {
  return cells.map(([column, row], index) => {
    const at = centre(column, row)
    return entity(`Road ${index + 1}`, at.x, at.y, {
      tile: { kind: 'path' },
      ...(index === 0 ? { spawn: {} } : {}),
      ...(index === cells.length - 1 ? { goal: {} } : {}),
    })
  })
}

/**
 * One monster, standing where it was put. Hits are how much shooting it
 * survives; the name doubles as the id, so a level with two monsters names them
 * apart.
 */
export function monster(
  at: { x: number; y: number },
  unitsPerSecond: number,
  hits?: number,
  name = 'Runner',
): Entity {
  return entity(name, at.x, at.y, {
    speed: { unitsPerSecond },
    ...(hits === undefined ? {} : { health: { total: hits } }),
  })
}

/**
 * One tower, as the archer-post prefab authors one — every number overridable
 * so a test says only the number it is about.
 */
export function archer(
  at: { x: number; y: number },
  overrides: Partial<{
    rangeUnits: number
    damage: number
    shotsPerSecond: number
    projectileSpeed: number
    name: string
  }> = {},
): Entity {
  return entity(overrides.name ?? 'Archer post', at.x, at.y, {
    sprite: { texture: { id: 'archer-texture', path: 'assets/textures/towers/archer.png' } },
    tower: {
      rangeUnits: overrides.rangeUnits ?? 48,
      damage: overrides.damage ?? 1,
      shotsPerSecond: overrides.shotsPerSecond ?? 1,
      projectile: {
        texture: { id: 'arrow-texture', path: 'assets/textures/projectiles/arrow.png' },
        unitsPerSecond: overrides.projectileSpeed ?? 160,
      },
    },
  })
}

/** One heart. How many stand is how many lives the level has. */
export function life(at: { x: number; y: number }, name = 'Life'): Entity {
  return entity(name, at.x, at.y, { life: {} })
}

/**
 * The same entities in a different order.
 *
 * A fixed rotation rather than a shuffle: a test that is a different test on every
 * run is a test that fails on somebody else's machine and passes on yours.
 */
export function scrambled(entities: readonly Entity[]): Entity[] {
  return [...entities.slice(3), ...entities.slice(0, 3)].reverse()
}
