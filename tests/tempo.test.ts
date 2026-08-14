import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { marchSystem } from '../src/systems/march'
import { shootSystem } from '../src/systems/shoot'
import { tempoOf, tempoSystem } from '../src/systems/tempo'
import { archer, centre, entity, grid, monster, road } from './levels'

/**
 * The speed controls, driven in the real order: `tempo` reads the press, then
 * the time-spending systems take their scaled step.
 */

const STEP = 0.25

function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

/** The board saying what tempo art exists, as the Ground prefab does. */
function tempoArt(): Entity {
  return entity('Ground art', 160, 96, {
    tempo: {
      paused: { texture: { id: 'pause-texture', path: 'assets/textures/tokens/pause.png' } },
      fast: { texture: { id: 'fast-texture', path: 'assets/textures/tokens/fast.png' } },
    },
  })
}

function press(carrier: Entity, codes: string[]): void {
  carrier.components['input'] = { pressed: codes }
}

describe('pausing', () => {
  it('P stops the world the step it lands, and P again restarts it', () => {
    const pressed = inputEntity()
    const walker = monster(centre(2, 2), 56, 3)
    const entities = [...straightRoad(), pressed, walker]

    tempoSystem.step(entities, STEP)
    marchSystem.step(entities, STEP)
    const gone = walker.transform.x

    press(pressed, ['KeyP'])
    tempoSystem.step(entities, STEP)
    marchSystem.step(entities, STEP)
    press(pressed, [])
    tempoSystem.step(entities, STEP)
    marchSystem.step(entities, STEP)
    expect(walker.transform.x).toBe(gone)

    press(pressed, ['KeyP'])
    tempoSystem.step(entities, STEP)
    marchSystem.step(entities, STEP)
    expect(walker.transform.x).toBeGreaterThan(gone)
  })

  it('holds a tower\'s fire and hangs its arrows', () => {
    const pressed = inputEntity()
    const entities = [...straightRoad(), pressed, archer(centre(2, 3)), monster(centre(2, 2), 56, 100)]

    press(pressed, ['KeyP'])
    tempoSystem.step(entities, STEP)
    for (let count = 0; count < 40; count += 1) shootSystem.step(entities, STEP)

    expect(entities.filter((one) => one.name === 'Arrow')).toHaveLength(0)
  })

  it('shows the pause glyph while paused, and takes it away after', () => {
    const pressed = inputEntity()
    const entities = [...straightRoad(), tempoArt(), pressed]

    press(pressed, ['KeyP'])
    tempoSystem.step(entities, STEP)
    expect(entities.map((one) => one.name)).toContain('Paused')

    press(pressed, ['KeyP'])
    tempoSystem.step(entities, STEP)
    expect(entities.map((one) => one.name)).not.toContain('Paused')
  })

  it('obeys without art: a level naming no glyphs still pauses', () => {
    const pressed = inputEntity()
    const entities = [...straightRoad(), pressed]

    press(pressed, ['KeyP'])
    expect(() => tempoSystem.step(entities, STEP)).not.toThrow()
    expect(tempoOf(entities)).toBe(0)
  })
})

describe('fast-forward', () => {
  it('F triples the walking, and F again puts it back', () => {
    const pressed = inputEntity()
    const plain = monster(centre(2, 2), 56, 3)
    const entities = [...straightRoad(), pressed, plain]

    tempoSystem.step(entities, STEP)
    marchSystem.step(entities, STEP)
    const plainStride = plain.transform.x - centre(2, 2).x

    press(pressed, ['KeyF'])
    tempoSystem.step(entities, STEP)
    const before = plain.transform.x
    marchSystem.step(entities, STEP)
    expect(plain.transform.x - before).toBeCloseTo(plainStride * 3)

    press(pressed, ['KeyF'])
    tempoSystem.step(entities, STEP)
    const resumed = plain.transform.x
    marchSystem.step(entities, STEP)
    expect(plain.transform.x - resumed).toBeCloseTo(plainStride)
  })

  it('bows to pause: both toggled on is a stopped world showing the pause bars', () => {
    const pressed = inputEntity()
    const entities = [...straightRoad(), tempoArt(), pressed]

    press(pressed, ['KeyF', 'KeyP'])
    tempoSystem.step(entities, STEP)

    expect(tempoOf(entities)).toBe(0)
    expect(entities.map((one) => one.name)).toContain('Paused')
    expect(entities.map((one) => one.name)).not.toContain('Fast forward')
  })
})

describe('a run tempo never saw', () => {
  it('moves at 1x, so every other system test keeps meaning what it meant', () => {
    expect(tempoOf([grid()])).toBe(1)
  })
})
