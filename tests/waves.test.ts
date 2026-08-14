import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { marchSystem } from '../src/systems/march'
import { waveSystem } from '../src/systems/waves'
import { centre, entity, grid, monster, road } from './levels'

/**
 * Waves, drawn and called.
 *
 * The input entity in a fixture list is a level that was pressed — the exact
 * shape the runner feeds a real one, with no runner anywhere near the test.
 */

const STEP = 0.25

/** A straight road along row 2, columns 0..9. The spawn sits at x = 8. */
function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

function breakMarker(x: number, name = 'Wave break'): Entity {
  return entity(name, x, centre(0, 2).y, { waveBreak: {} })
}

/** A runner in the queue, `unitsBehind` the spawn's x. */
function queued(unitsBehind: number, name: string): Entity {
  return monster({ x: centre(0, 2).x - unitsBehind, y: centre(0, 2).y }, 56, 3, name)
}

function names(entities: readonly Entity[]): string[] {
  return entities.map((one) => one.name)
}

describe('the drawn queue', () => {
  it('is taken out of the level at the first step, break markers and all', () => {
    const entities = [
      ...straightRoad(),
      queued(16, 'Waiting'),
      breakMarker(centre(0, 2).x - 40),
      queued(56, 'Waiting too'),
      monster(centre(4, 2), 56, 3, 'Walking'),
    ]

    waveSystem.step(entities, STEP)

    expect(names(entities)).not.toContain('Waiting')
    expect(names(entities)).not.toContain('Waiting too')
    expect(names(entities)).not.toContain('Wave break')
    // A monster on the road is not in any wave. It walks, exactly as before.
    expect(names(entities)).toContain('Walking')
  })

  it('is left alone when the level has no road, because nothing means "behind the spawn"', () => {
    const entities = [queued(16, 'Somewhere'), breakMarker(0)]

    expect(() => waveSystem.step(entities, STEP)).not.toThrow()

    expect(names(entities)).toContain('Somewhere')
    expect(names(entities)).toContain('Wave break')
  })
})

describe('calling a wave', () => {
  it('releases one wave per press, in the order they were drawn', () => {
    const pressed = inputEntity()
    const entities = [
      ...straightRoad(),
      pressed,
      queued(16, 'First out'),
      breakMarker(centre(0, 2).x - 40),
      queued(56, 'Second out'),
    ]

    waveSystem.step(entities, STEP)
    expect(names(entities)).not.toContain('First out')

    pressed.components['input'] = { pressed: ['Space'] }
    waveSystem.step(entities, STEP)
    expect(names(entities)).toContain('First out')
    expect(names(entities)).not.toContain('Second out')

    // A press belongs to one step: the runner clears the carrier before the
    // next one, and so does this test.
    pressed.components['input'] = { pressed: [] }
    waveSystem.step(entities, STEP)
    expect(names(entities)).not.toContain('Second out')

    pressed.components['input'] = { pressed: ['Space'] }
    waveSystem.step(entities, STEP)
    expect(names(entities)).toContain('Second out')
  })

  it('slides a called wave up to the spawn, keeping the gaps as drawn', () => {
    const pressed = inputEntity()
    const leader = queued(100, 'Leader')
    const trailer = queued(120, 'Trailer')
    const entities = [...straightRoad(), pressed, leader, trailer]

    waveSystem.step(entities, STEP)
    pressed.components['input'] = { pressed: ['Space'] }
    waveSystem.step(entities, STEP)

    // The leader stands eight units behind the spawn however far back the wave
    // was drawn; the twenty-unit gap behind it is exactly the author's.
    expect(leader.transform.x).toBeCloseTo(centre(0, 2).x - 8)
    expect(trailer.transform.x).toBeCloseTo(centre(0, 2).x - 28)
  })

  it('releases nothing while nothing is pressed, forever', () => {
    const entities = [...straightRoad(), inputEntity(), queued(16, 'Patient')]

    for (let steps = 0; steps < 400; steps += 1) waveSystem.step(entities, STEP)

    expect(names(entities)).not.toContain('Patient')
  })

  it('a released wave walks in through the spawn', () => {
    const pressed = inputEntity()
    const walker = queued(40, 'Incoming')
    const entities = [...straightRoad(), pressed, walker]

    waveSystem.step(entities, STEP)
    marchSystem.step(entities, STEP)
    pressed.components['input'] = { pressed: ['Space'] }

    // Half a second per pair of steps at 56 units a second: released eight
    // units out, it is on the road within a second and walking east.
    for (let steps = 0; steps < 8; steps += 1) {
      waveSystem.step(entities, STEP)
      marchSystem.step(entities, STEP)
      pressed.components['input'] = { pressed: [] }
    }

    expect(names(entities)).toContain('Incoming')
    expect(walker.transform.x).toBeGreaterThan(centre(0, 2).x)
    expect(walker.transform.y).toBeCloseTo(centre(0, 2).y)
  })
})
