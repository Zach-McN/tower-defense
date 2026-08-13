# CLAUDE.md — tower-defense

This folder is a **game**, not an application. The application is `kernel-2d`, two folders
up; this is a document it opens. Nothing here is an engine, a dependency or a build — it is
the game as text, plus the game's own code.

Open it with, from `kernel-2d/`:

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
| `docs/GENRE-SPEC.md` | The human |

AI may author content in the human's folders — including generated art — under the marking
rules in the kernel's `CLAUDE.md`: every AI-authored file carries `generatedBy` and a date,
conforms to the same schemas as hand-authored content, and **a file without that marker is
treated as human-authored and is never modified or deleted**. Ask instead.

Whether a generated piece ships or gets replaced is the human's call, made per piece.

## `src/` does not run yet

The folder exists; nothing loads it. The kernel's `runLevel` takes its systems as an
argument and `BUILT_IN_SYSTEMS` currently holds exactly one scaffolding entry (`spin`), and
the machinery for a game folder to supply its own systems has not been built. It is parked
deliberately in `genre-spinup`'s unbuilt list with three open questions — how a game's
TypeScript compiles into both the editor and an export, how a level says which systems it
wants, and what happens when that code changes while the editor is open.

**That is the next session's work, and it is a decision rather than a guess.** Until it
lands, do not write systems here expecting them to run.

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
