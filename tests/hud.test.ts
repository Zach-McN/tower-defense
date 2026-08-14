import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { buildSystem } from '../src/systems/build'
import { hudSystem } from '../src/systems/hud'
import { routeThrough } from '../src/systems/route'
import { tempoSystem } from '../src/systems/tempo'
import { archer, centre, coin, frost, grid, ground, pad, road, scenery, ware } from './levels'

/**
 * The paused planning overlay, and the scenery tile kind. Pause is when the
 * player looks at the board, so pause is when the board explains itself.
 */

const STEP = 0.25

function straightRoad(): Entity[] {
  return [...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

/** Presses P, so the run is paused for everything after. */
function pause(entities: Entity[], clicks: Entity): void {
  clicks.components['input'] = { pressed: ['KeyP'], clicked: [] }
  tempoSystem.step(entities, STEP)
  clicks.components['input'] = { pressed: [], clicked: [] }
}

describe('the planning overlay', () => {
  it('pausing rings every owned tower with its reach', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    const entities = [ground(), ...straightRoad(), clicks, post]

    pause(entities, clicks)
    hudSystem.step(entities, STEP)

    const ring = entities.find((one) => one.id === `hud#ring#${post.id}`)
    expect(ring).toBeDefined()
    // The ring texture's radius is 22; scaled so the drawn radius is 48 units.
    expect(ring?.transform.scaleX).toBeCloseTo(48 / 22)
  })

  it('unpausing takes the whole overlay down', () => {
    const clicks = inputEntity()
    const entities = [ground(), ...straightRoad(), clicks, archer(centre(2, 4))]

    pause(entities, clicks)
    hudSystem.step(entities, STEP)
    expect(entities.some((one) => one.id.startsWith('hud#'))).toBe(true)

    pause(entities, clicks)
    hudSystem.step(entities, STEP)
    expect(entities.some((one) => one.id.startsWith('hud#'))).toBe(false)
  })

  it('a vacant pad previews the chosen ware; an occupied one does not', () => {
    const clicks = inputEntity()
    const open = pad(centre(5, 4), 'Open pad')
    const taken = pad(centre(7, 4), 'Taken pad')
    const entities = [
      ground(),
      ...straightRoad(),
      clicks,
      ware(frost({ x: 300, y: 20 })),
      open,
      taken,
      archer(centre(7, 4), { name: 'Squatter' }),
    ]

    pause(entities, clicks)
    hudSystem.step(entities, STEP)

    // The frost totem's aura reaches 36; the pale ring says so on the open pad.
    const preview = entities.find((one) => one.id === `hud#pad#${open.id}`)
    expect(preview?.transform.scaleX).toBeCloseTo(36 / 22)
    expect(entities.find((one) => one.id === `hud#pad#${taken.id}`)).toBeUndefined()
  })

  it('the next rung price hangs over the tower, and follows a climb', () => {
    const clicks = inputEntity()
    const post = archer(centre(2, 4))
    post.components['tiers'] = [
      { price: { gold: 20 }, tower: { damage: 2 } },
      { price: { gold: 35 }, tower: { damage: 3 } },
    ]
    const entities = [ground(), ...straightRoad(), clicks, post, coin({ x: 200, y: 20 }, 20)]

    pause(entities, clicks)
    hudSystem.step(entities, STEP)

    const tag = (): string =>
      entities
        .filter((one) => one.id.startsWith(`hud#price#${post.id}`))
        .map((one) => ((one.components['sprite'] as { texture: { id: string } }).texture.id.match(/digit-(\d)/) ?? [])[1])
        .join('')
    expect(tag()).toBe('20')

    // Buy the rung (paused building is the intended rhythm); the tag moves on.
    clicks.components['input'] = { pressed: [], clicked: [centre(2, 4)] }
    buildSystem.step(entities, STEP)
    hudSystem.step(entities, STEP)
    expect(tag()).toBe('35')
  })

  it('the keys legend appears with the pause and only then', () => {
    const clicks = inputEntity()
    const entities = [ground(), ...straightRoad(), clicks]

    hudSystem.step(entities, STEP)
    expect(entities.find((one) => one.id === 'hud#legend')).toBeUndefined()

    pause(entities, clicks)
    hudSystem.step(entities, STEP)
    expect(entities.find((one) => one.id === 'hud#legend')).toBeDefined()
  })

  it('a decided level explains nothing: the overlay stays down', () => {
    const clicks = inputEntity()
    const entities = [
      ground(),
      ...straightRoad(),
      clicks,
      archer(centre(2, 4)),
      { id: 'verdict#won', name: 'Victory', transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, components: { verdict: { won: true } } },
    ]

    pause(entities, clicks)
    hudSystem.step(entities, STEP)

    expect(entities.some((one) => one.id.startsWith('hud#'))).toBe(false)
  })

  it('a level whose Ground names no overlay art shows nothing and refuses nothing', () => {
    const clicks = inputEntity()
    const entities = [grid(), ...straightRoad(), clicks, archer(centre(2, 4))]

    pause(entities, clicks)
    expect(() => {
      hudSystem.step(entities, STEP)
    }).not.toThrow()
    expect(entities.some((one) => one.id.startsWith('hud#ring'))).toBe(false)
  })
})

describe('the scenery tile kind', () => {
  it('is not walked on: a tree beside the road neither forks nor joins it', () => {
    const entities = [grid(), ...straightRoad(), scenery(centre(4, 3))]

    expect(routeThrough(entities)).not.toBeNull()
  })

  it('cannot be built on: a click on scenery buys nothing', () => {
    const clicks = inputEntity()
    const tree = scenery(centre(5, 4))
    const entities = [
      ground(),
      ...straightRoad(),
      clicks,
      ware(archer({ x: 300, y: 20 }, { price: 30 })),
      tree,
      coin({ x: 200, y: 20 }, 30),
    ]

    clicks.components['input'] = { pressed: [], clicked: [centre(5, 4)] }
    buildSystem.step(entities, STEP)

    expect(entities.some((one) => one.id.startsWith('built#'))).toBe(false)
    expect(entities.map((one) => one.components['coin'])).toContainEqual({ gold: 30 })
  })
})
