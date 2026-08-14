import { clickedIn, copyEntity, pressedIn, type Entity, type System } from 'kernel-2d/runtime'

import { slowOf } from './march'
import { towerOf } from './shoot'

/**
 * Building — the middle of the spec's loop, and the reason the rest exists:
 * *"Spend gold. Build a new tower on a buildable tile."*
 *
 * **A buildable tile is the spec's third tile kind, drawn like the other two**
 * (`prefabs/tile-buildable.json`, `tile: { kind: "buildable" }`): where the
 * player may build is level design, so the author places pads the way they
 * draw the road. A click during play lands on a system as a scene-unit point
 * on the input entity (`clickedIn` — the kernel's pointer, arrived exactly the
 * way the keyboard did, with this system as the demanding consumer). A click
 * on a vacant pad builds; a click anywhere else is nobody's.
 *
 * **A level offers what it shows.** What gets built is a copy of a building
 * already standing in the level — a tower that shoots (`tower`) or a frost
 * totem that chills (`slow`), anything priced — so the prefab stays the single
 * source of what each is, the build needs no second description of one, and
 * nothing has to read a file mid-run. The copy is the kernel's own
 * `copyEntity`, so a bought building is whole: it fights, and it can be
 * copied again. A level containing none offers none, a sandbox's honest state.
 *
 * **The catalogue is the distinct kinds on show, and the number keys choose.**
 * Kinds are told apart by what they were placed from (the prefab reference a
 * resolved instance still carries), in order of first appearance: `1` is the
 * first kind the level shows, `2` the second, and a click builds the chosen
 * one. The choice is shown on the board like every other fact of a run — a
 * golden arrow (`wares` art, named by the Ground prefab like the verdict's
 * and the tempo's) hanging over one standing example of the chosen kind.
 *
 * **The coins on the ground are the budget** (T11): the price — authored on
 * the tower's prefab, `price: { gold: 30 }` — is paid by removing coins,
 * largest first, and any overshoot is dropped back at the new tower's foot as
 * a change coin. Not enough coins on the board means the click does nothing,
 * which the player reads off the board itself: the wealth was visible before
 * they clicked.
 *
 * **Building works while paused, on purpose.** This system never reads the
 * tempo: the spec's building phase has no time pressure, and pausing to place
 * a tower calmly is the loop working, not a loophole. A *decided* level takes
 * no more building — coins spent under a verdict banner would buy nothing but
 * regret.
 */
export const buildSystem: System = {
  id: 'build',

  step: (entities) => {
    if (entities.some((entity) => entity.components['verdict'] !== undefined)) return

    const wares = catalogueOf(entities)
    const chosen = choose(entities, wares)
    point(entities, chosen)

    for (const click of clickedIn(entities)) {
      const pad = padAt(entities, click)
      if (pad === null || isOccupied(entities, pad)) continue

      if (chosen === null) continue
      const price = priceOf(chosen)
      if (price === null) continue

      const paid = pay(entities, price, pad)
      if (paid === null) continue

      const building = copyEntity(chosen, `built#${(founded += 1)}`, chosen.name)
      building.transform = { x: pad.transform.x, y: pad.transform.y, rotation: 0, scaleX: 1, scaleY: 1 }
      entities.push(building)
    }
  },
}

let founded = 0

/** A building: anything that fights from a tile — it shoots, or it chills. */
function isBuilding(entity: Entity): boolean {
  return towerOf(entity) !== null || slowOf(entity) !== null
}

/**
 * One standing example of each kind the level offers, in order of first
 * appearance. A kind is what an instance was placed from; a bought copy
 * carries the same reference, so building never grows the catalogue.
 */
function catalogueOf(entities: readonly Entity[]): Entity[] {
  const kinds = new Map<string, Entity>()
  for (const entity of entities) {
    if (!isBuilding(entity) || priceOf(entity) === null) continue
    const kind = kindOf(entity)
    if (!kinds.has(kind)) kinds.set(kind, entity)
  }
  return [...kinds.values()]
}

function kindOf(entity: Entity): string {
  const prefab: unknown = entity.components['prefab']
  if (typeof prefab === 'object' && prefab !== null) {
    const source: unknown = (prefab as { source?: unknown }).source
    if (typeof source === 'object' && source !== null) {
      const path: unknown = (source as { path?: unknown }).path
      if (typeof path === 'string') return path
    }
  }
  return entity.name
}

/** Which ware the number keys have picked this run. Dies with it (T6). */
const choices = new WeakMap<readonly Entity[], { index: number; marker: Entity | null }>()

function choose(entities: readonly Entity[], wares: readonly Entity[]): Entity | null {
  const state = choices.get(entities) ?? { index: 0, marker: null }
  choices.set(entities, state)

  for (const press of pressedIn(entities)) {
    const digit = /^Digit([1-9])$/.exec(press)
    if (digit === null) continue
    const wanted = Number(digit[1]) - 1
    if (wanted < wares.length) state.index = wanted
  }

  if (state.index >= wares.length) state.index = 0
  return wares[state.index] ?? null
}

/**
 * Keeps the golden arrow over one standing example of the chosen kind — or
 * absent, when nothing is for sale or no entity names `wares` art. A level
 * that shows no arrow still obeys the keys (game-code T3's degrade).
 */
function point(entities: Entity[], chosen: Entity | null): void {
  const state = choices.get(entities)
  if (state === undefined) return

  if (chosen === null) {
    if (state.marker !== null) {
      const at = entities.indexOf(state.marker)
      if (at !== -1) entities.splice(at, 1)
      state.marker = null
    }
    return
  }

  if (state.marker === null) {
    const marker = markerFor(entities)
    if (marker === null) return
    state.marker = marker
    entities.push(marker)
  }

  state.marker.transform.x = chosen.transform.x
  state.marker.transform.y = chosen.transform.y + 14
}

function markerFor(entities: readonly Entity[]): Entity | null {
  for (const entity of entities) {
    const component: unknown = entity.components['wares']
    if (typeof component !== 'object' || component === null) continue
    const side: unknown = (component as { chosen?: unknown }).chosen
    if (typeof side !== 'object' || side === null) continue
    const texture: unknown = (side as { texture?: unknown }).texture
    if (typeof texture !== 'object' || texture === null) continue
    const { id, path } = texture as Record<string, unknown>
    if (typeof id !== 'string' || typeof path !== 'string') continue

    return {
      id: 'wares#chosen',
      name: 'Chosen ware',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      components: { sprite: { texture: { id, path } } },
    }
  }
  return null
}

/** Half a tile — the same "on this tile" arithmetic as a leak at the goal. */
const ON_PAD = 8

/** The buildable tile under this click, or null when the click missed them all. */
function padAt(entities: readonly Entity[], click: { x: number; y: number }): Entity | null {
  for (const entity of entities) {
    const tile: unknown = entity.components['tile']
    if (typeof tile !== 'object' || tile === null) continue
    if ((tile as { kind?: unknown }).kind !== 'buildable') continue

    const dx = entity.transform.x - click.x
    const dy = entity.transform.y - click.y
    if (dx * dx + dy * dy <= ON_PAD * ON_PAD) return entity
  }
  return null
}

/** One building per tile, as the spec has it: a pad with one on it is spent. */
function isOccupied(entities: readonly Entity[], pad: Entity): boolean {
  return entities.some((entity) => {
    if (!isBuilding(entity)) return false
    const dx = entity.transform.x - pad.transform.x
    const dy = entity.transform.y - pad.transform.y
    return dx * dx + dy * dy <= ON_PAD * ON_PAD
  })
}

/**
 * Takes the price off the board, or answers null leaving it untouched.
 *
 * Largest coins first, so the overshoot — dropped back as one change coin at
 * the pad's foot — is as small as the denominations allow. The change coin is
 * a copy of a spent one with its worth rewritten, so it wears the same face
 * and stays spendable.
 */
function pay(entities: Entity[], price: number, pad: Entity): number | null {
  const purse = entities
    .map((entity) => ({ entity, gold: coinOf(entity) }))
    .filter((one): one is { entity: Entity; gold: number } => one.gold !== null)
    .sort((a, b) => b.gold - a.gold)

  const total = purse.reduce((sum, one) => sum + one.gold, 0)
  if (total < price) return null

  let paid = 0
  const spent: Entity[] = []
  for (const one of purse) {
    if (paid >= price) break
    paid += one.gold
    spent.push(one.entity)
  }

  for (const coin of spent) {
    const at = entities.indexOf(coin)
    if (at !== -1) entities.splice(at, 1)
  }

  const change = paid - price
  const template = spent[spent.length - 1]
  if (change > 0 && template !== undefined) {
    const coin = copyEntity(template, `change#${(minted += 1)}`, 'Coin')
    coin.components['coin'] = { gold: change }
    coin.transform = { x: pad.transform.x + 6, y: pad.transform.y - 6, rotation: 0, scaleX: 1, scaleY: 1 }
    entities.push(coin)
  }

  return paid
}

let minted = 0

/** What this coin is worth, or null if it is not one (game-code T3). */
function coinOf(entity: Entity): number | null {
  const component: unknown = entity.components['coin']
  if (typeof component !== 'object' || component === null) return null
  const gold: unknown = (component as { gold?: unknown }).gold
  return typeof gold === 'number' && Number.isFinite(gold) && gold > 0 ? gold : null
}

/** What this tower costs to build, or null if it is not for sale (game-code T3). */
function priceOf(entity: Entity): number | null {
  const component: unknown = entity.components['price']
  if (typeof component !== 'object' || component === null) return null
  const gold: unknown = (component as { gold?: unknown }).gold
  return typeof gold === 'number' && Number.isFinite(gold) && gold > 0 ? gold : null
}
