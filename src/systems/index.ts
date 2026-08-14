import type { System } from 'kernel-2d/runtime'

import { buildSystem } from './build'
import { leakSystem } from './leak'
import { marchSystem } from './march'
import { portalSystem } from './portal'
import { shootSystem } from './shoot'
import { tempoSystem } from './tempo'
import { verdictSystem } from './verdict'
import { waveSystem } from './waves'

/**
 * Every system this game runs, in the order it runs them.
 *
 * The editor's Play button and an exported folder both read this one list — there
 * is no per-level system list, and a level saying which systems it wants was
 * decided against rather than left out: it would be a change to every level ever
 * saved, and the hardest kind of thing to take back out.
 *
 * **Order is the order here.** Nothing sorts this or works out dependencies. When
 * this game needs its movement to run before something that reacts to movement, it
 * says so by listing them in that order, and the day list order stops being enough
 * is the day to add something.
 *
 * The kernel's own `spinSystem` is deliberately *not* here. It is scaffolding that
 * belongs to the sample project, and this game has no noun that justifies anything
 * turning.
 *
 * `tempo` before everything, so a press of P freezes the very step it lands
 * on. `waves` next, and its place is load-bearing twice over: it must
 * confiscate the drawn queue before `march`'s first step can move a waiting
 * monster, and a wave called this step must be in the level before `march`
 * walks and `shoot` aims. `build` before `march` and `shoot`, so a tower
 * bought this step stands — and fires — the same step, even in a paused game
 * (`build` is deliberately deaf to the tempo). Then `march` before `shoot`:
 * monsters take their step first, so every arrow this step flies at where a
 * monster *is*, not where it stood a step ago. `leak` after both — an arrival
 * costs a life only once movement and combat have had their say — and
 * `verdict` next-to-last, judging the step's final state: a run is won the
 * step its last monster dies, not a step later. `portal` closes the list so
 * the banner `verdict` spawns this step is a door the very next click can
 * take, and so a click that built a tower has already been spent by the time
 * portals look at it.
 */
export const systems: readonly System[] = [
  tempoSystem,
  waveSystem,
  buildSystem,
  marchSystem,
  shootSystem,
  leakSystem,
  verdictSystem,
  portalSystem,
]
