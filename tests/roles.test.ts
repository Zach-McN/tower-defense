import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { buildSystem } from '../src/systems/build'
import { marchSystem } from '../src/systems/march'
import { shootSystem } from '../src/systems/shoot'
import { archer, centre, coin, frost, grid, mage, monster, pad, road } from './levels'

/**
 * The splash and slow roles, and choosing between wares — the spec's answer to
 * a packed wave, its answer to a fast one, and the number keys that pick.
 */

const STEP = 0.25

function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

describe('the splash role', () => {
  it('one bolt lands on the whole huddle', () => {
    const near = monster(centre(2, 2), 56, 1, 'Near')
    const packed = monster({ x: centre(2, 2).x + 10, y: centre(2, 2).y }, 56, 1, 'Packed')
    const entities = [...straightRoad(), mage(centre(2, 4)), near, packed]

    for (let count = 0; count < 8; count += 1) shootSystem.step(entities, STEP)

    expect(entities).not.toContain(near)
    expect(entities).not.toContain(packed)
  })

  it('spares what stands outside the splash', () => {
    const target = monster(centre(2, 2), 56, 1, 'Target')
    const apart = monster(centre(4, 2), 56, 1, 'Apart')
    const entities = [...straightRoad(), mage(centre(2, 4), { splashUnits: 12 }), target, apart]

    // Two seconds: one bolt. The lone target dies; the monster two tiles off
    // is outside twelve units of splash — and outside the spire's range once
    // the target is gone, so it stands.
    for (let count = 0; count < 8; count += 1) shootSystem.step(entities, STEP)

    expect(entities).not.toContain(target)
    expect(entities).toContain(apart)
  })

  it('every monster the splash kills drops its own coin', () => {
    const near = monster(centre(2, 2), 56, 1, 'Near')
    const packed = monster({ x: centre(2, 2).x + 10, y: centre(2, 2).y }, 56, 1, 'Packed')
    for (const one of [near, packed]) {
      one.components['bounty'] = { gold: 5, texture: { id: 'coin-texture', path: 'assets/textures/tokens/coin.png' } }
    }
    const entities = [...straightRoad(), mage(centre(2, 4)), near, packed]

    for (let count = 0; count < 8; count += 1) shootSystem.step(entities, STEP)

    expect(entities.filter((one) => one.name === 'Coin')).toHaveLength(2)
  })
})

describe('the slow role', () => {
  it('drags down everything in range, and lets go beyond it', () => {
    const chilled = monster(centre(2, 2), 56, 3, 'Chilled')
    const free = monster(centre(8, 2), 56, 3, 'Free')
    const entities = [...straightRoad(), frost(centre(2, 3)), chilled, free]

    const chilledFrom = chilled.transform.x
    const freeFrom = free.transform.x
    marchSystem.step(entities, STEP)

    // Half speed under the aura; full speed out in the open.
    expect(chilled.transform.x - chilledFrom).toBeCloseTo((56 * STEP) / 2)
    expect(free.transform.x - freeFrom).toBeCloseTo(56 * STEP)
  })

  it('does not stack: the strongest single aura wins', () => {
    const walker = monster(centre(2, 2), 56, 3)
    const entities = [
      ...straightRoad(),
      frost(centre(2, 3), { factor: 0.5, name: 'Totem A' }),
      frost(centre(3, 3), { factor: 0.5, name: 'Totem B' }),
      walker,
    ]

    const from = walker.transform.x
    marchSystem.step(entities, STEP)

    expect(walker.transform.x - from).toBeCloseTo((56 * STEP) / 2)
  })

  it('a totem never shoots', () => {
    const entities = [...straightRoad(), frost(centre(2, 3)), monster(centre(2, 2), 56, 3)]

    for (let count = 0; count < 8; count += 1) shootSystem.step(entities, STEP)

    expect(entities.filter((one) => one.name === 'Arrow')).toHaveLength(0)
  })
})

describe('choosing a ware', () => {
  function shop(): { entities: Entity[]; clicks: Entity; at: { x: number; y: number } } {
    const clicks = inputEntity()
    const at = centre(5, 4)
    const entities = [
      ...straightRoad(),
      clicks,
      archer(centre(2, 3), { price: 30 }),
      frost({ x: 300, y: 20 }),
      pad(at),
      coin({ x: 200, y: 20 }, 30, 'Coin A'),
      coin({ x: 210, y: 20 }, 30, 'Coin B'),
    ]
    return { entities, clicks, at }
  }

  it('a click builds the first kind on show until a key says otherwise', () => {
    const { entities, clicks, at } = shop()

    clicks.components['input'] = { pressed: [], clicked: [{ x: at.x, y: at.y }] }
    buildSystem.step(entities, STEP)

    const built = entities.find((one) => one.id.startsWith('built#'))
    expect(built?.name).toBe('Archer post')
  })

  it('Digit2 chooses the second kind, and the click buys that instead', () => {
    const { entities, clicks, at } = shop()

    clicks.components['input'] = { pressed: ['Digit2'], clicked: [] }
    buildSystem.step(entities, STEP)
    clicks.components['input'] = { pressed: [], clicked: [{ x: at.x, y: at.y }] }
    buildSystem.step(entities, STEP)

    const built = entities.find((one) => one.id.startsWith('built#'))
    expect(built?.name).toBe('Frost totem')
    // A totem at 25 out of a 30 coin: five gold of change.
    expect(
      entities.filter((one) => one.components['coin'] !== undefined).map((one) => one.components['coin']),
    ).toContainEqual({ gold: 5 })
  })

  it('a key past the end of the catalogue changes nothing', () => {
    const { entities, clicks, at } = shop()

    clicks.components['input'] = { pressed: ['Digit9'], clicked: [] }
    buildSystem.step(entities, STEP)
    clicks.components['input'] = { pressed: [], clicked: [{ x: at.x, y: at.y }] }
    buildSystem.step(entities, STEP)

    expect(entities.find((one) => one.id.startsWith('built#'))?.name).toBe('Archer post')
  })

  it('a built totem chills: the bought copy is the whole building', () => {
    const { entities, clicks, at } = shop()
    const walker = monster(centre(5, 2), 56, 50, 'Walker')
    entities.push(walker)

    clicks.components['input'] = { pressed: ['Digit2'], clicked: [] }
    buildSystem.step(entities, STEP)
    clicks.components['input'] = { pressed: [], clicked: [{ x: at.x, y: at.y }] }
    buildSystem.step(entities, STEP)

    const from = walker.transform.x
    marchSystem.step(entities, STEP)
    expect(walker.transform.x - from).toBeCloseTo((56 * STEP) / 2)
  })
})
