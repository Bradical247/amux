# Changelog

All notable changes to amux are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); versions are semver.

## [Unreleased]

### Added
- Adopted cmux's TypeScript engineering standards: Biome (lint + format), strict
  tsconfig (`noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`,
  `forceConsistentCasingInFileNames`, `verbatimModuleSyntax`, `isolatedModules`).
- **Bun toolchain** to match cmux: `bun` runtime, `bun test` (+ first unit test
  `core/agents.test.ts`), `bun build --compile` single standalone binary.
- `CONTRIBUTING.md`, `CHANGELOG.md`, `CLAUDE.md` (+ `AGENTS.md` symlink), and
  `docs/cmux-standards-review.md`.
- `bun run check` / `lint` / `lint:fix` / `format` / `typecheck` scripts.

### Changed
- Migrated off Node/`tsc`-build to Bun: `moduleResolution: bundler`, bare relative
  imports (stripped `.js` specifiers), shebang `#!/usr/bin/env bun`, dropped `tsx`.
- Lint-driven cleanups: template literals, optional chaining, guarded index access,
  early returns in the TUI key handler, removal of a non-null assertion.

## [0.2.0]

### Added
- `amux conflicts` — files changed by more than one agent in the same repo.
- `amux dash` — live full-screen TUI dashboard (zero-dep ANSI, SSH-safe).
- `amux web` — HTTP + SSE dashboard, standalone, remote-reachable.
- `amux daemon` / `amux watch` — Unix-socket control plane with event push.
- `core/watcher.ts` — shared poll loop consumed by daemon, TUI, and web.

### Changed
- Refactored to a layered architecture (`core/`, `ipc/`, `tui/`, `web/`).
- Concurrency-safe store: atomic writes + cross-process lock (fixes the
  read-modify-write race on concurrent `notify`).
- All tmux/git calls are async.

## [0.1.0]

### Added
- Initial MVP: `new`, `ls`, `attach`, `kill`, `notify`, `agents`.
- tmux-backed sessions, git-worktree isolation per agent, JSON registry.
