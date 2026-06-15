# amux

**A Linux-native, tmux-backed orchestrator for parallel AI coding agents.**

Run many coding agents (Claude Code, Codex, Gemini, Aider, …) at once — each in
its own isolated git worktree and tmux session — and manage them all from one
place. Unlike desktop-GUI orchestrators, amux is built on tmux, so it runs
**headless over SSH, persists across disconnects, and lives on a remote box you
attach to from anywhere**.

> Inspired by [cmux](https://github.com/manaflow-ai/cmux) (macOS/Ghostty).
> amux trades the native GUI for the thing macOS terminals can't give you:
> the server room.

## Why tmux as the base

tmux already solves the hard parts — PTYs, sessions, panes, and **persistence
across disconnects**. amux doesn't reimplement any of it. It's a thin layer that
adds the agent-specific concerns on top:

| Concern | Who handles it |
|---|---|
| PTY / session / pane / persistence | tmux |
| Isolated working dir per agent | git worktree |
| Spawn / list / attach / kill agents | amux |
| Status + notifications ("agent is waiting") | amux + agent hooks |

## Status

**v0.2.** Working: `new`, `ls`, `attach`, `kill`, `notify`, `agents`, `conflicts`,
`dash` (live TUI), `web` (dashboard + SSE), `daemon`, `watch`.

## Commands

```
amux new <name> [--agent claude] [--repo .] [--branch b] [--base ref]
amux ls
amux attach <name>
amux kill <name> [--rm-worktree]
amux notify [--name n] --status waiting --note "..."
amux conflicts                       # files touched by >1 agent (merge collisions)
amux dash                            # live full-screen TUI
amux web [--port 7878] [--host 0.0.0.0]   # web dashboard, SSE live updates
amux daemon                          # control-plane daemon (event push, remote API)
amux watch                           # stream live status from the daemon
amux agents
```

## Install

```bash
git clone https://github.com/Bradical247/amux && cd amux
bun install
bun run build      # compiles a single standalone binary -> dist/amux
```

`bun run build` produces a self-contained executable (the Bun runtime is embedded),
so the target machine needs **nothing installed** to run it — copy `dist/amux` to a
server and go. This is the distribution edge over cmux's macOS `.dmg`: one static
Linux binary, headless-friendly.

Requires (build/dev): [Bun](https://bun.sh) `>= 1.1`, `tmux >= 3.2`, `git`, plus
whatever agent CLIs you drive. Dev without building: `bun src/cli.ts <args>`.

## Quickstart

```bash
cd ~/your-repo

amux new fix-auth                 # worktree + tmux session, launches `claude`
amux new add-tests --agent aider  # a second agent, isolated from the first
amux ls                           # see them all + status
amux attach fix-auth              # drop into one
# Ctrl-b d to detach; the agent keeps running
amux kill fix-auth --rm-worktree  # tear it down
```

### Status notifications (cmux-style "waiting" signal)

Each session gets `$AMUX_NAME` in its env. Wire your agent's hooks to report
back, so `amux ls` shows when an agent is blocked on you:

```bash
# e.g. a Claude Code Stop hook:
amux notify --status waiting --note "needs review"
```

## Configuration

`~/.amux/config.json` to add or override agent adapters:

```json
{
  "agents": {
    "claude-yolo": { "cmd": "claude --dangerously-skip-permissions" }
  }
}
```

State lives in `~/.amux/state.json`; worktrees in `~/.amux/worktrees/<repo>/<name>`.

## Roadmap

- [x] **`amux dash`** — live TUI dashboard driven by the shared watcher.
- [x] **Web dashboard** — remote-accessible UI + SSE; the cmux experience, reachable from anywhere.
- [x] **Conflict detection** — flag files touched by more than one agent before you merge.
- [x] **Socket/JSON API** — daemon control plane with event push (cmux parity).
- [ ] **Merge/PR orchestration** — one command to land a finished agent's branch (push, open PR).
- [ ] **`amux broadcast`** — send the same instruction to N agents at once.
- [ ] **TUI: tiled live agent panes** (currently a status table + attach).
- [ ] **Web: create-agent form + auth** before binding `--host 0.0.0.0` in the open.
- [ ] **Go rewrite (single static binary)** once the design settles.

## Architecture

Layered: one core, many frontends. No frontend touches tmux/git/store directly.

```
src/
  core/
    manager.ts   — the single orchestration API (create/list/kill/notify/conflicts)
    tmux.ts      — async wrapper over the tmux CLI
    git.ts       — worktrees + changed-file detection
    store.ts     — ~/.amux/state.json, atomic writes + cross-process lock
    watcher.ts   — shared poll loop → "tick"/"change"/"remove" events
    agents.ts    — pluggable agent adapters
    types.ts
  ipc/           — Unix-socket JSON daemon (server) + client + protocol
  tui/dash.ts    — zero-dep ANSI TUI over the watcher
  web/           — node:http + SSE dashboard (server + inlined page)
  cli.ts         — thin frontend over core
```

The store is the single source of truth (concurrency-safe), so CLI / daemon / web
never diverge. The daemon and web server each run a `Watcher` and push deltas to
their clients — no per-client tmux polling.

## License

MIT
