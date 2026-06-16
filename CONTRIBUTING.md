# Contributing to hivemux

## Prerequisites

- [Bun](https://bun.sh) `>= 1.1`
- `tmux >= 3.2`
- `git`
- the agent CLIs you want to drive (`claude`, `codex`, `gemini`, `aider`, …)

## Getting started

```bash
git clone https://github.com/Bradical247/hivemux && cd hivemux
bun install
bun run build      # compile single standalone binary -> dist/hivemux
```

For development without a build step: `bun src/cli.ts <args>`.

## Checks (run before every PR)

```bash
bun run check      # tsc --noEmit + biome check + bun test , all must be clean
bun run lint:fix   # auto-fix lint + organize imports
bun run format     # format src/
```

CI mirrors `bun run check` + `bun run build`.

## Code standards

hivemux follows cmux's TypeScript engineering conventions (see
`docs/cmux-standards-review.md` for the full mapping):

- **Biome** for lint + format, `recommended` ruleset. No `// biome-ignore` without a reason.
- **Strict TypeScript**, including `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
  Use `import type` for type-only imports.
- **kebab-case** filenames; `SCREAMING_SNAKE` module constants; `60_000` numeric separators.
- Every source file opens with a `//` header explaining **why it exists**, not just what it does.
- **One shared path per behavior.** Every frontend (CLI, daemon, web, TUI) calls
  `core/manager.ts`. Never duplicate orchestration logic into a frontend, extend the core.

## Tests

- Colocate as `*.test.ts` next to the unit under test.
- **Regression policy (two commits):** for a bug fix, first commit the failing test
  alone (CI red), then commit the fix (CI green). This proves the test catches the bug.

## Architecture

`core/` is the only place that touches tmux/git/the store. `ipc/`, `tui/`, `web/`,
and `cli.ts` are thin frontends over `core/manager.ts`. Add features to the core
first, then expose them through each surface.

## License

Contributions are accepted under the repository's `LICENSE`.
