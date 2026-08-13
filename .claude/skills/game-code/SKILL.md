---
name: game-code
description: How this tower defense game's own code is organised — what systems exist, what components they read, and the conventions those follow. Consult whenever adding or changing anything under `src/`, inventing a component for a level to carry, or deciding whether something belongs in this game or in the kernel underneath it.
---

# game-code

Knowledge true of **this game only**. Anything here that turns out to be true of any
game on this kernel gets promoted to `gamedev-skills` when a second game proves it
general, and not before (`genre-spinup` S2).

## Decisions

### T1: A component this game invents is this game's, and adding one is never a kernel change

The scene format carries components it has never heard of — the loader keeps them,
the Inspector names them without offering to edit them, and a system here can read
them. So a behaviour that needs data on an entity gets a component **here**, and the
kernel gains nothing.

The first one is `speed`, read by `march`:

```json
"components": { "speed": { "unitsPerSecond": 24 } }
```

**The pressure this exists to resist** is the obvious-looking fix of adding `speed`
to the kernel's `COMPONENT_SCHEMAS` so the Inspector can edit it. That is the kernel
acquiring a genre's vocabulary, and the rule is that it grows by extraction once a
*second* game wants the same primitive (`genre-spinup` S1). Wanting a nicer editing
experience is not that. When editing these by hand becomes the real cost, the answer
is a tool in this folder speaking this game's words, justified by a noun in
`docs/GENRE-SPEC.md`. _[earned 2026-08-13]_

### T2: `march` moves along x because there is no path yet, and that is written down rather than hidden

The spec's Monster noun says *"walks the path from spawn to goal"* and *"two things
vary and only two: speed and health."* `march` implements the speed half against a
level with no path in it, so it moves along the x axis.

**The named trigger:** when levels carry a path — tiles, a route, a spawn — `march`
is the system that learns to read one. The component it reads and the noun it serves
do not change; only how it decides which way is forward. Do not write a second
movement system beside it. _[earned 2026-08-13]_

### T3: A malformed component means "this does not apply", never a throw

Systems run sixty times a second, so an exception from inside one is the hardest kind
of fault to trace back to the file that caused it — and the file that caused it is
usually a level somebody hand-edited. Every component reader here validates and
answers `null`, and the caller skips that entity.

Follow it for every component reader added: check the shape, answer null, skip.
_[earned 2026-08-13]_

## Gotchas

_None yet._

## Contracts

- `src/systems/index.ts` — the ordered list of everything this game runs. The engine
  runs nothing that is not in it; there is no per-level system list and no fallback.
- `src/systems/march.ts` — `march`, and the `speed` component it reads.
- `tsconfig.json` — the only file here that says where the kernel sits on disk. Code
  names the package `kernel-2d/runtime` and never a path.
- `docs/GENRE-SPEC.md` — the fence. Nothing gets built here without a noun in it.
