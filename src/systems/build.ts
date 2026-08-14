import { clickedIn, copyEntity, type Entity, type System } from 'kernel-2d/runtime'

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
 * **A level offers what it shows.** What gets built is a copy of a tower
 * already standing in the level — level 1's archer posts are both defense and
 * catalogue — so the prefab stays the single source of what a tower is, the
 * build needs no second description of one, and nothing has to read a file
 * mid-run. The copy is the kernel's own `copyEntity`, so a built tower is a
 * whole tower: it shoots, and it can be copied again. A level containing no
 * tower offers none, which is a sandbox's honest state.
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

    for (const click of clickedIn(entities)) {
      const pad = padAt(entities, click)
      if (pad === null || isOccupied(entities, pad)) continue

      const ware = entities.find((entity) => towerOf(entity) !== null && priceOf(entity) !== null)
      if (ware === undefined) continue
      const price = priceOf(ware)
      if (price === null) continue

      const paid = pay(entities, price, pad)
      if (paid === null) continue

      const tower = copyEntity(ware, `built#${(founded += 1)}`, ware.name)
      tower.transform = { x: pad.transform.x, y: pad.transform.y, rotation: 0, scaleX: 1, scaleY: 1 }
      entities.push(tower)
    }
  },
}

let founded = 0

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

/** One tower per tile, as the spec has it: a pad with a tower on it is spent. */
function isOccupied(entities: readonly Entity[], pad: Entity): boolean {
  return entities.some((entity) => {
    if (towerOf(entity) === null) return false
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
