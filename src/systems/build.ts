import { clickedIn, copyEntity, pressedIn, type Entity, type System } from 'kernel-2d/runtime'

import { slowOf } from './march'
import { towerOf } from './shoot'
import { isWare, nextRungOf, priceOf, raise, sellOff, waresArt } from './trade'

/**
 * Spending gold — the middle of the spec's loop, all three verbs of it:
 * *"Build a new tower on a buildable tile, or pay to upgrade one you already
 * own to its next tier, or sell one for a partial refund to free up the tile
 * and the money."*
 *
 * **A buildable tile is the spec's third tile kind, drawn like the other two**
 * (`prefabs/tile-buildable.json`, `tile: { kind: "buildable" }`): where the
 * player may build is level design, so the author places pads the way they
 * draw the road. A click during play lands on a system as a scene-unit point
 * on the input entity (`clickedIn` — the kernel's pointer). What one click
 * means is decided in order: a ware chooses, an armed sell sells, an owned
 * tower upgrades, a vacant pad builds, and anywhere else is nobody's.
 *
 * **A level offers what it shows.** What gets built is a copy of a standing
 * example — so the prefab stays the single source of what each kind is, and
 * nothing reads a file mid-run. The shop row carries the **ware mark**
 * (`trade.ts`): marked pieces are the catalogue and never fight; a level with
 * no marked shop row falls back to offering the distinct kinds among its
 * standing defenders, which keeps a sandbox honest. The number keys choose —
 * `1` is the first kind on show — and clicking a ware chooses it too. The
 * choice hangs over the chosen ware as the golden arrow (`wares.chosen` art,
 * named by the Ground prefab); **while a sell is armed the arrow is replaced
 * by the selling sign** (`wares.selling`), which is where the player looks
 * for what their next click will mean.
 *
 * **Upgrading is clicking a tower you own.** Owned means standing and not a
 * ware — the level's starting towers included, bought copies included. The
 * click buys the next rung of the type's ladder (`tiers` on the prefab,
 * `trade.ts`), paid exactly like a build; at the top of the ladder, or broke,
 * the click does nothing. Star pips above the tower say how high it stands.
 *
 * **Selling is `X`, then a click on a tower you own.** One-shot: the click
 * sells — or stands the mode down if it lands anywhere else — and a digit
 * press stands it down too. The refund (seventy percent of everything spent,
 * `trade.ts`) lands as a coin where the tower stood, wearing the face the
 * Ground names under `wares.coin`; the pad under it is free again by the same
 * arithmetic that found it occupied.
 *
 * **The coins on the ground are the budget** (T11): every price is paid by
 * removing coins, largest first, change dropped back as a coin at the spot.
 * Not enough coins on the board means the click does nothing, which the
 * player reads off the board itself.
 *
 * **All of it works while paused, on purpose.** This system never reads the
 * tempo: the spec's building phase has no time pressure. A *decided* level
 * trades no more — coins spent under a verdict banner would buy nothing but
 * regret.
 */
export const buildSystem: System = {
  id: 'build',

  step: (entities) => {
    if (entities.some((entity) => entity.components['verdict'] !== undefined)) return

    const wares = catalogueOf(entities)
    const state = stateOf(entities)

    for (const press of pressedIn(entities)) {
      if (press === SELL_KEY) {
        state.selling = !state.selling
        continue
      }
      const digit = /^Digit([1-9])$/.exec(press)
      if (digit === null) continue
      const wanted = Number(digit[1]) - 1
      if (wanted < wares.length) {
        state.index = wanted
        state.selling = false
      }
    }

    if (state.index >= wares.length) state.index = 0
    const chosen = wares[state.index] ?? null

    for (const click of clickedIn(entities)) {
      // A click on a ware is a choice, never a purchase — the shop row is
      // where the catalogue stands, and pointing at it picks from it.
      const picked = wareAt(entities, wares, click)
      if (picked !== null) {
        state.index = picked
        state.selling = false
        continue
      }

      // An armed sell spends its one click here, on a tower or on nothing.
      if (state.selling) {
        state.selling = false
        const owned = ownedAt(entities, click)
        if (owned !== null && priceOf(owned) !== null) {
          const refund = sellOff(entities, owned)
          dropRefund(entities, refund, owned)
        }
        continue
      }

      // A click on an owned tower buys its next rung, if it has one to buy.
      const owned = ownedAt(entities, click)
      if (owned !== null) {
        const rung = nextRungOf(owned)
        if (rung !== null && pay(entities, rung.price, owned) !== null) raise(entities, owned, rung)
        continue
      }

      const pad = padAt(entities, click)
      if (pad === null || isOccupied(entities, pad)) continue

      if (chosen === null) continue
      const price = priceOf(chosen)
      if (price === null) continue

      const paid = pay(entities, price, pad)
      if (paid === null) continue

      const building = copyEntity(chosen, `built#${(founded += 1)}`, chosen.name)
      // The mark stays on the shelf: the copy is a defender, not merchandise.
      delete building.components['ware']
      building.transform = { x: pad.transform.x, y: pad.transform.y, rotation: 0, scaleX: 1, scaleY: 1 }
      entities.push(building)
    }

    point(entities, chosen, state)
  },
}

let founded = 0

/** Arms a sell; the next click resolves it, one way or the other. */
const SELL_KEY = 'KeyX'

/** A building: anything that fights from a tile — it shoots, or it chills. */
function isBuilding(entity: Entity): boolean {
  return towerOf(entity) !== null || slowOf(entity) !== null
}

/**
 * One standing example of each kind the level offers, in order of first
 * appearance. The marked shop row is the catalogue; a level that marks no
 * wares offers the distinct kinds among its standing defenders instead. A
 * kind is what an instance was placed from, so building never grows the
 * catalogue.
 */
function catalogueOf(entities: readonly Entity[]): Entity[] {
  const marked = new Map<string, Entity>()
  const standing = new Map<string, Entity>()
  for (const entity of entities) {
    if (!isBuilding(entity) || priceOf(entity) === null) continue
    const into = isWare(entity) ? marked : standing
    const kind = kindOf(entity)
    if (!into.has(kind)) into.set(kind, entity)
  }
  return marked.size > 0 ? [...marked.values()] : [...standing.values()]
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

/** What the number keys and the shop row have picked this run. Dies with it (T6). */
interface Choosing {
  index: number
  selling: boolean
  marker: Entity | null
  /** Which face the marker wears — the golden arrow, or the selling sign. */
  face: 'chosen' | 'selling'
}

const choices = new WeakMap<readonly Entity[], Choosing>()

function stateOf(entities: readonly Entity[]): Choosing {
  const known = choices.get(entities)
  if (known !== undefined) return known
  const fresh: Choosing = { index: 0, selling: false, marker: null, face: 'chosen' }
  choices.set(entities, fresh)
  return fresh
}

/**
 * Keeps the marker over one standing example of the chosen kind — the golden
 * arrow ordinarily, the selling sign while a sell is armed — or absent, when
 * nothing is for sale or no entity names `wares` art. A level that shows no
 * marker still obeys the keys (game-code T3's degrade).
 */
function point(entities: Entity[], chosen: Entity | null, state: Choosing): void {
  const face = state.selling ? 'selling' : 'chosen'

  if (state.marker !== null && (chosen === null || state.face !== face)) {
    const at = entities.indexOf(state.marker)
    if (at !== -1) entities.splice(at, 1)
    state.marker = null
  }
  if (chosen === null) return

  if (state.marker === null) {
    const texture = waresArt(entities, face)
    if (texture === null) return
    state.marker = {
      id: 'wares#chosen',
      name: face === 'selling' ? 'Selling' : 'Chosen ware',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      components: { sprite: { texture } },
    }
    state.face = face
    entities.push(state.marker)
  }

  state.marker.transform.x = chosen.transform.x
  state.marker.transform.y = chosen.transform.y + 14
}

/** Half a tile — the same "on this tile" arithmetic as a leak at the goal. */
const ON_PAD = 8

/** The catalogue index of the ware under this click, or null when it missed the row. */
function wareAt(entities: readonly Entity[], wares: readonly Entity[], click: { x: number; y: number }): number | null {
  for (const entity of entities) {
    if (!isWare(entity) || !isBuilding(entity)) continue
    const dx = entity.transform.x - click.x
    const dy = entity.transform.y - click.y
    if (dx * dx + dy * dy > ON_PAD * ON_PAD) continue

    const kind = kindOf(entity)
    const index = wares.findIndex((ware) => kindOf(ware) === kind)
    if (index !== -1) return index
  }
  return null
}

/** The owned building under this click: standing, fighting, and not a ware. */
function ownedAt(entities: readonly Entity[], click: { x: number; y: number }): Entity | null {
  for (const entity of entities) {
    if (isWare(entity) || !isBuilding(entity)) continue
    const dx = entity.transform.x - click.x
    const dy = entity.transform.y - click.y
    if (dx * dx + dy * dy <= ON_PAD * ON_PAD) return entity
  }
  return null
}

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
    if (isWare(entity) || !isBuilding(entity)) return false
    const dx = entity.transform.x - pad.transform.x
    const dy = entity.transform.y - pad.transform.y
    return dx * dx + dy * dy <= ON_PAD * ON_PAD
  })
}

/**
 * Takes the price off the board, or answers null leaving it untouched.
 *
 * Largest coins first, so the overshoot — dropped back as one change coin at
 * the spot's foot — is as small as the denominations allow. The change coin is
 * a copy of a spent one with its worth rewritten, so it wears the same face
 * and stays spendable.
 */
function pay(entities: Entity[], price: number, spot: Entity): number | null {
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
    coin.transform = { x: spot.transform.x + 6, y: spot.transform.y - 6, rotation: 0, scaleX: 1, scaleY: 1 }
    entities.push(coin)
  }

  return paid
}

/**
 * The refund, landing as a coin where the sold tower stood — its face the one
 * the Ground names under `wares.coin`. A level naming none keeps the removal
 * and forfeits the money, the honest reading of art that was never authored
 * (game-code T3's degrade); a refund rounded down to nothing drops nothing.
 */
function dropRefund(entities: Entity[], refund: number, sold: Entity): void {
  if (refund <= 0) return
  const texture = waresArt(entities, 'coin')
  if (texture === null) return
  entities.push({
    id: `refund#${(minted += 1)}`,
    name: 'Coin',
    transform: { x: sold.transform.x, y: sold.transform.y, rotation: 0, scaleX: 1, scaleY: 1 },
    components: { sprite: { texture }, coin: { gold: refund } },
  })
}

let minted = 0

/** What this coin is worth, or null if it is not one (game-code T3). */
function coinOf(entity: Entity): number | null {
  const component: unknown = entity.components['coin']
  if (typeof component !== 'object' || component === null) return null
  const gold: unknown = (component as { gold?: unknown }).gold
  return typeof gold === 'number' && Number.isFinite(gold) && gold > 0 ? gold : null
}
