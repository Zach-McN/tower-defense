import type { Entity } from 'kernel-2d/runtime'

/**
 * The road, worked out from the tiles somebody drew.
 *
 * The spec's Path noun is *"the ordered run of tiles the monsters walk, drawn by
 * hand when the level is authored"*. The drawing is the authoring — so this file
 * takes the tiles that are in the level and answers with the order to walk them,
 * rather than the level carrying a second list saying so.
 *
 * **That is the decision this file exists to hold: the picture is the data.** The
 * alternative was a `path` component carrying an ordered list of coordinates, with
 * the tiles drawn beside it. It is easier to read and it is two answers to one
 * question — the list and the tiles would agree on the day they were written and
 * drift the first time somebody dragged a tile. Deriving the order means the road
 * you can see *is* the road that gets walked, and there is nowhere for the two to
 * disagree.
 *
 * **Every noun here is in `docs/GENRE-SPEC.md`** — Grid, Tile, Path, Spawn, Goal —
 * and there is nothing here that is not. Components this game invented for them are
 * this game's; the kernel gained nothing to make them work (game-code T1).
 *
 * ```json
 * "components": { "grid": { "tileSize": 16 } }
 * "components": { "tile": { "kind": "path" }, "spawn": {} }
 * "components": { "tile": { "kind": "path" } }
 * "components": { "tile": { "kind": "path" }, "goal": {} }
 * ```
 *
 * **Nothing in here throws.** A level that does not describe a road answers `null`,
 * and the system above it moves nothing (game-code T3). The levels that reach this
 * are hand-drawn, and a fault raised sixty times a second is the hardest kind to
 * trace back to the file that caused it.
 */

export interface Point {
  x: number
  y: number
}

export interface Route {
  /** Tile centres in walking order: the spawn first, the goal last. */
  points: readonly Point[]
  /** How far along the road each point sits. Same length as `points`; the first is 0. */
  reachedAt: readonly number[]
  /** Spawn to goal, in scene units. */
  length: number
}

/**
 * How far out of line a tile may sit and still count as next door, as a fraction
 * of a tile.
 *
 * It was written when the editor had no grid snap: a road was drawn by dragging
 * tiles, a drag landed on whole scene units, and a tile a couple of units off ought
 * to be a road rather than a puzzle. **The editor gained a settable snap on
 * 2026-08-13 and this stays** — for roads drawn before it, for a tile moved with
 * Alt held, and because the snap starts at whole units every time the editor is
 * opened. A road drawn without setting it is still a road somebody meant.
 *
 * **The ceiling is not a matter of taste.** A diagonal neighbour sits √2 tiles
 * away, which is 0.414 of a tile further than a square one — so any tolerance at
 * or above that starts joining tiles that touch only at a corner, and a road would
 * quietly acquire shortcuts. A third leaves margin on both sides: it forgives five
 * units of sloppiness on a sixteen-unit tile, and stops well short of 0.414.
 */
const NEIGHBOUR_TOLERANCE = 1 / 3

/**
 * The road this level describes, or null if it does not describe one.
 *
 * Null covers every way a level can fail to have a road, and deliberately does not
 * distinguish between them: nothing downstream could act differently on the
 * difference, and a system has no way to say anything on screen anyway. The cases
 * are worth knowing even so, because each is a thing somebody can do by hand —
 * no grid; no spawn or no goal, or two of either; a gap in the road; a fork, which
 * is a tile with two ways onward and is what the spec's "no junctions, no
 * branching" looks like from in here.
 */
export function routeIn(entities: readonly Entity[]): Route | null {
  const tileSize = tileSizeOf(entities)
  if (tileSize === null) return null

  const tiles = entities.filter(isPathTile)
  const spawn = theOnly(tiles.filter((tile) => isMarked(tile, 'spawn')))
  const goal = theOnly(tiles.filter((tile) => isMarked(tile, 'goal')))
  if (spawn === null || goal === null) return null

  const chain = chainFrom(spawn, goal, tiles, tileSize)
  if (chain === null) return null

  return measure(chain.map(centreOf))
}

/**
 * Where a walker that has come this far along the road stands.
 *
 * Distances outside the road are clamped rather than refused: before the start is
 * the spawn tile and past the end is the goal tile, which is what both mean.
 */
export function pointAlong(route: Route, distance: number): Point {
  const first = route.points[0]
  const last = route.points[route.points.length - 1]
  // A route always has at least one point — `chainFrom` starts with the spawn —
  // so these are defensive rather than expected. Answering a fixed point is the
  // only thing left that is not a throw.
  if (first === undefined || last === undefined) return { x: 0, y: 0 }
  if (distance <= 0) return first
  if (distance >= route.length) return last

  // The first point the walker has not reached yet; the one before it is the
  // corner they last turned.
  const ahead = route.reachedAt.findIndex((reached) => reached > distance)
  if (ahead <= 0) return last

  const from = route.points[ahead - 1]
  const to = route.points[ahead]
  const leftAt = route.reachedAt[ahead - 1]
  const arrivesAt = route.reachedAt[ahead]
  if (from === undefined || to === undefined || leftAt === undefined || arrivesAt === undefined) return last

  const span = arrivesAt - leftAt
  const across = span === 0 ? 0 : (distance - leftAt) / span
  return { x: from.x + (to.x - from.x) * across, y: from.y + (to.y - from.y) * across }
}

/**
 * How far along the road the point nearest to this one sits.
 *
 * **This is what "a monster starts walking from where it was put" means.** A
 * monster dropped on the road walks on from there; one dropped beside it steps
 * onto the nearest part of the road and walks from there.
 *
 * The alternative was to snap every walker to the spawn tile. It is simpler and it
 * makes the level's own placement a lie — a monster you dragged onto the third
 * corner would jump across the map the moment you pressed Play, with the level
 * still showing it where you left it.
 */
export function distanceAlongNearest(route: Route, point: Point): number {
  let best = 0
  let bestGap = Infinity

  for (let ahead = 1; ahead < route.points.length; ahead += 1) {
    const from = route.points[ahead - 1]
    const to = route.points[ahead]
    const leftAt = route.reachedAt[ahead - 1]
    if (from === undefined || to === undefined || leftAt === undefined) continue

    const alongX = to.x - from.x
    const alongY = to.y - from.y
    const span = alongX * alongX + alongY * alongY
    // Two tiles in the same place. Nothing to project onto, and the point at the
    // start of it is already being considered by the previous segment.
    if (span === 0) continue

    // Where the foot of the perpendicular falls, as a fraction of this stretch,
    // held inside it so the answer is a point on the road rather than on the line
    // the road happens to lie along.
    const across = clamp(((point.x - from.x) * alongX + (point.y - from.y) * alongY) / span, 0, 1)
    const gap = squaredGap(point, { x: from.x + alongX * across, y: from.y + alongY * across })

    if (gap >= bestGap) continue
    bestGap = gap
    best = leftAt + Math.sqrt(span) * across
  }

  return best
}

// --- reading the level ------------------------------------------------------

/**
 * How big a tile is in this level, from the one entity that says so.
 *
 * It is a component on an entity rather than a fact about the game, because the
 * spec's Grid is a property of the map and a level is the unit of content. Which
 * entity carries it is deliberately not specified: this asks the level, not a
 * particular thing in it. Two entities carrying a grid is a level that has said
 * two different things, and it is refused rather than resolved by picking one.
 */
export function tileSizeOf(entities: readonly Entity[]): number | null {
  const grids = entities.filter((entity) => readsAs(entity.components['grid']) !== null)
  const only = theOnly(grids)
  if (only === null) return null

  const size: unknown = readsAs(only.components['grid'])?.['tileSize']
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return null
  return size
}

/** Whether this entity is one cell of the road. */
function isPathTile(entity: Entity): boolean {
  const tile = readsAs(entity.components['tile'])
  return tile !== null && tile['kind'] === 'path'
}

/**
 * Whether this entity carries a marker.
 *
 * `spawn` and `goal` are components with nothing in them, which is unusual enough
 * to say why: each is a fact with no detail attached — *this* is the tile monsters
 * come in at — and a field invented to stop the object being empty would be a
 * field nothing reads. Written into a level they read as what they are:
 * `"spawn": {}`.
 */
function isMarked(entity: Entity, marker: 'spawn' | 'goal'): boolean {
  return readsAs(entity.components[marker]) !== null
}

/** Tile centres are transforms: where the sprite is drawn is where the tile is. */
function centreOf(tile: Entity): Point {
  return { x: tile.transform.x, y: tile.transform.y }
}

/**
 * A component as an object, or null if it is not one.
 *
 * Every component this game reads goes through here first, per game-code T3: check
 * the shape, answer null, let the caller skip. What arrives is a level somebody
 * may have typed by hand.
 */
function readsAs(component: unknown): Record<string, unknown> | null {
  if (typeof component !== 'object' || component === null || Array.isArray(component)) return null
  return component as Record<string, unknown>
}

// --- following the road -----------------------------------------------------

/**
 * The tiles from the spawn to the goal, in the order they are walked, or null if
 * there is no single such run.
 *
 * Each step asks which tiles are next door and are not the one just left. Exactly
 * one answer continues the road; none is a gap, and more than one is a fork —
 * which is the spec's *"no junctions, no branching"* being checked rather than
 * assumed. It is also what a road running alongside itself looks like from here,
 * and refusing that is right: two stretches a tile apart have no walking order
 * anybody could have meant.
 */
function chainFrom(
  spawn: Entity,
  goal: Entity,
  tiles: readonly Entity[],
  tileSize: number,
): Entity[] | null {
  const chain: Entity[] = [spawn]
  let previous: Entity | null = null
  let current = spawn

  while (current !== goal) {
    const here = current
    const behind = previous
    const onward = tiles.filter(
      (tile) => tile !== here && tile !== behind && areNeighbours(tile, here, tileSize),
    )

    const next = onward.length === 1 ? onward[0] : undefined
    if (next === undefined) return null
    // A road that arrives somewhere it has already been is not a road, and this is
    // also what stops this loop being one. It cannot be reached by a road that
    // merely loops back to the spawn — that tile would have two ways on and be
    // refused above — so this is the belt to that pair of braces.
    if (chain.includes(next)) return null

    previous = current
    current = next
    chain.push(next)
  }

  return chain
}

/** Whether two tiles sit one cell apart, within the tolerance above. */
function areNeighbours(a: Entity, b: Entity, tileSize: number): boolean {
  const gap = Math.sqrt(squaredGap(centreOf(a), centreOf(b)))
  return Math.abs(gap - tileSize) <= tileSize * NEIGHBOUR_TOLERANCE
}

/** Points in walking order, with the running total of how far in each one is. */
function measure(points: readonly Point[]): Route {
  const reachedAt: number[] = [0]
  let total = 0

  for (let ahead = 1; ahead < points.length; ahead += 1) {
    const from = points[ahead - 1]
    const to = points[ahead]
    if (from !== undefined && to !== undefined) total += Math.sqrt(squaredGap(from, to))
    reachedAt.push(total)
  }

  return { points, reachedAt, length: total }
}

// --- small pieces -----------------------------------------------------------

/** The one thing in the list, or null when there are none or several. */
function theOnly<T>(candidates: readonly T[]): T | null {
  return candidates.length === 1 ? (candidates[0] ?? null) : null
}

/** Squared, because everything above compares gaps rather than measuring them. */
function squaredGap(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}
