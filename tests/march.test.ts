import type { Entity } from 'kernel-2d/runtime'
import { describe, expect, it } from 'vitest'

import { marchSystem } from '../src/systems/march'
import { TILE, centre, entity, grid, monster, road } from './levels'

/**
 * Monsters walking the road.
 *
 * Written in what a human watching the level would see — it set off, it turned the
 * corner, it stopped at the end — rather than in anything about how the road is
 * followed. `route.test.ts` is where the road itself is checked.
 *
 * Time is handed in rather than waited for: a system is given the size of one step,
 * so a test moves the clock by hand and the numbers stay exact.
 */

const STRAIGHT = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
] as const

const CORNER = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
] as const

/** Runs the level for a while, a step at a time. */
function run(entities: Entity[], steps: number, dtSeconds: number): void {
  for (let step = 0; step < steps; step += 1) marchSystem.step(entities, dtSeconds)
}

/** Where a thing stands now. */
function at(entity: Entity): { x: number; y: number } {
  return { x: entity.transform.x, y: entity.transform.y }
}

describe('a monster on a road', () => {
  it('sets off toward the goal at its own rate', () => {
    const walker = monster(centre(0, 0), 16)
    run([grid(), ...road(STRAIGHT), walker], 1, 0.5)

    expect(at(walker)).toEqual({ x: centre(0, 0).x + 8, y: centre(0, 0).y })
  })

  it('walks further in the same time when its type is faster', () => {
    const slow = monster(centre(0, 0), 16)
    const fast = monster(centre(0, 0), 48)
    run([grid(), ...road(STRAIGHT), slow, fast], 1, 0.5)

    expect(at(slow).x).toBe(centre(0, 0).x + 8)
    expect(at(fast).x).toBe(centre(0, 0).x + 24)
  })

  it('turns the corner rather than walking off the end of the first stretch', () => {
    // Three tiles in one second: two along the bottom, then one up past the turn.
    // Walking on in a straight line would leave it at the far end of the bottom row.
    const walker = monster(centre(0, 0), 3 * TILE)
    run([grid(), ...road(CORNER), walker], 1, 1)

    expect(at(walker)).toEqual(centre(2, 1))
  })

  it('reaches the goal and stops there', () => {
    const level = [grid(), ...road(CORNER), monster(centre(0, 0), 2 * TILE)]
    const walker = level.at(-1)
    if (walker === undefined) throw new Error('the level lost its monster')

    // Four tiles of road at two tiles a second, then a great deal longer.
    run(level, 2, 1)
    expect(at(walker)).toEqual(centre(2, 2))

    run(level, 20, 1)
    expect(at(walker)).toEqual(centre(2, 2))
  })

  it('carries on from where the level put it, rather than starting again from the spawn', () => {
    const walker = monster(centre(2, 0), 16)
    run([grid(), ...road(STRAIGHT), walker], 1, 0.5)

    expect(at(walker)).toEqual({ x: centre(2, 0).x + 8, y: centre(2, 0).y })
  })

  it('steps onto the nearest part of the road when it was put down beside one', () => {
    const walker = monster({ x: centre(2, 0).x, y: centre(2, 0).y + 40 }, 16)
    run([grid(), ...road(STRAIGHT), walker], 1, 0.5)

    expect(at(walker)).toEqual({ x: centre(2, 0).x + 8, y: centre(2, 0).y })
  })
})

describe('what does not move', () => {
  it('the road itself', () => {
    const tiles = road(CORNER)
    const before = tiles.map(at)
    run([grid(), ...tiles, monster(centre(0, 0), 64)], 30, 1)

    expect(tiles.map(at)).toEqual(before)
  })

  it('anything with no speed on it', () => {
    const tower = entity('Not a monster', 200, 200, {})
    run([grid(), ...road(STRAIGHT), tower], 10, 1)

    expect(at(tower)).toEqual({ x: 200, y: 200 })
  })

  it('a monster whose speed is not a number', () => {
    const broken = entity('Runner', centre(0, 0).x, centre(0, 0).y, { speed: { unitsPerSecond: 'fast' } })
    expect(() => run([grid(), ...road(STRAIGHT), broken], 10, 1)).not.toThrow()

    expect(at(broken)).toEqual(centre(0, 0))
  })

  it('a monster on a level whose road has a gap in it', () => {
    const walker = monster(centre(0, 0), 64)
    run(
      [
        grid(),
        ...road([
          [0, 0],
          [1, 0],
          [3, 0],
        ]),
        walker,
      ],
      10,
      1,
    )

    expect(at(walker)).toEqual(centre(0, 0))
  })

  it('a monster on a level with no road drawn at all', () => {
    const walker = monster(centre(0, 0), 64)
    run([grid(), walker], 10, 1)

    expect(at(walker)).toEqual(centre(0, 0))
  })
})
