# Launch notes

## Show HN

**Title** (≤ 80 chars):

> Show HN: amux – cmux for Linux, run parallel AI coding agents in tmux

**URL:** https://github.com/Bradical247/amux

**Body:**

amux runs multiple AI coding agents (Claude Code, Codex, Gemini, Aider) in
parallel — each in its own git worktree and tmux session — and manages them from
one place: a CLI, a live TUI, a tiled view, a web dashboard, and a cmux-style
desktop app.

It's inspired by cmux (manaflow-ai/cmux), which is a polished native macOS app.
amux takes the opposite bet: because it's built on tmux, it runs **headless over
SSH**, the agents **survive disconnects**, and you can host them on a remote box
and attach from anywhere — which a desktop GUI can't do. The desktop app and web
dashboard are just frontends over the same tmux-backed core, so you get the GUI
*and* the server room.

What's in it:

- Parallel agents, isolated per git worktree (no file collisions)
- Conflict detection (flags files >1 agent touched, before you merge)
- Merge / PR orchestration, broadcast a prompt to N agents
- Usage observability: per-agent tokens, estimated cost, context-window fill
  (Anthropic rates built in; any other model via config). Cost/context caps with
  Slack/webhook alerts.
- Ships as a single self-contained binary, plus AppImage / .deb installers

Built in TypeScript on Bun, following cmux's own engineering standards (Biome,
strict tsconfig). MIT.

Honest status: v1.0, but young — I've verified the internals (incl. the
token/cost parser against real Claude Code transcripts) but it hasn't had real
users yet. Feedback very welcome, especially from people already herding multiple
agents.

## First comment (post immediately after)

Author here. The design bet is "tmux as the substrate": amux doesn't reimplement
PTYs/sessions/persistence — tmux already nails those — it adds the agent layer on
top (worktree isolation, status/notifications, conflict detection, usage/cost).
That's why it's headless-and-remote-first instead of a desktop app.

Happy to answer anything about the architecture or the cost-tracking approach
(it parses each agent CLI's own transcript, or accepts pushed usage from a hook).

## HN status
Show HN is gated for new accounts (anti-spam). Plan: comment thoughtfully for
1–2 weeks to build a little karma, then Show HN is allowed. Park it; use the
channels below now (no reputation gate).

## Channel 1 — awesome lists (evergreen, no gate, highest leverage)
Open a PR adding amux to lists people already search. Best targets:
- `andyrewlee/awesome-agent-orchestrators` (lists cmux et al — direct fit)
- `rothgar/awesome-tmux`
- `hesreallyhim/awesome-claude-code` (or similar)
Entry line:
> **[amux](https://github.com/Bradical247/amux)** — Linux-native, tmux-backed
> orchestrator for parallel AI coding agents: isolated git worktrees, conflict
> detection, merge/PR, usage/cost tracking; CLI + TUI + web + desktop GUI.

## Channel 2 — X / Twitter (post the demo GIF)
> Built amux: run parallel AI coding agents (Claude Code, Codex, Gemini, Aider)
> on Linux — each in its own git worktree + tmux session.
>
> Like cmux, but tmux-backed: headless over SSH, survives disconnects, GUI *and*
> the server room. Conflict detection, merge/PR, token/cost tracking.
>
> MIT, single binary + AppImage. https://github.com/Bradical247/amux
Attach `assets/demo.gif`. Reply with `assets/gui.png` (the desktop window).

## Channel 3 — Reddit (frame as "I built", read each sub's self-promo rule first)
- **r/commandline** — lead with the CLI + tmux angle + the demo GIF.
- **r/selfhosted** — lead with headless/remote/SSH + web dashboard.
- **r/ClaudeAI** / **r/LocalLLaMA** — lead with parallel agents + cost tracking.

Reddit body:
> I kept wanting to run several coding agents at once without them clobbering each
> other, so I built amux: each agent gets its own git worktree + tmux session, and
> you manage them from a CLI, a live TUI, a web dashboard, or a desktop app. Because
> it's tmux-backed it runs headless over SSH and survives disconnects. It also flags
> file conflicts before you merge and tracks per-agent token cost. MIT, single binary
> + AppImage. Repo: https://github.com/Bradical247/amux — feedback welcome.

