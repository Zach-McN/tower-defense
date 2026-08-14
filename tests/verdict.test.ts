import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { leakSystem } from '../src/systems/leak'
import { verdictSystem } from '../src/systems/verdict'
import { waveSystem } from '../src/systems/waves'
import { centre, grid, life, monster, road } from './levels'

/**
 * Win and lose, driven in the real system order: `waves` before `verdict`,
 * exactly as `index.ts` runs them, because the verdict reads what the step
 * left behind.
 */

const STEP = 0.25

function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

/** A runner queued behind the spawn, part of the level's one wave. */
function queued(name: string): Entity {
  return monster({ x: centre(0, 2).x - 24, y: centre(0, 2).y }, 56, 3, name)
}

function verdictIn(entities: readonly Entity[]): { won: boolean } | null {
  const banner = entities.find((one) => one.components['verdict'] !== undefined)
  return banner === undefined ? null : (banner.components['verdict'] as { won: boolean })
}

function step(entities: Entity[]): void {
  waveSystem.step(entities, STEP)
  verdictSystem.step(entities, STEP)
}

describe('winning', () => {
  it('is clearing the wave list with a life remaining', () => {
    const pressed = inputEntity()
    const prey = queued('Only monster')
    const entities = [...straightRoad(), pressed, life({ x: 300, y: 100 }), prey]

    step(entities)
    expect(verdictIn(entities)).toBeNull()

    pressed.components['input'] = { pressed: ['Space'] }
    step(entities)
    pressed.components['input'] = { pressed: [] }
    // The wave is out and fighting: no verdict while it walks.
    expect(verdictIn(entities)).toBeNull()

    // The tower's work, done by hand: the last monster dies.
    entities.splice(entities.indexOf(prey), 1)
    step(entities)

    expect(verdictIn(entities)).toEqual({ won: true })
  })

  it('is not handed to a level that authored no waves', () => {
    // A sandbox: a monster placed on the road, killed by hand. Clearing a wave
    // list the level never had is not a win.
    const walker = monster(centre(4, 2), 56, 3, 'Walker')
    const entities = [...straightRoad(), life({ x: 300, y: 100 }), walker]

    step(entities)
    entities.splice(entities.indexOf(walker), 1)
    step(entities)

    expect(verdictIn(entities)).toBeNull()
  })

  it('waits while a wave is still uncalled', () => {
    const entities = [...straightRoad(), inputEntity(), life({ x: 300, y: 100 }), queued('Uncalled')]

    for (let count = 0; count < 20; count += 1) step(entities)

    expect(verdictIn(entities)).toBeNull()
  })

  it('decides once, and the banner does not multiply', () => {
    const pressed = inputEntity()
    const prey = queued('Only monster')
    const entities = [...straightRoad(), pressed, life({ x: 300, y: 100 }), prey]

    step(entities)
    pressed.components['input'] = { pressed: ['Space'] }
    step(entities)
    pressed.components['input'] = { pressed: [] }
    entities.splice(entities.indexOf(prey), 1)
    for (let count = 0; count < 10; count += 1) step(entities)

    expect(entities.filter((one) => one.components['verdict'] !== undefined)).toHaveLength(1)
  })
})

describe('losing', () => {
  it('is running out of the hearts the level placed', () => {
    const entities = [
      ...straightRoad(),
      inputEntity(),
      life({ x: 300, y: 100 }, 'Life 1'),
      life({ x: 316, y: 100 }, 'Life 2'),
      queued('Still waiting'),
      monster(centre(9, 2), 56, 3, 'Leaker 1'),
      monster(centre(9, 2), 56, 3, 'Leaker 2'),
    ]

    step(entities)
    expect(verdictIn(entities)).toBeNull()

    leakSystem.step(entities, STEP)
    step(entities)

    expect(verdictIn(entities)).toEqual({ won: false })
  })

  it('cannot befall a level that placed no hearts', () => {
    const entities = [...straightRoad(), inputEntity(), queued('Still waiting'), monster(centre(9, 2), 56, 3, 'Leaker')]

    leakSystem.step(entities, STEP)
    for (let count = 0; count < 5; count += 1) step(entities)

    expect(verdictIn(entities)).toBeNull()
  })

  it('closes the gates: a decided level releases no more waves', () => {
    const pressed = inputEntity()
    const entities = [
      ...straightRoad(),
      pressed,
      life({ x: 300, y: 100 }),
      queued('Never released'),
      monster(centre(9, 2), 56, 3, 'Leaker'),
    ]

    step(entities)
    leakSystem.step(entities, STEP)
    step(entities)
    expect(verdictIn(entities)).toEqual({ won: false })

    pressed.components['input'] = { pressed: ['Space'] }
    step(entities)

    expect(entities.map((one) => one.name)).not.toContain('Never released')
  })
})
