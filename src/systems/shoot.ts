import type { Entity, System } from 'kernel-2d/runtime'

import { distanceAlongNearest, routeThrough } from './route'

/**
 * Towers shooting the monsters that walk past — the whole of combat.
 *
 * The spec's defense nouns live here: *Tower*, *Range*, *Damage*, *rate of
 * fire*, *Projectile* — and the health half of *"Two things vary between
 * monsters and only two: speed and health."* `march` owns the speed half; this
 * system never moves a monster and that one never hurts one.
 *
 * **One system rather than three** (fire, fly, hit), because a shot is one
 * story with an order inside it: arrows already in the air land before towers
 * loose new ones, so an arrow spends at least one step visibly flying and a
 * kill this step frees every tower to pick a new target the same step. Order
 * between systems is list order (`index.ts`); order inside a story is this
 * file's.
 *
 * **What a tower is, is a component; what it has done is not.** `tower` carries
 * the numbers the prefab authored. How long until it may fire again, how far an
 * arrow has yet to fly, how much a monster has bled — each lives beside the
 * level in a WeakMap keyed on the entity (game-code T6), so Stop and Play
 * resets the fight with nothing to clear, and nothing a run does appears in the
 * Inspector as a component nobody authored.
 *
 * **Arrows are entities made mid-run.** The renderer draws whatever list it is
 * handed, matching by id, so pushing one in is the whole of making it visible —
 * *provided its texture arrived with the level.* That is what the `texture`
 * reference inside the tower component is for: the kernel loads every
 * `texture`-named reference a level's entities carry, exactly so that things
 * spawned later can wear art that was declared up front. An arrow's art is
 * named by the tower that shoots it, not invented here.
 *
 * **Targeting is not a player control in this game** — per-tower targeting
 * rules are cut by the spec — so code picks one rule and keeps it: the monster
 * farthest along the road that is inside the range circle. Farthest along is
 * the one closest to costing a life, which is the choice a player would beg
 * for. On a level with no road (every way that can happen is listed in
 * `route.ts`), towers still defend themselves: nearest monster instead.
 *
 * **A monster that dies is removed from the level, arrows and all, and its
 * bounty hits the ground where it fell.** Anything still flying at it fades
 * with it rather than striking a corpse. A monster that *arrives* is `leak`'s
 * to remove — running after this system, so the last arrow of the step still
 * lands — and drops nothing: gold is for kills, a leak only costs.
 */
export const shootSystem: System = {
  id: 'shoot',

  step: (entities, dtSeconds) => {
    land(entities, dtSeconds)
    fire(entities, dtSeconds)
  },
}

// --- arrows in the air ------------------------------------------------------

/** What an arrow is chasing and what happens when it catches it. */
interface Flight {
  target: Entity
  damage: number
  unitsPerSecond: number
}

/**
 * Every arrow in the air, keyed on the arrow entity itself.
 *
 * This map is also the answer to "which entities are arrows": an arrow carries
 * only a sprite, because everything else about it is true of one run only
 * (game-code T6). Held weakly, a flight dies with its arrow.
 */
const flights = new WeakMap<Entity, Flight>()

/** How much each monster has bled this run. Dies with the run (game-code T6). */
const wounds = new WeakMap<Entity, number>()

/** Seconds until each tower may fire again. Dies with the run (game-code T6). */
const cooldowns = new WeakMap<Entity, number>()

function land(entities: Entity[], dtSeconds: number): void {
  const fallen: Entity[] = []
  const dropped: Entity[] = []

  for (const arrow of entities) {
    const flight = flights.get(arrow)
    if (flight === undefined) continue

    // The target died or leaked out from under this arrow. Striking where it
    // used to be would be hitting nothing; the arrow simply stops existing.
    if (!entities.includes(flight.target) || isDead(flight.target)) {
      fallen.push(arrow)
      continue
    }

    const dx = flight.target.transform.x - arrow.transform.x
    const dy = flight.target.transform.y - arrow.transform.y
    const gap = Math.sqrt(dx * dx + dy * dy)
    const step = flight.unitsPerSecond * dtSeconds

    if (gap <= step) {
      wounds.set(flight.target, woundsOf(flight.target) + flight.damage)
      fallen.push(arrow)
      if (isDead(flight.target)) {
        fallen.push(flight.target)
        // "Monsters that die drop gold" — literally. The coin lies where the
        // monster fell, carrying the bounty its type authored, and spending
        // it is somebody else's business on a later day. A monster with no
        // well-formed bounty drops nothing (game-code T3).
        const coin = coinFor(flight.target)
        if (coin !== null) dropped.push(coin)
      }
      continue
    }

    arrow.transform.x += (dx / gap) * step
    arrow.transform.y += (dy / gap) * step
    // Degrees counter-clockwise in a y-up scene, which is exactly what atan2
    // answers — the arrow art points along +x at rotation 0.
    arrow.transform.rotation = (Math.atan2(dy, dx) * 180) / Math.PI
  }

  remove(entities, fallen)
  entities.push(...dropped)
}

/**
 * The coin a monster drops, or null when its type authored no bounty.
 *
 * The coin's art is named inside the monster's own `bounty` component — the
 * `texture` field rule again (T9), so the kernel loaded it with the level. The
 * `coin` component carries the amount for the day something spends it; today a
 * level's wealth is simply the coins lying on it.
 */
function coinFor(monster: Entity): Entity | null {
  const component: unknown = monster.components['bounty']
  if (typeof component !== 'object' || component === null) return null

  const { gold, texture } = component as Record<string, unknown>
  if (!isRate(gold)) return null
  if (typeof texture !== 'object' || texture === null) return null
  const { id, path } = texture as Record<string, unknown>
  if (typeof id !== 'string' || typeof path !== 'string') return null

  return {
    id: `coin#${(minted += 1)}`,
    name: 'Coin',
    transform: { ...monster.transform, rotation: 0, scaleX: 1, scaleY: 1 },
    components: {
      sprite: { texture: { id, path } },
      coin: { gold },
    },
  }
}

let minted = 0

// --- towers firing ----------------------------------------------------------

function fire(entities: Entity[], dtSeconds: number): void {
  const loosed: Entity[] = []

  for (const post of entities) {
    const tower = towerOf(post)
    if (tower === null) continue

    const ready = Math.max(0, (cooldowns.get(post) ?? 0) - dtSeconds)
    cooldowns.set(post, ready)
    if (ready > 0) continue

    const target = targetFor(post, tower.rangeUnits, entities)
    if (target === null) continue

    const arrow = looseAt(post, tower, target)
    loosed.push(arrow)
    cooldowns.set(post, 1 / tower.shotsPerSecond)
  }

  // Pushed after the loop so a level full of towers is walked once, and pushed
  // to the end of the list, which is the scene format's "drawn on top".
  entities.push(...loosed)
}

/**
 * The monster this tower shoots, or null when nothing in range is alive.
 *
 * Farthest along the road wins; without a road, nearest to the tower. Alive
 * means carrying a well-formed `health` and not yet bled out — an entity with a
 * malformed one is not a monster as far as combat is concerned (game-code T3).
 */
function targetFor(post: Entity, rangeUnits: number, entities: readonly Entity[]): Entity | null {
  const route = routeThrough(entities)

  let best: Entity | null = null
  let bestScore = -Infinity

  for (const entity of entities) {
    if (healthOf(entity) === null || isDead(entity)) continue

    const dx = entity.transform.x - post.transform.x
    const dy = entity.transform.y - post.transform.y
    const away = Math.sqrt(dx * dx + dy * dy)
    if (away > rangeUnits) continue

    const score = route === null ? -away : distanceAlongNearest(route, entity.transform)
    if (score <= bestScore) continue
    bestScore = score
    best = entity
  }

  return best
}

interface Tower {
  rangeUnits: number
  damage: number
  shotsPerSecond: number
  projectile: { texture: { id: string; path: string }; unitsPerSecond: number }
}

/** One arrow, at the tower, already aimed. Its flight is registered here too. */
function looseAt(post: Entity, tower: Tower, target: Entity): Entity {
  const dx = target.transform.x - post.transform.x
  const dy = target.transform.y - post.transform.y

  const arrow: Entity = {
    // Unique within any level a human can save: authored ids are hex, and the
    // counter never repeats within a module's life.
    id: `arrow#${(fletched += 1)}`,
    name: 'Arrow',
    transform: {
      x: post.transform.x,
      y: post.transform.y,
      rotation: (Math.atan2(dy, dx) * 180) / Math.PI,
      scaleX: 1,
      scaleY: 1,
    },
    // The sprite is the arrow's only component: its speed, damage and target
    // are true of one run only, so they live in `flights`, not in the entity —
    // where they would briefly appear in the Inspector as authored data.
    components: { sprite: { texture: tower.projectile.texture } },
  }

  flights.set(arrow, {
    target,
    damage: tower.damage,
    unitsPerSecond: tower.projectile.unitsPerSecond,
  })

  return arrow
}

let fletched = 0

// --- reading the level ------------------------------------------------------

/**
 * The tower component, whole or not at all.
 *
 * All of it is checked before any of it is used (game-code T3): a tower with a
 * range and no projectile is not half a tower, it is a component somebody
 * mangled by hand, and the safe reading of that is "this does not shoot".
 */
function towerOf(entity: Entity): Tower | null {
  const component: unknown = entity.components['tower']
  if (typeof component !== 'object' || component === null) return null

  const { rangeUnits, damage, shotsPerSecond, projectile } = component as Record<string, unknown>
  if (!isRate(rangeUnits) || !isRate(damage) || !isRate(shotsPerSecond)) return null
  if (typeof projectile !== 'object' || projectile === null) return null

  const { texture, unitsPerSecond } = projectile as Record<string, unknown>
  if (!isRate(unitsPerSecond)) return null
  if (typeof texture !== 'object' || texture === null) return null

  const { id, path } = texture as Record<string, unknown>
  if (typeof id !== 'string' || typeof path !== 'string') return null

  return {
    rangeUnits,
    damage,
    shotsPerSecond,
    projectile: { texture: { id, path }, unitsPerSecond },
  }
}

/** The hits this monster can take, or null if it is not a monster. */
function healthOf(entity: Entity): number | null {
  const component: unknown = entity.components['health']
  if (typeof component !== 'object' || component === null) return null

  const total: unknown = (component as { total?: unknown }).total
  return isRate(total) ? total : null
}

function woundsOf(entity: Entity): number {
  return wounds.get(entity) ?? 0
}

function isDead(entity: Entity): boolean {
  const total = healthOf(entity)
  return total !== null && woundsOf(entity) >= total
}

/** A positive, finite number — what every combat quantity has to be. */
function isRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Takes these out of the level, in place, because the level is the live array. */
function remove(entities: Entity[], gone: readonly Entity[]): void {
  for (const entity of gone) {
    const at = entities.indexOf(entity)
    if (at !== -1) entities.splice(at, 1)
  }
}
