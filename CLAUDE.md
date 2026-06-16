# hivemux agent notes

Conventions for any agent (or human) working in this repo. Mirrors the spirit of
cmux's `CLAUDE.md`, adapted to a TypeScript/Node CLI. Full rationale and the cmux
mapping live in `docs/cmux-standards-review.md`.

## Local dev

```bash
bun install
bun src/cli.ts <args>   # run from TS, no build
bun run build           # compile single standalone binary -> dist/hivemux
```

## Before finishing any change

Always run and keep clean:

```bash
bun run check           # tsc --noEmit + biome check + bun test src (unit only)
bun run build
```

For anything touching the **web/GUI**, also run the Playwright E2E (it boots a real
`hivemux gui` against a temp $HOME with throwaway `shell` agents):

```bash
bun run build && bun run test:e2e   # needs tmux + ttyd + system Chrome
```

`bun test` is scoped to `src/` so it won't pick up the `e2e/` specs (which use the
Playwright runner). For non-GUI runtime changes, still smoke-test by hand (spawn an
agent with `--agent shell` in a throwaway dir, exercise it, tear it down). The
trailing `getcwd` error when a test `rm -rf`s its own cwd is cosmetic, not a failure.

## Architecture rules

- `core/` is the **only** layer that touches tmux, git, or the store.
- `core/manager.ts` is the **single orchestration path**. CLI, `ipc/` daemon,
  `web/`, and `tui/` are thin frontends that call it. Do not duplicate orchestration
  logic into a frontend; add it to the core and expose it from each surface.
- The on-disk store (`~/.hivemux/state.json`) is the single source of truth. It is
  concurrency-safe (atomic write + lock); preserve that; never do an unguarded
  read-modify-write.

## Style

- Biome `recommended`, formatter on. `npm run lint:fix` before committing.
- Strict TS with `verbatimModuleSyntax`: `import type` for type-only imports.
- kebab-case filenames; `SCREAMING_SNAKE` consts; `60_000` numeric separators.
- Open every source file with a `//` header explaining **why it exists**.

## Tests

- Colocate unit `*.test.ts` under `src/`. Regression fixes use the two-commit
  red→green structure (failing test first, then the fix) so CI proves it catches the bug.
- Web/GUI behaviour is covered by Playwright specs in `e2e/*.e2e.ts`; keep them
  passing and add a case when you add a GUI surface.
- Tests must be hermetic: they read `~/.hivemux/config.json` via `os.homedir()`, so
  pin config-dependent assertions (point `$HOME` at a temp dir, or assert exported
  constants like `agents.DEFAULTS` directly) rather than the developer's live config.
- The Anthropic pricing table is locked by `pricing.test.ts`; change a rate there and
  in `pricing.ts` together, or CI fails.

## Releasing

One release feeds four channels. To cut `vX.Y.Z`:

1. Bump the version in `package.json`, `electron/package.json`, `publish/npm/package.json`,
   `src/cli.ts`, and `src/ipc/mcp.ts`; roll the CHANGELOG; commit; `git tag vX.Y.Z`; push the tag.
2. `release.yml` builds the binaries + AppImage/.deb/.dmg and the GitHub Release, and
   runs an npm-publish job **gated on an `NPM_TOKEN` secret** (currently unset, so it
   no-ops).
3. Manual follow-ups until that secret exists: update the Homebrew tap formula
   (`Bradical247/homebrew-hivemux`; version, `/vX.Y.Z/` URLs, both `sha256`, the test
   version), publish GitHub Packages (`@bradical247/hivemux`), and publish public npm.
   The npm package's postinstall downloads the `vX.Y.Z` release binary, so publish npm
   **after** the GitHub Release exists.
4. `gh` is authed as ThinkPool-io and can't manage Bradical247 releases/packages; use
   the Bradical247 PAT via `GH_TOKEN` for those API calls.

## Deliberate divergences from cmux

- Formatter is enabled (cmux deferred it for legacy-debt reasons we don't have).
- License is an open maintainer decision (currently MIT; cmux is GPL-3.0).

hivemux matches cmux's stack: Bun runtime, `bun test`, `moduleResolution: bundler`,
bare relative imports (no `.js`), single-binary distribution via `bun build --compile`.

## Environment note (Conrad's box)

Do NOT keep the working copy under `~/Projects` (capital P). The lowercase
`~/projects → ~/suse-projects` symlink makes Bun's bundler canonicalize
`~/Projects/hivemux` to the nonexistent `~/suse-projects/hivemux`, breaking `bun run`,
`bun test`, and `bun build`. The repo lives at `~/hivemux` to avoid this. Node was
immune; Bun is not.

Conrad's `.bashrc` aliases bare `claude` to a "use claude-thinkpool" stub. The agent
adapter send-keys its `cmd` into an interactive shell, so a bare `claude` agent is
shadowed and never starts. His `~/.hivemux/config.json` overrides the `claude` agent
(and runner) to `CLAUDE_CONFIG_DIR="$HOME/.claude-thinkpool" command claude` (the
`command` bypasses the alias, the env pins the right account). Don't drop that override.
