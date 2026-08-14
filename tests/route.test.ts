import { describe, expect, it } from 'vitest'

import { distanceAlongNearest, pointAlong, routeIn, type Route } from '../src/systems/route'
import { TILE, centre, entity, grid, road, scrambled } from './levels'

/**
 * What a drawn road is.
 *
 * Every test here is written in the units a level is drawn in — cells, tiles, and
 * the order somebody would walk them — because that is what the thing being
 * checked is about. Not one of them reaches into how the road is worked out.
 *
 * The load-bearing one is `works out the order from where the tiles are, not from
 * the order the level lists them in`. An implementation that quietly used list
 * order would pass every other test in this file, because everything else builds
 * its levels in walking order for readability.
 */

/** A road under test, with the "there is no road" case ruled out first. */
function must(route: Route | null): Route {
  if (route === null) throw new Error('expected this level to describe a road')
  return route
}

const STRAIGHT = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
] as const

const CORNER = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
] as const

describe('a road drawn on a level', () => {
  it('runs from the spawn tile to the goal tile', () => {
    const route = must(routeIn([grid(), ...road(STRAIGHT)]))

    expect(route.points[0]).toEqual(centre(0, 0))
    expect(route.points.at(-1)).toEqual(centre(3, 0))
    expect(route.points).toHaveLength(4)
  })

  it('is as long as the tiles it runs through', () => {
    expect(must(routeIn([grid(), ...road(STRAIGHT)])).length).toBe(3 * TILE)
  })

  it('turns corners', () => {
    const route = must(routeIn([grid(), ...road(CORNER)]))

    expect(route.points).toEqual([centre(0, 0), centre(1, 0), centre(2, 0), centre(2, 1), centre(2, 2)])
    expect(route.length).toBe(4 * TILE)
  })

  it('works out the order from where the tiles are, not from the order the level lists them in', () => {
    const inOrder = must(routeIn([grid(), ...road(CORNER)]))
    const jumbled = must(routeIn(scrambled([grid(), ...road(CORNER)])))

    expect(jumbled.points).toEqual(inOrder.points)
  })

  it('forgives a tile dropped a few units out of line', () => {
    // What dragging a tile without a grid snap actually produces. Four units on a
    // sixteen-unit tile: visibly off, unmistakably still the road.
    const nudged = road(STRAIGHT)
    const middle = nudged[1]
    if (middle !== undefined) middle.transform.y += 4

    const route = must(routeIn([grid(), ...nudged]))

    expect(route.points).toHaveLength(4)
    expect(route.points[1]).toEqual({ x: centre(1, 0).x, y: centre(1, 0).y + 4 })
  })
})

describe('a level that does not describe a road', () => {
  const nothing = (entities: Parameters<typeof routeIn>[0]): void => {
    expect(routeIn(entities)).toBeNull()
  }

  it('has a gap in it', () => {
    nothing([
      grid(),
      ...road([
        [0, 0],
        [1, 0],
        [3, 0],
      ]),
    ])
  })

  it('forks', () => {
    // A third tile beside the middle of the road: two ways onward, and no walking
    // order anybody could have meant. This is the spec's "no junctions" refused
    // rather than assumed.
    const branch = entity('Stray', centre(1, 1).x, centre(1, 1).y, { tile: { kind: 'path' } })
    nothing([
      grid(),
      ...road([
        [0, 0],
        [1, 0],
        [2, 0],
      ]),
      branch,
    ])
  })

  it('has tiles that touch only at their corners', () => {
    // A diagonal neighbour sits √2 tiles away. Joining those would give a road
    // shortcuts nobody drew, so it is a gap.
    nothing([
      grid(),
      ...road([
        [0, 0],
        [1, 1],
      ]),
    ])
  })

  it('has no spawn', () => {
    const tiles = road(STRAIGHT).map((tile) => {
      const { spawn: _dropped, ...rest } = tile.components
      return { ...tile, components: rest }
    })
    nothing([grid(), ...tiles])
  })

  it('has two spawns', () => {
    const tiles = road(STRAIGHT)
    const second = tiles[2]
    if (second !== undefined) second.components['spawn'] = {}
    nothing([grid(), ...tiles])
  })

  it('has no goal', () => {
    const tiles = road(STRAIGHT).map((tile) => {
      const { goal: _dropped, ...rest } = tile.components
      return { ...tile, components: rest }
    })
    nothing([grid(), ...tiles])
  })

  it('has no grid', () => {
    nothing(road(STRAIGHT))
  })

  it('has two entities each saying how big a tile is', () => {
    nothing([grid(), grid(), ...road(STRAIGHT)])
  })

  it('has a tile size that is not a size', () => {
    nothing([grid(0), ...road(STRAIGHT)])
    nothing([entity('Ground', 0, 0, { grid: { tileSize: 'sixteen' } }), ...road(STRAIGHT)])
    nothing([entity('Ground', 0, 0, { grid: {} }), ...road(STRAIGHT)])
  })

  it('is empty', () => {
    nothing([])
  })
})

describe('a point along the road', () => {
  const straight = must(routeIn([grid(), ...road(STRAIGHT)]))
  const corner = must(routeIn([grid(), ...road(CORNER)]))

  it('starts at the spawn tile', () => {
    expect(pointAlong(straight, 0)).toEqual(centre(0, 0))
  })

  it('lands between tiles part-way along', () => {
    expect(pointAlong(straight, 8)).toEqual({ x: centre(0, 0).x + 8, y: centre(0, 0).y })
  })

  it('follows the road round a corner', () => {
    // Two tiles along and eight units past the turn.
    expect(pointAlong(corner, 2 * TILE + 8)).toEqual({ x: centre(2, 0).x, y: centre(2, 0).y + 8 })
  })

  it('ends at the goal tile, and stays there', () => {
    expect(pointAlong(straight, straight.length)).toEqual(centre(3, 0))
    expect(pointAlong(straight, straight.length + 500)).toEqual(centre(3, 0))
  })

  it('treats anything before the start as the spawn tile', () => {
    expect(pointAlong(straight, -20)).toEqual(centre(0, 0))
  })
})

describe('getting onto the road from where a monster was put', () => {
  const straight = must(routeIn([grid(), ...road(STRAIGHT)]))
  const corner = must(routeIn([grid(), ...road(CORNER)]))

  it('is where it stands, when it stands on the road', () => {
    expect(distanceAlongNearest(straight, centre(2, 0))).toBe(2 * TILE)
  })

  it('is the nearest part of the road, when it stands beside it', () => {
    expect(distanceAlongNearest(straight, { x: centre(2, 0).x, y: centre(2, 0).y + 40 })).toBe(2 * TILE)
  })

  it('is short of the start by exactly its gap, when it stands back beyond it', () => {
    // Negative on purpose: sixty units behind the spawn is sixty units of
    // walking before its road begins, which is what makes a wave queue
    // drawable behind the spawn. Zero still means standing on the spawn.
    expect(distanceAlongNearest(straight, { x: centre(0, 0).x - 60, y: centre(0, 0).y })).toBe(-60)
  })

  it('is the goal, when it stands out past the end', () => {
    expect(distanceAlongNearest(straight, { x: centre(3, 0).x + 60, y: centre(3, 0).y })).toBe(straight.length)
  })

  it('measures along the road rather than across the bend', () => {
    // Standing on the corner tile itself: three tiles of walking, not the two-tile
    // hop a straight line from the spawn would suggest.
    expect(distanceAlongNearest(corner, centre(2, 1))).toBe(3 * TILE)
  })
})
