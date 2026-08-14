import { describe, expect, it } from 'vitest'

import type { Entity } from 'kernel-2d/runtime'

import { shootSystem } from '../src/systems/shoot'
import { archer, centre, entity, grid, monster, road } from './levels'

/**
 * Combat, driven by hand: a clock moved in whole steps over plain entity lists,
 * with no renderer and no files (same grounds as `march.test.ts`).
 *
 * Time in these tests is coarse on purpose — quarter-second steps, not
 * sixtieths. The system must be right at any step size, and a test written in
 * frames would quietly encode one.
 */

const STEP = 0.25

/** A straight road along row 2, columns 0..9. Spawn on the left. */
function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

function step(entities: Entity[], seconds: number): void {
  for (let spent = 0; spent < seconds - 1e-9; spent += STEP) shootSystem.step(entities, STEP)
}

function arrowsIn(entities: readonly Entity[]): Entity[] {
  return entities.filter((one) => one.name === 'Arrow')
}

describe('a tower firing', () => {
  it('shoots a monster in range, and the arrow is a drawable entity', () => {
    const entities = [...straightRoad(), archer(centre(2, 3)), monster(centre(2, 2), 56, 3)]

    shootSystem.step(entities, STEP)

    const arrows = arrowsIn(entities)
    expect(arrows).toHaveLength(1)
    const arrow = arrows[0]
    if (arrow === undefined) throw new Error('no arrow')
    // Born at the tower, wearing the texture the tower's component names —
    // which the kernel loaded with the level for exactly this moment.
    expect(arrow.transform.x).toBe(centre(2, 3).x)
    expect(arrow.components['sprite']).toEqual({
      texture: { id: 'arrow-texture', path: 'assets/textures/projectiles/arrow.png' },
    })
  })

  it('does not shoot a monster beyond its range', () => {
    // The tower sits at column 2; the monster nine columns away.
    const entities = [...straightRoad(), archer(centre(2, 3), { rangeUnits: 48 }), monster(centre(9, 2), 56, 3)]

    step(entities, 2)

    expect(arrowsIn(entities)).toHaveLength(0)
  })

  it('fires at its own rate, not once per step', () => {
    const entities = [...straightRoad(), archer(centre(2, 3), { shotsPerSecond: 1, projectileSpeed: 0.0001 }), monster(centre(2, 2), 56, 100)]

    // Three seconds of quarter-second steps. Arrows are too slow to ever land,
    // so every one loosed is still in the air to be counted.
    step(entities, 3)

    expect(arrowsIn(entities)).toHaveLength(3)
  })

  it('prefers the monster farthest along the road', () => {
    const behind = monster(centre(1, 2), 56, 3, 'Behind')
    const ahead = monster(centre(3, 2), 56, 3, 'Ahead')
    const entities = [...straightRoad(), archer(centre(2, 3), { rangeUnits: 80 }), behind, ahead]

    shootSystem.step(entities, STEP)

    // The arrow aims right, toward the monster nearer the goal — even though
    // both are equally close to the tower.
    const arrow = arrowsIn(entities)[0]
    if (arrow === undefined) throw new Error('no arrow')
    expect(Math.abs(arrow.transform.rotation)).toBeLessThan(90)
  })

  it('shoots nothing when nothing carries health', () => {
    // A road and a walking monster with no health component: not a monster as
    // far as combat is concerned. Nothing is thrown and nothing is fired.
    const entities = [...straightRoad(), archer(centre(2, 3)), monster(centre(2, 2), 56)]

    step(entities, 2)

    expect(arrowsIn(entities)).toHaveLength(0)
  })

  it('ignores a tower component somebody mangled by hand', () => {
    const mangled = entity('Broken post', centre(2, 3).x, centre(2, 3).y, {
      tower: { rangeUnits: '48', projectile: 'arrow.png' },
    })
    const entities = [...straightRoad(), mangled, monster(centre(2, 2), 56, 3)]

    expect(() => step(entities, 2)).not.toThrow()
    expect(arrowsIn(entities)).toHaveLength(0)
  })
})

describe('an arrow landing', () => {
  it('kills a one-hit monster, and both leave the level', () => {
    const prey = monster(centre(2, 2), 56, 1)
    const entities = [...straightRoad(), archer(centre(2, 3)), prey]

    step(entities, 2)

    expect(entities).not.toContain(prey)
    expect(arrowsIn(entities)).toHaveLength(0)
  })

  it('takes as many hits as the monster has health', () => {
    const prey = monster(centre(2, 2), 56, 3)
    // A fast-firing tower so the whole fight fits in a few seconds.
    const entities = [...straightRoad(), archer(centre(2, 3), { shotsPerSecond: 4 }), prey]

    step(entities, 0.5)
    expect(entities).toContain(prey)

    step(entities, 2.5)
    expect(entities).not.toContain(prey)
  })

  it('fades with a target another arrow already killed', () => {
    const prey = monster(centre(2, 2), 56, 1)
    const left = archer(centre(1, 3), { name: 'Left post' })
    const right = archer(centre(3, 3), { name: 'Right post' })
    const entities = [...straightRoad(), left, right, prey]

    // Both towers loose at the same monster; one arrow lands first and kills
    // it. The other must vanish, not strike a corpse or throw.
    expect(() => step(entities, 3)).not.toThrow()

    expect(entities).not.toContain(prey)
    expect(arrowsIn(entities)).toHaveLength(0)
  })

  it('still aims without a road, at the nearest monster instead', () => {
    // No grid, no road: route.ts answers null, and towers fall back to nearest.
    const near = monster(centre(2, 2), 56, 1, 'Near')
    const far = monster(centre(4, 2), 56, 1, 'Far')
    const entities = [archer(centre(2, 3), { rangeUnits: 80 }), near, far]

    // One second: long enough for the first arrow to land, short enough that
    // the second shot — which retargets the survivor — has not landed yet.
    step(entities, 1)

    expect(entities).not.toContain(near)
    expect(entities).toContain(far)
  })
})
