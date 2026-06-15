# amux agent notes

Conventions for any agent (or human) working in this repo. Mirrors the spirit of
cmux's `CLAUDE.md`, adapted to a TypeScript/Node CLI. Full rationale and the cmux
mapping live in `docs/cmux-standards-review.md`.

## Local dev

```bash
bun install
bun src/cli.ts <args>   # run from TS, no build
bun run build           # compile single standalone binary -> dist/amux
```

## Before finishing any change

Always run and keep clean:

```bash
bun run check           # tsc --noEmit + biome check + bun test
bun run build
```

For anything touching the daemon/web/TUI, also smoke-test the runtime path you
changed (spawn an agent with `--agent shell` in a throwaway git repo, exercise the
command, tear it down). The trailing `getcwd` error when a test `rm -rf`s its own
cwd is cosmetic, not a failure.

## Architecture rules

- `core/` is the **only** layer that touches tmux, git, or the store.
- `core/manager.ts` is the **single orchestration path**. CLI, `ipc/` daemon,
  `web/`, and `tui/` are thin frontends that call it. Do not duplicate orchestration
  logic into a frontend — add it to the core and expose it from each surface.
- The on-disk store (`~/.amux/state.json`) is the single source of truth. It is
  concurrency-safe (atomic write + lock); preserve that — never do an unguarded
  read-modify-write.

## Style

- Biome `recommended`, formatter on. `npm run lint:fix` before committing.
- Strict TS with `verbatimModuleSyntax`: `import type` for type-only imports.
- kebab-case filenames; `SCREAMING_SNAKE` consts; `60_000` numeric separators.
- Open every source file with a `//` header explaining **why it exists**.

## Tests

- Colocate `*.test.ts`. Regression fixes use the two-commit red→green structure
  (failing test first, then the fix) so CI proves the test catches the bug.

## Deliberate divergences from cmux

- Formatter is enabled (cmux deferred it for legacy-debt reasons we don't have).
- License is an open maintainer decision (currently MIT; cmux is GPL-3.0).

amux matches cmux's stack: Bun runtime, `bun test`, `moduleResolution: bundler`,
bare relative imports (no `.js`), single-binary distribution via `bun build --compile`.

## Environment note (Conrad's box)

Do NOT keep the working copy under `~/Projects` (capital P). The lowercase
`~/projects → ~/suse-projects` symlink makes Bun's bundler canonicalize
`~/Projects/amux` to the nonexistent `~/suse-projects/amux`, breaking `bun run`,
`bun test`, and `bun build`. The repo lives at `~/amux` to avoid this. Node was
immune; Bun is not.
