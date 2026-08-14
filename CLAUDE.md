# CLAUDE.md — tower-defense

This folder is a **game**, not an application. The application is `kernel-2d`, two folders
up; this is a document it opens. Nothing here is an engine, a dependency or a build — it is
the game as text, plus the game's own code.

The human opens it by double-clicking `Open editor.cmd` in this folder. The same
thing, from `kernel-2d/`, which is what a session uses:

```bash
npm run editor -- ../games/tower-defense
```

## The fence

`docs/GENRE-SPEC.md` is the fence around this game, and it is the human's document.

**Nothing gets built here unless a noun in that spec justifies it** — game code, editor
tools, data formats, and anything proposed for promotion into the kernel (`genre-spinup` G5).
A session that wants to build something and cannot point at a noun stops and asks. The way to
widen the fence is to change the spec first, deliberately, not to build past it and
retrofit the noun.

The spec also has a **Not in this game** section. Something missing from this game because it
is listed there is not a gap, and finding it absent is not a reason to add it.

## Who owns what

| | Owner |
|---|---|
| `src/` — components and systems | AI |
| `assets/`, `scenes/`, `prefabs/`, `data/` | The human |
| `project.json` | Either; it is written by the editor |
| `Open editor.cmd` | Neither; the kernel generates it. Regenerate, never edit |
| `docs/GENRE-SPEC.md` | The human |

AI may author content in the human's folders — including generated art — under the marking
rules in the kernel's `CLAUDE.md`: every AI-authored file carries `generatedBy` and a date,
conforms to the same schemas as hand-authored content, and **a file without that marker is
treated as human-authored and is never modified or deleted**. Ask instead.

Whether a generated piece ships or gets replaced is the human's call, made per piece.

## `src/` runs

`src/systems/index.ts` exports an ordered list, and **that list is the whole of what runs**.
The editor's Play button and an exported folder both compile it in, from these files, through
one plugin (`kernel-2d/scripts/game-code.ts`) — there is no second copy and no second build
path. The engine runs nothing this list does not name; there is no fallback and no per-level
system list.

Code here names the kernel by a package, never by a path:

```ts
import type { Entity, System } from 'kernel-2d/runtime'
```

`tsconfig.json` and `vitest.config.ts` are the two files in this folder that a session
maintains saying where the kernel actually sits — the typechecker reads one, the test
runner the other, and both point at the kernel's game-facing surface
(`runtime/game/api.ts`). If this folder moves, those two lines change together and
nothing under `src/` does.

`Open editor.cmd` says it too, for `cmd.exe` rather than for the typechecker, and is not
maintained by hand: the kernel writes it (`npm run launcher -- ../games/tower-defense`) and
rewriting it after a move is that command, not an edit.

**Typecheck it** — nothing else does, since the editor and the export only transpile:

```bash
npx tsc --noEmit -p ../games/tower-defense/tsconfig.json
```

run from `kernel-2d`, which is where TypeScript is installed. It belongs in the definition of
done for any session that touches `src/`.

**Components are this game's to invent.** The level format carries components it has never
heard of, so a system can read data the engine knows nothing about — `march` reads `speed`,
and the kernel gained nothing to make that work. Adding a component here is not a kernel
change and must not become one.

**Editing a system does not need a restart.** Save, press Stop and Play, and the new
behaviour runs; the open level, the selection and the camera all survive.

## This game's own skills

`.claude/skills/` is for knowledge true of *this game only* — how its waves are tuned, what
its data tables mean, invariants its levels hold (`genre-spinup` S2). Same three registers as
the shared library (Decisions, Gotchas, Contracts), same earned-never-invented standard.

Knowledge that would be true of any tower defense, or of any game on this kernel, does not
go here — it goes in `gamedev-skills`, and only once a second game has proved the general
part general.

## Session conduct

The kernel's `CLAUDE.md` governs: one feature per session, stop and ask when a rule blocks
the work, dependencies proposed rather than added, report in designer language, commit before
and after. The definition of done there applies to work in this folder too.
