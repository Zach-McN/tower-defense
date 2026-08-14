import { describe, expect, it } from 'vitest'

import { doorIn, factsIn, inputEntity, storyEntity, type Entity } from 'kernel-2d/runtime'

import { portalSystem } from '../src/systems/portal'
import { verdictSystem } from '../src/systems/verdict'
import { waveSystem } from '../src/systems/waves'
import { centre, entity, grid, life, monster, road } from './levels'

/**
 * The level select and the way home: portals, and the completion facts they
 * read. The menu is a scene, a banner is a portal, a click is a door.
 */

const STEP = 0.25

/** A level banner, as the banner prefabs author one. */
function banner(at: { x: number; y: number }, scene: string, name = 'Level banner'): Entity {
  const piece = entity(name, at.x, at.y, {
    sprite: { texture: { id: 'banner-texture', path: 'assets/textures/tokens/banner-1.png' } },
    portal: {
      scene,
      reach: 16,
      done: { texture: { id: 'check-texture', path: 'assets/textures/tokens/check.png' } },
    },
  })
  piece.transform.scaleX = 2
  piece.transform.scaleY = 2
  return piece
}

describe('the menu', () => {
  it('clicking a banner asks for its level', () => {
    const clicks = inputEntity()
    const entities = [grid(), clicks, banner({ x: 120, y: 96 }, 'scenes/level-01.json')]

    clicks.components['input'] = { pressed: [], clicked: [{ x: 122, y: 98 }] }
    portalSystem.step(entities, STEP)

    expect(doorIn(entities)).toBe('scenes/level-01.json')
  })

  it('a click out of reach asks for nothing', () => {
    const clicks = inputEntity()
    const entities = [grid(), clicks, banner({ x: 120, y: 96 }, 'scenes/level-01.json')]

    clicks.components['input'] = { pressed: [], clicked: [{ x: 160, y: 96 }] }
    portalSystem.step(entities, STEP)

    expect(doorIn(entities)).toBeNull()
  })

  it('a completed level wears its check; an open one stands bare', () => {
    const done = banner({ x: 120, y: 96 }, 'scenes/level-01.json', 'Level 1')
    const open = banner({ x: 200, y: 96 }, 'scenes/level-02.json', 'Level 2')
    const entities = [
      grid(),
      storyEntity('scenes/select.json', { 'scenes/level-01.json': { won: true } }),
      done,
      open,
    ]

    portalSystem.step(entities, STEP)

    const checks = entities.filter((one) => one.id.startsWith('done#'))
    expect(checks).toHaveLength(1)
    expect(checks[0]?.id).toBe(`done#${done.id}`)
    // And a second step does not stack a second check.
    portalSystem.step(entities, STEP)
    expect(entities.filter((one) => one.id.startsWith('done#'))).toHaveLength(1)
  })
})

describe('victory and the way home', () => {
  /** A one-monster level with a story carrier, ready to be won. */
  function winnable(): Entity[] {
    const cells = [...Array(6).keys()].map((column) => [column, 2] as const)
    const home = grid()
    home.components['home'] = { scene: 'scenes/select.json' }
    return [
      home,
      ...road(cells),
      storyEntity('scenes/level-01.json'),
      life({ x: 200, y: 20 }),
      monster({ x: -10, y: centre(0, 2).y }, 56, 1),
    ]
  }

  it('winning is remembered under the scene, and the banner is a door home', () => {
    const entities = winnable()

    // First step: waves confiscates the queued monster; verdict records the
    // opening (one wave, one life).
    waveSystem.step(entities, STEP)
    verdictSystem.step(entities, STEP)

    // Call the wave out and slay it off the board, the shortest honest win.
    const clicks = inputEntity(['Space'])
    entities.push(clicks)
    waveSystem.step(entities, STEP)
    const walker = entities.find((one) => one.components['speed'] !== undefined)
    if (walker !== undefined) entities.splice(entities.indexOf(walker), 1)

    verdictSystem.step(entities, STEP)

    const won = entities.find((one) => one.components['verdict'] !== undefined)
    expect(won?.name).toBe('Victory')
    expect(factsIn(entities)).toEqual({ 'scenes/level-01.json': { won: true } })

    // The trophy carries the portal home, and clicking it opens the door.
    clicks.components['input'] = { pressed: [], clicked: [{ x: won?.transform.x ?? 0, y: won?.transform.y ?? 0 }] }
    portalSystem.step(entities, STEP)
    expect(doorIn(entities)).toBe('scenes/select.json')
  })

  it('a sandbox with no story carrier wins quietly and travels nowhere', () => {
    const entities = winnable().filter((one) => one.id !== 'run#story')

    waveSystem.step(entities, STEP)
    verdictSystem.step(entities, STEP)
    const clicks = inputEntity(['Space'])
    entities.push(clicks)
    waveSystem.step(entities, STEP)
    const walker = entities.find((one) => one.components['speed'] !== undefined)
    if (walker !== undefined) entities.splice(entities.indexOf(walker), 1)

    expect(() => {
      verdictSystem.step(entities, STEP)
    }).not.toThrow()
    expect(entities.find((one) => one.components['verdict'] !== undefined)?.name).toBe('Victory')
  })
})
