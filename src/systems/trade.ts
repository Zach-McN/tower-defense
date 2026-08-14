import type { Entity } from 'kernel-2d/runtime'

import type { Slow } from './march'
import type { Tower } from './shoot'

/**
 * The market's arithmetic: prices, upgrade tiers, what a tower has cost so
 * far, and which standing things are merchandise rather than defenders.
 *
 * Three spec nouns meet here and each is data, not machinery:
 *
 *   - *Upgrade tier* — *"a short ladder (three or so rungs) per tower, bought
 *     with gold. A tier raises that tower's numbers. It never changes the
 *     tower's role and never branches."* The ladder is a `tiers` component on
 *     the tower's prefab: an array of rungs, each a price plus the numbers it
 *     raises, written as the new values. A rung never carries a texture or a
 *     role — the spec forbids sideways moves, and the component's shape cannot
 *     express one.
 *   - *Sell* — *"remove a tower, get part of everything spent on it back."*
 *     "Everything spent" is a sum this module keeps: the base price plus every
 *     rung bought this run.
 *   - The **ware mark** (`ware: {}`, empty like `spawn` and `goal`): a level's
 *     shop row is standing examples of what is for sale, and the mark is what
 *     says *display piece, not defender*. A ware never shoots, never chills,
 *     and can never be upgraded or sold — it is the catalogue, drawn. Without
 *     it the shop row fought: the level-01 mage could snipe monsters filing in
 *     past the map edge, which nobody authored.
 *
 * **How far up its ladder a tower has climbed is run state** (game-code T6):
 * a WeakMap keyed on the tower entity, dead with the run, so Stop and Play
 * puts every tower back at its base numbers with nothing to reset. The rungs
 * bought are shown on the board as star pips above the tower — art the Ground
 * prefab names under `wares.star`, the same glyph pattern as the tempo and
 * the verdict.
 *
 * `shoot` and `march` read a tower's *effective* numbers through `towerAt` /
 * `slowAt`, which lay the bought rungs over the authored base in order. A
 * tower with no ladder, or none bought, is exactly its prefab.
 */

/** One rung of a ladder: a price, and the numbers it raises. */
export interface Rung {
  price: number
  tower: {
    rangeUnits?: number
    damage?: number
    shotsPerSecond?: number
    projectile?: { unitsPerSecond?: number; splashUnits?: number }
  } | null
  slow: { rangeUnits?: number; factor?: number } | null
}

/**
 * The ladder this tower's type authored, whole or not at all (game-code T3):
 * one malformed rung refuses the whole ladder, never half of one.
 */
export function tiersOf(entity: Entity): Rung[] | null {
  const component: unknown = entity.components['tiers']
  if (!Array.isArray(component)) return null

  const rungs: Rung[] = []
  for (const raw of component) {
    if (typeof raw !== 'object' || raw === null) return null
    const { price, tower, slow } = raw as Record<string, unknown>

    const gold = goldOf(price)
    if (gold === null) return null

    const risenTower = tower === undefined ? null : towerRiseOf(tower)
    if (tower !== undefined && risenTower === null) return null
    const risenSlow = slow === undefined ? null : slowRiseOf(slow)
    if (slow !== undefined && risenSlow === null) return null

    rungs.push({ price: gold, tower: risenTower, slow: risenSlow })
  }
  return rungs
}

/** What this tower costs to build, or null if it is not for sale (game-code T3). */
export function priceOf(entity: Entity): number | null {
  const component: unknown = entity.components['price']
  if (typeof component !== 'object' || component === null) return null
  return goldOf(component)
}

/** A display piece on the shop row — the catalogue, not a defender. */
export function isWare(entity: Entity): boolean {
  const component: unknown = entity.components['ware']
  return typeof component === 'object' && component !== null
}

// --- how far up the ladder, this run ----------------------------------------

interface Standing {
  rung: number
  /** Gold paid for rungs this run — the upgrade half of "everything spent". */
  spent: number
  /** The star pips above the tower, one per rung bought. */
  badges: Entity[]
}

/** Each tower's climb. Keyed on the entity, dead with the run (game-code T6). */
const standings = new WeakMap<Entity, Standing>()

/** How many rungs this tower has bought this run. */
export function rungOf(entity: Entity): number {
  return standings.get(entity)?.rung ?? 0
}

/** The rung an upgrade would buy now, or null at the top (or with no ladder). */
export function nextRungOf(entity: Entity): Rung | null {
  const ladder = tiersOf(entity)
  if (ladder === null) return null
  return ladder[rungOf(entity)] ?? null
}

/**
 * Climbs one rung: records the spend, and re-lays the star pips above the
 * tower — centred as a row, so the second star does not dangle off one side.
 * A level whose Ground names no `wares.star` art shows nothing and still
 * counts the climb (game-code T3's degrade).
 */
export function raise(entities: Entity[], building: Entity, rung: Rung): void {
  const standing = standings.get(building) ?? { rung: 0, spent: 0, badges: [] }
  standings.set(building, standing)
  standing.rung += 1
  standing.spent += rung.price

  for (const badge of standing.badges) {
    const at = entities.indexOf(badge)
    if (at !== -1) entities.splice(at, 1)
  }
  standing.badges = []

  const texture = waresArt(entities, 'star')
  if (texture === null) return
  for (let pip = 0; pip < standing.rung; pip += 1) {
    const badge: Entity = {
      id: `tier#${(pinned += 1)}`,
      name: 'Tier star',
      transform: {
        x: building.transform.x + (pip - (standing.rung - 1) / 2) * 6,
        y: building.transform.y + 12,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      components: { sprite: { texture } },
    }
    standing.badges.push(badge)
    entities.push(badge)
  }
}

let pinned = 0

/** Everything spent on this tower: its price, plus every rung bought this run. */
export function spentOn(entity: Entity): number {
  return (priceOf(entity) ?? 0) + (standings.get(entity)?.spent ?? 0)
}

/**
 * Takes a sold tower off the board, star pips and all, and answers the refund:
 * the spec's "part of everything spent on it back", at seventy percent rounded
 * down — a rate to tune, not a law.
 */
export function sellOff(entities: Entity[], building: Entity): number {
  const refund = Math.floor(spentOn(building) * REFUND_RATE)

  const badges = standings.get(building)?.badges ?? []
  for (const gone of [building, ...badges]) {
    const at = entities.indexOf(gone)
    if (at !== -1) entities.splice(at, 1)
  }

  return refund
}

const REFUND_RATE = 0.7

// --- effective numbers ------------------------------------------------------

/** The tower's numbers with every bought rung laid over the authored base. */
export function towerAt(base: Tower, entity: Entity): Tower {
  const ladder = tiersOf(entity)
  if (ladder === null) return base

  const risen: Tower = { ...base, projectile: { ...base.projectile } }
  for (const rung of ladder.slice(0, rungOf(entity))) {
    if (rung.tower === null) continue
    if (rung.tower.rangeUnits !== undefined) risen.rangeUnits = rung.tower.rangeUnits
    if (rung.tower.damage !== undefined) risen.damage = rung.tower.damage
    if (rung.tower.shotsPerSecond !== undefined) risen.shotsPerSecond = rung.tower.shotsPerSecond
    if (rung.tower.projectile?.unitsPerSecond !== undefined) {
      risen.projectile.unitsPerSecond = rung.tower.projectile.unitsPerSecond
    }
    if (rung.tower.projectile?.splashUnits !== undefined) {
      risen.projectile.splashUnits = rung.tower.projectile.splashUnits
    }
  }
  return risen
}

/** The aura's numbers with every bought rung laid over the authored base. */
export function slowAt(base: Slow, entity: Entity): Slow {
  const ladder = tiersOf(entity)
  if (ladder === null) return base

  const risen: Slow = { ...base }
  for (const rung of ladder.slice(0, rungOf(entity))) {
    if (rung.slow === null) continue
    if (rung.slow.rangeUnits !== undefined) risen.rangeUnits = rung.slow.rangeUnits
    if (rung.slow.factor !== undefined) risen.factor = rung.slow.factor
  }
  return risen
}

// --- the Ground's trade art -------------------------------------------------

/**
 * One face of the `wares` art bundle the Ground prefab authors: the chosen
 * arrow, the selling sign, the refund coin's face, the tier star. Named
 * `texture` fields, so the kernel loaded them with the level (T9).
 */
export function waresArt(
  entities: readonly Entity[],
  which: 'chosen' | 'selling' | 'coin' | 'star',
): { id: string; path: string } | null {
  for (const entity of entities) {
    const component: unknown = entity.components['wares']
    if (typeof component !== 'object' || component === null) continue
    const side: unknown = (component as Record<string, unknown>)[which]
    if (typeof side !== 'object' || side === null) continue
    const texture: unknown = (side as { texture?: unknown }).texture
    if (typeof texture !== 'object' || texture === null) continue
    const { id, path } = texture as Record<string, unknown>
    if (typeof id !== 'string' || typeof path !== 'string') continue
    return { id, path }
  }
  return null
}

// --- readers ----------------------------------------------------------------

function goldOf(component: unknown): number | null {
  if (typeof component !== 'object' || component === null) return null
  const gold: unknown = (component as { gold?: unknown }).gold
  return isRate(gold) ? gold : null
}

/** The numbers a rung raises on a shooting tower — each optional, each checked. */
function towerRiseOf(raw: unknown): Rung['tower'] {
  if (typeof raw !== 'object' || raw === null) return null
  const { rangeUnits, damage, shotsPerSecond, projectile } = raw as Record<string, unknown>
  if (rangeUnits !== undefined && !isRate(rangeUnits)) return null
  if (damage !== undefined && !isRate(damage)) return null
  if (shotsPerSecond !== undefined && !isRate(shotsPerSecond)) return null

  let flight: { unitsPerSecond?: number; splashUnits?: number } | undefined
  if (projectile !== undefined) {
    if (typeof projectile !== 'object' || projectile === null) return null
    const { unitsPerSecond, splashUnits } = projectile as Record<string, unknown>
    if (unitsPerSecond !== undefined && !isRate(unitsPerSecond)) return null
    if (splashUnits !== undefined && !isRate(splashUnits)) return null
    flight = {
      ...(unitsPerSecond === undefined ? {} : { unitsPerSecond }),
      ...(splashUnits === undefined ? {} : { splashUnits }),
    }
  }

  return {
    ...(rangeUnits === undefined ? {} : { rangeUnits }),
    ...(damage === undefined ? {} : { damage }),
    ...(shotsPerSecond === undefined ? {} : { shotsPerSecond }),
    ...(flight === undefined ? {} : { projectile: flight }),
  }
}

/** The numbers a rung raises on a slow aura. A factor may only tighten to (0, 1]. */
function slowRiseOf(raw: unknown): Rung['slow'] {
  if (typeof raw !== 'object' || raw === null) return null
  const { rangeUnits, factor } = raw as Record<string, unknown>
  if (rangeUnits !== undefined && !isRate(rangeUnits)) return null
  if (factor !== undefined && (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0 || factor > 1)) {
    return null
  }
  return {
    ...(rangeUnits === undefined ? {} : { rangeUnits }),
    ...(factor === undefined ? {} : { factor }),
  }
}

/** A positive, finite number — what every trade quantity has to be. */
function isRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
