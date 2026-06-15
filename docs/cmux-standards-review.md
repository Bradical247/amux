# cmux standards review

A review of how cmux (`manaflow-ai/cmux`) is built, and how amux was brought into
line with its **engineering** standards. cmux is ~2,700 files of Swift (a native
macOS app) plus a large TypeScript surface (`web/`, `webviews/`, `workers/`,
`CLI` socket clients). amux is pure TypeScript/Node, so only cmux's TS/tooling and
cross-cutting engineering conventions apply — the Swift/SwiftUI/Ghostty rules do not.

## What cmux's standard actually is (observed in-repo)

| Area | cmux | Source |
|---|---|---|
| Lint | **Biome** `2.5.0`, `linter.rules` recommended; formatter disabled *"for now… until the remaining source lint diagnostics are paid down"* | `biome.json`, `CONTRIBUTING.md` |
| Package mgr / runtime | **Bun** (`bun.lock`, `bun test`, `bun X.ts`) | `package.json`, `CONTRIBUTING.md` |
| TS config (backend profile) | `target ES2022`, `module ESNext`, `moduleResolution bundler`, `strict`, **`noUncheckedIndexedAccess`**, **`noFallthroughCasesInSwitch`**, **`forceConsistentCasingInFileNames`**, `isolatedModules`, **`verbatimModuleSyntax`**, `noEmit` | `workers/presence/tsconfig.json` |
| File naming | **kebab-case** (`docs-search-utils.ts`, `agent-page-canonical-fetch.ts`) | `web/`, `workers/` |
| File headers | Every source file opens with a `//` block explaining **purpose + rationale**, not just what | e.g. `workers/presence/src/auth.ts` |
| Naming | `SCREAMING_SNAKE` consts, numeric separators (`60_000`), `readonly` arrays in interfaces, JSDoc on exports | `auth.ts` |
| Shared behavior | One shared action/model path per behavior across all entrypoints; no duplicated logic per surface. Optimistic updates: single mutation path, pending state, reconcile, explicit rollback | `CLAUDE.md` "Shared behavior policy" |
| Tests | Colocated `*.test.ts`, `bun test`; **regression policy: two-commit red→green** so CI proves the test catches the bug; behavior-level coverage | `CLAUDE.md`, `package.json` |
| Docs / process | `CONTRIBUTING.md`, big `CLAUDE.md` agent-notes, `AGENTS.md` → `CLAUDE.md` symlink, `CHANGELOG.md`, area-scoped `skills/`, `.coderabbit.yaml` + greptile review bots, `/release` with version-bump + pretag guard | repo root |
| License | **GPL-3.0-or-later** + contributor grant to Manaflow, Inc. | `LICENSE`, `CONTRIBUTING.md` |

## amux conformance after this pass

| Standard | Before | Now |
|---|---|---|
| Biome lint, recommended | ✗ none | ✓ `biome.json`, `npm run lint` clean |
| Biome formatter | ✗ none | ✓ **enabled** (see divergence #1) |
| Strict tsconfig extras | partial (`strict` only) | ✓ added `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `verbatimModuleSyntax`, `isolatedModules` |
| kebab-case filenames | ✓ (single-word) | ✓ unchanged |
| File-header rationale comments | ✓ already | ✓ unchanged |
| `SCREAMING_SNAKE` / `60_000` / `import type` | ✓ mostly | ✓ enforced by lint + `verbatimModuleSyntax` |
| Single shared path (no per-surface dup) | ✓ `core/manager.ts` is the only path; CLI/daemon/web/TUI all call it | ✓ matches cmux's "Shared behavior policy" by construction |
| `CONTRIBUTING.md` / `CHANGELOG.md` / `CLAUDE.md` / `AGENTS.md` | ✗ | ✓ added |
| Colocated `*.test.ts` + regression policy | ✗ no tests yet | ⏳ policy documented; suite is the next task |
| Review bots (`.coderabbit.yaml`) | ✗ | ⏳ deferred (infra; add when repo is on GitHub) |

### Code changes the stricter gates forced

- `noUncheckedIndexedAccess`: guarded array indexing in `cli.ts` and `tui/dash.ts` (`widths[i] ?? 0`).
- Biome `noAssignInExpressions`: rewrote the `while ((nl = buf.indexOf("\n")) >= 0)` line-framing loops in `ipc/client.ts` and `ipc/server.ts`.
- Biome `noVoidTypeReturn`: restructured `onKey` in `tui/dash.ts` to early-`return` instead of `return quit()`.
- Biome `noNonNullAssertion`: removed `next.get(a.name)!` in `core/watcher.ts`.
- Auto-fixes: template literals over `+`, optional chaining, import ordering, formatting.

Gates now: `npm run check` = `tsc --noEmit` + `biome check`, both clean; `npm run build` green; runtime smoke (CLI + daemon socket + web SSE) passing.

## Deliberate divergences from cmux (with rationale)

1. **Formatter ON.** cmux disabled Biome's formatter to avoid churn against legacy
   lint debt. amux is greenfield with zero debt, so we enable formatter + import
   organization now — it's the direction cmux's `CONTRIBUTING.md` says it wants to
   go once debt is paid.
2. ~~Node runtime, not Bun.~~ **RESOLVED — Bun adopted.** amux now matches cmux's
   stack: Bun runtime, `bun test`, `moduleResolution: bundler`, bare relative
   imports (no `.js`), and single-binary distribution via `bun build --compile` (a
   91 MB self-contained executable — arguably a *better* distribution story than
   cmux's macOS `.dmg`, since the target needs nothing installed). One environment
   caveat: on Conrad's box the working copy must live at `~/amux`, not `~/Projects`,
   because the lowercase `~/projects → ~/suse-projects` symlink confuses Bun's
   bundler. See `CLAUDE.md`.
3. **License: MIT (current) vs cmux GPL-3.0-or-later.** Not an engineering call —
   left to the maintainer. *Open question.*

## Not applicable (Swift/macOS-only)

Localization (`Localizable.xcstrings`), SwiftUI list snapshot-boundary CPU rules,
typing-latency paths, `pbxproj` test-wiring, Ghostty submodule workflow, Sparkle
release signing. Listed only to show they were reviewed and consciously excluded.
