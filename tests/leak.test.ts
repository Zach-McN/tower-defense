import { describe, expect, it } from 'vitest'

import type { Entity } from 'kernel-2d/runtime'

import { leakSystem } from '../src/systems/leak'
import { centre, grid, life, monster, road } from './levels'

/** A straight road along row 2, columns 0..9. The goal sits at column 9. */
function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

const GOAL = centre(9, 2)

function names(entities: readonly Entity[]): string[] {
  return entities.map((one) => one.name)
}

describe('a monster reaching the goal', () => {
  it('leaks: it leaves the level and takes one heart with it', () => {
    const entities = [...straightRoad(), life({ x: 300, y: 100 }), monster(GOAL, 56, 3, 'Through')]

    leakSystem.step(entities, 0.25)

    expect(names(entities)).not.toContain('Through')
    expect(names(entities)).not.toContain('Life')
  })

  it('does not leak from the middle of the road', () => {
    const entities = [...straightRoad(), life({ x: 300, y: 100 }), monster(centre(4, 2), 56, 3, 'Walking')]

    leakSystem.step(entities, 0.25)

    expect(names(entities)).toContain('Walking')
    expect(names(entities)).toContain('Life')
  })

  it('still leaks out of a level with no hearts, costing nothing', () => {
    const entities = [...straightRoad(), monster(GOAL, 56, 3, 'Through')]

    expect(() => leakSystem.step(entities, 0.25)).not.toThrow()
    expect(names(entities)).not.toContain('Through')
  })

  it('empties the row from the hindmost end, not at random', () => {
    const entities = [
      ...straightRoad(),
      life({ x: 300, y: 100 }, 'Life 1'),
      life({ x: 316, y: 100 }, 'Life 2'),
      monster(GOAL, 56, 3, 'Through'),
    ]

    leakSystem.step(entities, 0.25)

    expect(names(entities)).toContain('Life 1')
    expect(names(entities)).not.toContain('Life 2')
  })

  it('does nothing on a level with no road, like everything else about one', () => {
    const stranded = [life({ x: 300, y: 100 }), monster(GOAL, 56, 3, 'Somewhere')]

    expect(() => leakSystem.step(stranded, 0.25)).not.toThrow()
    expect(names(stranded)).toContain('Somewhere')
  })
})
