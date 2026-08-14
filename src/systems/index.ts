import type { System } from 'kernel-2d/runtime'

import { marchSystem } from './march'
import { shootSystem } from './shoot'

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
 * `march` before `shoot`, and the order is load-bearing: monsters take their
 * step first, so every arrow this step flies at where a monster *is*, not where
 * it stood a step ago.
 */
export const systems: readonly System[] = [marchSystem, shootSystem]
