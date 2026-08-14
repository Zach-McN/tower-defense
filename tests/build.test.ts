import { describe, expect, it } from 'vitest'

import { inputEntity, type Entity } from 'kernel-2d/runtime'

import { buildSystem } from '../src/systems/build'
import { shootSystem } from '../src/systems/shoot'
import { archer, centre, coin, grid, monster, pad, road } from './levels'

/**
 * Building, driven by clicks a fixture places on the input entity — scene
 * points, exactly as the runner would hand them in.
 */

const STEP = 0.25

function straightRoad(): Entity[] {
  return [grid(), ...road([...Array(10).keys()].map((column) => [column, 2] as const))]
}

/** A level ready to build in: a road, a shop-piece archer, a pad, and a purse. */
function readyToBuild(gold: number[]): { entities: Entity[]; clicks: Entity; at: { x: number; y: number } } {
  const clicks = inputEntity()
  const at = centre(5, 4)
  const entities = [
    ...straightRoad(),
    clicks,
    archer(centre(2, 3), { price: 30 }),
    pad(at),
    ...gold.map((worth, index) => coin({ x: 200 + index * 10, y: 20 }, worth, `Coin ${String(index)}`)),
  ]
  return { entities, clicks, at }
}

function click(clicks: Entity, at: { x: number; y: number }): void {
  clicks.components['input'] = { pressed: [], clicked: [{ x: at.x, y: at.y }] }
}

function towersIn(entities: readonly Entity[]): Entity[] {
  return entities.filter((one) => one.components['tower'] !== undefined)
}

function coinsIn(entities: readonly Entity[]): number[] {
  return entities
    .filter((one) => one.components['coin'] !== undefined)
    .map((one) => (one.components['coin'] as { gold: number }).gold)
}

describe('a click on a vacant pad', () => {
  it('builds a copy of the tower the level shows, and the coins pay for it', () => {
    const { entities, clicks, at } = readyToBuild([20, 5, 5])

    click(clicks, at)
    buildSystem.step(entities, STEP)

    const towers = towersIn(entities)
    expect(towers).toHaveLength(2)
    const built = towers[1]
    expect(built?.transform.x).toBe(at.x)
    expect(built?.transform.y).toBe(at.y)
    expect(coinsIn(entities)).toEqual([])
  })

  it('drops change when the coins overshoot the price', () => {
    const { entities, clicks, at } = readyToBuild([20, 20])

    click(clicks, at)
    buildSystem.step(entities, STEP)

    expect(towersIn(entities)).toHaveLength(2)
    // Forty paid for a thirty-gold post: one ten-gold coin comes back.
    expect(coinsIn(entities)).toEqual([10])
  })

  it('a built tower is a whole tower: it shoots', () => {
    const { entities, clicks, at } = readyToBuild([30])
    entities.push(monster(centre(5, 2), 56, 50, 'Target'))

    click(clicks, at)
    buildSystem.step(entities, STEP)
    // Only the built tower is in range of the monster at column 5 — the shop
    // piece back at column 2 cannot reach it, so this one arrow is the copy's.
    shootSystem.step(entities, STEP)

    expect(entities.filter((one) => one.name === 'Arrow')).toHaveLength(1)
  })
})

describe('a click that buys nothing', () => {
  it('does nothing when the coins fall short, and keeps them', () => {
    const { entities, clicks, at } = readyToBuild([20, 5])

    click(clicks, at)
    buildSystem.step(entities, STEP)

    expect(towersIn(entities)).toHaveLength(1)
    expect(coinsIn(entities)).toEqual([20, 5])
  })

  it('does nothing off a pad, however rich the board', () => {
    const { entities, clicks } = readyToBuild([20, 20, 20])

    click(clicks, { x: centre(7, 5).x, y: centre(7, 5).y })
    buildSystem.step(entities, STEP)

    expect(towersIn(entities)).toHaveLength(1)
  })

  it('does nothing on a pad already built on: one tower per tile', () => {
    const { entities, clicks, at } = readyToBuild([30, 30])

    click(clicks, at)
    buildSystem.step(entities, STEP)
    click(clicks, at)
    buildSystem.step(entities, STEP)

    expect(towersIn(entities)).toHaveLength(2)
    expect(coinsIn(entities)).toEqual([30])
  })

  it('does nothing in a level that shows no tower to copy', () => {
    const clicks = inputEntity()
    const at = centre(5, 4)
    const entities = [...straightRoad(), clicks, pad(at), coin({ x: 200, y: 20 }, 100)]

    click(clicks, at)
    buildSystem.step(entities, STEP)

    expect(towersIn(entities)).toHaveLength(0)
    expect(coinsIn(entities)).toEqual([100])
  })

  it('does nothing on a decided level', () => {
    const { entities, clicks, at } = readyToBuild([30])
    entities.push({
      id: 'verdict#won',
      name: 'Victory',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      components: { verdict: { won: true } },
    })

    click(clicks, at)
    buildSystem.step(entities, STEP)

    expect(towersIn(entities)).toHaveLength(1)
    expect(coinsIn(entities)).toEqual([30])
  })
})
