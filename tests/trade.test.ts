import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { buildSystem } from '../src/systems/build'
import { marchSystem } from '../src/systems/march'
import { shootSystem, towerOf } from '../src/systems/shoot'
import { archer, centre, coin, frost, grid, ground, monster, pad, road, ware } from './levels'

/**
 * The market's other two verbs — upgrade and sell — and the ware mark that
 * says which standing towers are merchandise. The build verb has its own file.
 */

const STEP = 0.25

function straightRoad(): Entity[] {
  return [...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

/** One press or one click, landed on the input entity for the next step. */
function feed(clicks: Entity, pressed: string[], clicked: { x: number; y: number }[]): void {
  clicks.components['input'] = { pressed, clicked }
}

const LADDER = [
  { price: { gold: 20 }, tower: { damage: 2 } },
  { price: { gold: 35 }, tower: { damage: 3, rangeUnits: 56 } },
]

describe('upgrade tiers', () => {
  it('a click on an owned tower buys the next rung, and the numbers rise', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    post.components['tiers'] = LADDER
    const entities = [ground(), ...straightRoad(), clicks, post, coin({ x: 200, y: 20 }, 30)]

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(towerOf(post)?.damage).toBe(2)
    // Twenty paid out of a thirty coin: ten gold of change.
    expect(entities.filter((one) => one.components['coin'] !== undefined).map((one) => one.components['coin'])).toEqual(
      [{ gold: 10 }],
    )
  })

  it('broke, the click changes nothing', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    post.components['tiers'] = LADDER
    const entities = [ground(), ...straightRoad(), clicks, post]

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(towerOf(post)?.damage).toBe(1)
  })

  it('the ladder tops out: a tower at the top takes no more gold', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    post.components['tiers'] = [{ price: { gold: 20 }, tower: { damage: 2 } }]
    const entities = [ground(), ...straightRoad(), clicks, post, coin({ x: 200, y: 20 }, 50)]

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(towerOf(post)?.damage).toBe(2)
    const purse = entities
      .map((one) => one.components['coin'])
      .filter((held): held is { gold: number } => held !== undefined)
    expect(purse.reduce((sum, held) => sum + held.gold, 0)).toBe(30)
  })

  it('the climb is shown in stars above the tower', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    post.components['tiers'] = LADDER
    const entities = [ground(), ...straightRoad(), clicks, post, coin({ x: 200, y: 20 }, 60)]

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)
    expect(entities.filter((one) => one.name === 'Tier star')).toHaveLength(1)

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)
    expect(entities.filter((one) => one.name === 'Tier star')).toHaveLength(2)
  })

  it('one malformed rung refuses the whole ladder (game-code T3)', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    post.components['tiers'] = [{ price: { gold: 20 }, tower: { damage: 2 } }, { price: 'cheap' }]
    const entities = [ground(), ...straightRoad(), clicks, post, coin({ x: 200, y: 20 }, 30)]

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(towerOf(post)?.damage).toBe(1)
    expect(entities.map((one) => one.components['coin'])).toContainEqual({ gold: 30 })
  })
})

describe('selling', () => {
  it('X then a click sells an owned tower for part of everything spent', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4), { price: 30 })
    const entities = [ground(), ...straightRoad(), clicks, post]

    feed(clicks, ['KeyX'], [])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(entities).not.toContain(post)
    // Seventy percent of thirty, rounded down.
    expect(entities.map((one) => one.components['coin'])).toContainEqual({ gold: 21 })
  })

  it('the refund counts the rungs bought, and the stars go with the tower', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4), { price: 30 })
    post.components['tiers'] = [{ price: { gold: 20 }, tower: { damage: 2 } }]
    const entities = [ground(), ...straightRoad(), clicks, post, coin({ x: 200, y: 20 }, 20)]

    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)
    feed(clicks, ['KeyX'], [])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(entities).not.toContain(post)
    expect(entities.filter((one) => one.name === 'Tier star')).toHaveLength(0)
    // Seventy percent of fifty spent: the price and the rung together.
    expect(entities.map((one) => one.components['coin'])).toContainEqual({ gold: 35 })
  })

  it('a click on nothing stands the sell down', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4), { price: 30 })
    const entities = [ground(), ...straightRoad(), clicks, post]

    feed(clicks, ['KeyX'], [])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [{ x: 300, y: 300 }])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [centre(2, 4)])
    buildSystem.step(entities, STEP)

    expect(entities).toContain(post)
  })

  it('merchandise cannot be sold', () => {
    const clicks = inputEntity()
    const shown = ware(frost({ x: 300, y: 20 }))
    const entities = [ground(), ...straightRoad(), clicks, shown]

    feed(clicks, ['KeyX'], [])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [{ x: 300, y: 20 }])
    buildSystem.step(entities, STEP)

    expect(entities).toContain(shown)
  })

  it('the selling sign replaces the golden arrow while armed', () => {
    const clicks = inputEntity()
    const entities = [ground(), ...straightRoad(), clicks, ware(archer({ x: 300, y: 20 }))]

    buildSystem.step(entities, STEP)
    const arrow = entities.find((one) => one.id === 'wares#chosen')
    expect((arrow?.components['sprite'] as { texture: { id: string } }).texture.id).toBe('chosen-texture')

    feed(clicks, ['KeyX'], [])
    buildSystem.step(entities, STEP)
    const sign = entities.find((one) => one.id === 'wares#chosen')
    expect((sign?.components['sprite'] as { texture: { id: string } }).texture.id).toBe('sell-texture')

    // A digit stands it down again.
    feed(clicks, ['Digit1'], [])
    buildSystem.step(entities, STEP)
    const back = entities.find((one) => one.id === 'wares#chosen')
    expect((back?.components['sprite'] as { texture: { id: string } }).texture.id).toBe('chosen-texture')
  })
})

describe('the ware mark', () => {
  it('a ware never shoots', () => {
    const entities = [grid(), ...straightRoad(), ware(archer(centre(2, 3))), monster(centre(2, 2), 56, 3)]

    for (let count = 0; count < 8; count += 1) shootSystem.step(entities, STEP)

    expect(entities.filter((one) => one.name === 'Arrow')).toHaveLength(0)
  })

  it('a ware chills nobody', () => {
    const walker = monster(centre(2, 2), 56, 3)
    const entities = [grid(), ...straightRoad(), ware(frost(centre(2, 3))), walker]

    const from = walker.transform.x
    marchSystem.step(entities, STEP)

    expect(walker.transform.x - from).toBeCloseTo(56 * STEP)
  })

  it('the marked row is the catalogue: standing defenders are not for sale', () => {
    const clicks = inputEntity()
    const at = centre(5, 4)
    const entities = [
      ground(),
      ...straightRoad(),
      clicks,
      archer(centre(2, 3)),
      ware(frost({ x: 300, y: 20 })),
      pad(at),
      coin({ x: 200, y: 20 }, 30),
    ]

    feed(clicks, [], [at])
    buildSystem.step(entities, STEP)

    const built = entities.find((one) => one.id.startsWith('built#'))
    expect(built?.name).toBe('Frost totem')
  })

  it('clicking a ware chooses it, and the bought copy is a defender', () => {
    const clicks = inputEntity()
    const at = centre(5, 4)
    const entities = [
      ground(),
      ...straightRoad(),
      clicks,
      ware(archer({ x: 320, y: 20 }, { price: 30 })),
      ware(frost({ x: 300, y: 20 })),
      pad(at),
      coin({ x: 200, y: 20 }, 30),
    ]

    feed(clicks, [], [{ x: 300, y: 20 }])
    buildSystem.step(entities, STEP)
    feed(clicks, [], [at])
    buildSystem.step(entities, STEP)

    const built = entities.find((one) => one.id.startsWith('built#'))
    expect(built?.name).toBe('Frost totem')
    expect(built?.components['ware']).toBeUndefined()
  })
})
