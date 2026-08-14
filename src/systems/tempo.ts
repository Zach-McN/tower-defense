import { pressedIn, type Entity, type System } from 'kernel-2d/runtime'

/**
 * Speed controls — pause and fast-forward, the spec's own pair and no more.
 *
 * *"Load-bearing, not a nicety: the player spends most of the game watching,
 * and watching at 1× is the difference between a good game and a slow one."*
 * `P` toggles pause; `F` toggles fast-forward at 3×; pause wins while both
 * are on, and both are toggles because a control the player must hold is a
 * control that fights the watching it exists for.
 *
 * **Tempo is the game's, not the clock's.** The kernel's loop keeps its fixed
 * step — every system is still called sixty times a second — and each system
 * that consumes time multiplies its own step by `tempoOf(entities)`. That
 * keeps the whole thing game-side on the extraction rule (a second game
 * wanting this is the day the kernel is asked), and it keeps a decision open
 * that a kernel rate-control would have closed: a *paused game is not a paused
 * program*. Systems still run, presses still land, and a wave can be called
 * while paused — the queue simply stands frozen at the spawn until time moves,
 * which is the calm look-at-the-board moment this genre is about.
 *
 * A system that consumes time and forgets the multiplier runs at 1× while the
 * rest of the game is paused — the failure is visible the first time `P` is
 * pressed, which is the best kind. The rule: **any `dtSeconds * x` in this
 * game has `tempoOf` beside it.**
 *
 * **The state of time is shown on the board**, like every other fact of a run:
 * one glyph entity at the board's centre — pause bars or chevrons, art the
 * Ground prefab names under its `tempo` component (the `texture`-field rule,
 * T9) — spawned while the control is on and removed when time runs plain.
 * Toggles live beside the run in a WeakMap (T6): Stop and Play starts at 1×
 * with nothing to reset.
 */
export const tempoSystem: System = {
  id: 'tempo',

  step: (entities) => {
    const state = stateOf(entities)

    for (const press of pressedIn(entities)) {
      if (press === PAUSE_KEY) state.paused = !state.paused
      if (press === FAST_KEY) state.fast = !state.fast
    }

    show(entities, state)
  },
}

/**
 * How fast this run's time passes: 0 paused, 3 fast, 1 plain.
 *
 * Answers 1 for a run `tempo` has never seen, so every system test that drives
 * `march` or `shoot` alone keeps meaning what it always meant.
 */
export function tempoOf(entities: readonly Entity[]): number {
  const state = tempos.get(entities)
  if (state === undefined) return 1
  if (state.paused) return 0
  return state.fast ? FAST_RATE : 1
}

const PAUSE_KEY = 'KeyP'
const FAST_KEY = 'KeyF'

/**
 * Three, not two: at 2× a brute still dawdles, and the spec's reason for the
 * control is that watching should never be the slow part. Tuning it is a
 * one-line affair for whoever disagrees.
 */
const FAST_RATE = 3

interface Tempo {
  paused: boolean
  fast: boolean
  /** The glyph on the board, while one is showing. */
  sign: Entity | null
}

const tempos = new WeakMap<readonly Entity[], Tempo>()

function stateOf(entities: readonly Entity[]): Tempo {
  const known = tempos.get(entities)
  if (known !== undefined) return known

  const fresh: Tempo = { paused: false, fast: false, sign: null }
  tempos.set(entities, fresh)
  return fresh
}

/** Keeps the board's glyph in line with the state, spawning and removing as it flips. */
function show(entities: Entity[], state: Tempo): void {
  const wanted = state.paused ? 'paused' : state.fast ? 'fast' : null
  const showing = state.sign === null ? null : (state.sign.id === 'tempo#paused' ? 'paused' : 'fast')
  if (wanted === showing) return

  if (state.sign !== null) {
    const at = entities.indexOf(state.sign)
    if (at !== -1) entities.splice(at, 1)
    state.sign = null
  }

  if (wanted === null) return

  const sign = signFor(entities, wanted)
  if (sign === null) return
  state.sign = sign
  entities.push(sign)
}

/**
 * The glyph, standing where the `tempo`-carrying entity stands — the Ground,
 * so the board's centre — twice life size. A level whose content names no
 * tempo art shows nothing and still obeys the controls: the picture degrades,
 * the time does not (game-code T3).
 */
function signFor(entities: readonly Entity[], which: 'paused' | 'fast'): Entity | null {
  for (const entity of entities) {
    const component: unknown = entity.components['tempo']
    if (typeof component !== 'object' || component === null) continue

    const side: unknown = (component as Record<string, unknown>)[which]
    if (typeof side !== 'object' || side === null) continue
    const texture: unknown = (side as { texture?: unknown }).texture
    if (typeof texture !== 'object' || texture === null) continue
    const { id, path } = texture as Record<string, unknown>
    if (typeof id !== 'string' || typeof path !== 'string') continue

    return {
      id: which === 'paused' ? 'tempo#paused' : 'tempo#fast',
      name: which === 'paused' ? 'Paused' : 'Fast forward',
      transform: { ...entity.transform, rotation: 0, scaleX: 2, scaleY: 2 },
      components: { sprite: { texture: { id, path } } },
    }
  }

  return null
}
