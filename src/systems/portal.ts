import { clickedIn, factOf, openDoor, type Entity, type System } from 'kernel-2d/runtime'

/**
 * Portals — the level select's whole machinery, and the way home.
 *
 * The spec's noun is *Level select* — *"the list of levels and which have been
 * completed. Minimal; a menu."* — and the menu is a scene like any other:
 * `scenes/select.json` places one banner per level, each carrying a `portal`
 * component naming the scene it opens (`prefabs/level-banner-*.json`, a kind
 * of thing and therefore a prefab, T7's shape yet again). Clicking a banner
 * asks the kernel's door seam to open that scene; what "opening" means —
 * loading the file, swapping the run — is the host's, exactly as the keyboard
 * and the pointer are. The same component on the verdict banner (`verdict.ts`
 * attaches it, aimed at the Ground's authored `home`) is what makes the
 * trophy and the skull clickable: the way back to the menu, win or lose.
 *
 * **"Which have been completed" is a remembered fact.** Victory learns
 * `facts[scene] = { won: true }` through the kernel's story seam
 * (`verdict.ts`); this system reads the same fact for each portal and hangs a
 * check-mark entity on the banners of levels that are done — art the portal
 * itself authors under `done.texture`, loaded with the level by the
 * `texture`-field rule (T9). A run with no story carrier (every older test,
 * a sandbox) simply shows no checks and travels nowhere on victory: the menu
 * degrades, never throws (T3).
 */
export const portalSystem: System = {
  id: 'portal',

  step: (entities) => {
    mark(entities)

    for (const click of clickedIn(entities)) {
      for (const entity of entities) {
        const portal = portalOf(entity)
        if (portal === null) continue

        const dx = entity.transform.x - click.x
        const dy = entity.transform.y - click.y
        if (dx * dx + dy * dy > portal.reach * portal.reach) continue

        openDoor(entities, portal.scene)
        return
      }
    }
  },
}

/** Half a tile, matching every other "on this thing" reading in this game. */
const DEFAULT_REACH = 8

interface Portal {
  scene: string
  reach: number
  done: { id: string; path: string } | null
}

/** The portal component, whole or not at all (game-code T3). */
export function portalOf(entity: Entity): Portal | null {
  const component: unknown = entity.components['portal']
  if (typeof component !== 'object' || component === null) return null

  const { scene, reach, done } = component as Record<string, unknown>
  if (typeof scene !== 'string' || scene.length === 0) return null
  if (reach !== undefined && (typeof reach !== 'number' || !Number.isFinite(reach) || reach <= 0)) return null

  let check: Portal['done'] = null
  if (done !== undefined) {
    if (typeof done !== 'object' || done === null) return null
    const texture: unknown = (done as { texture?: unknown }).texture
    if (typeof texture !== 'object' || texture === null) return null
    const { id, path } = texture as Record<string, unknown>
    if (typeof id !== 'string' || typeof path !== 'string') return null
    check = { id, path }
  }

  return { scene, reach: reach ?? DEFAULT_REACH, done: check }
}

/**
 * Hangs a check on the corner of every portal whose level is remembered won.
 * Facts only accumulate, so a check never needs taking down mid-run.
 */
function mark(entities: Entity[]): void {
  const checks: Entity[] = []

  for (const entity of entities) {
    const portal = portalOf(entity)
    if (portal === null || portal.done === null) continue

    const fact: unknown = factOf(entities, portal.scene)
    const won = typeof fact === 'object' && fact !== null && (fact as { won?: unknown }).won === true
    if (!won) continue

    const id = `done#${entity.id}`
    if (entities.some((one) => one.id === id)) continue

    checks.push({
      id,
      name: 'Completed',
      transform: {
        x: entity.transform.x + 6 * entity.transform.scaleX,
        y: entity.transform.y + 6 * entity.transform.scaleY,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      components: { sprite: { texture: portal.done } },
    })
  }

  entities.push(...checks)
}
