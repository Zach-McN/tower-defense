import type { System } from 'kernel-2d/runtime'

import { leakSystem } from './leak'
import { marchSystem } from './march'
import { shootSystem } from './shoot'
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
 * `waves` first, and its place in the line is load-bearing twice over: it must
 * confiscate the drawn queue before `march`'s first step can move a waiting
 * monster, and a wave called this step must be in the level before `march`
 * walks and `shoot` aims. Then `march` before `shoot`: monsters take their
 * step first, so every arrow this step flies at where a monster *is*, not
 * where it stood a step ago. `leak` after both — an arrival costs a life only
 * once movement and combat have had their say — and `verdict` last, judging
 * the step's final state: a run is won the step its last monster dies, not a
 * step later.
 */
export const systems: readonly System[] = [waveSystem, marchSystem, shootSystem, leakSystem, verdictSystem]
