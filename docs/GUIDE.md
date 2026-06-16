# hivemux, usage guide / runbook

Task-oriented recipes. For the command reference see the README; for design notes
see `docs/`.

## Install

- **Desktop app**: download the AppImage / `.deb` / `.dmg` from
  [Releases](https://github.com/Bradical247/hivemux/releases/latest).
- **CLI**: download `hivemux-linux-x64` / `hivemux-macos-arm64`, `chmod +x`, put on PATH.
- **From source**: `bun install && bun run build` → `dist/hivemux`.

Needs `tmux >= 3.2`, `git`, and the agent CLIs you drive (`claude`, …).

---

## Recipe 1, run a few agents by hand

```bash
cd ~/your-repo
hivemux new fix-auth                 # worktree + tmux session, launches the agent
hivemux new add-tests --agent aider
hivemux ls                           # see them + status
hivemux attach fix-auth              # drop in; Ctrl-b d to detach (agent keeps running)
hivemux conflicts                    # files >1 agent touched, before you merge
hivemux merge fix-auth               # land it
hivemux kill fix-auth --rm-worktree
```

## Recipe 2, let an agent finish the job (loop engineering)

```bash
hivemux new bugfix
hivemux loop bugfix \
  --goal "make the failing test in src/auth.test.ts pass" \
  --check "bun test src/auth.test.ts" \
  --max 8 --commit
```
The agent iterates **verify → fix** until `--check` exits 0 (or it hits `--max`
or a cost cap). On pass it commits. Use `--rubric "…"` instead of `--check` for an
LLM-judge verifier. `--runner gemini` (etc.) to use a different agent CLI.

Detached / survives disconnect (needs the daemon running, see Recipe 5):
```bash
hivemux daemon &                     # once
hivemux loop bugfix --goal "…" --check "…" --detach
hivemux loop-list                    # what's looping
hivemux loop-log bugfix              # per-iteration history (cost, pass/fail)
hivemux loop-stop bugfix             # cancel it
```

## Recipe 3, fan out a fleet on the same goal

```bash
hivemux loop refactor --fleet 3 \
  --goal "migrate the API from X to Y" \
  --check "bun test && bun run lint" --max 6
# 3 isolated agents, each its own worktree; merge whichever passes.
```

## Recipe 4, overnight, budget-bounded

```bash
hivemux daemon &
for m in auth billing search; do
  hivemux new $m --cost-cap 2          # $2 ceiling each
  hivemux loop $m --goal "…$m…" --check "bun test test/$m" --detach
done
hivemux web &                          # watch from a browser tomorrow
```
Loops survive your disconnect; each stops at its cost cap. Check `hivemux usage`
or the dashboard in the morning.

## Recipe 5, watch / control from the dashboard

```bash
hivemux web --port 7878               # browser dashboard (loopback)
# or:
hivemux gui                           # cmux-style desktop window
```
Live agent grid + embedded terminals, per-agent tokens/cost/context, conflict
panel, and **loop control** (start/stop a loop, watch iterations). Exposed beyond
loopback (`--host 0.0.0.0`) it auto-mints an auth token.

## Recipe 6, drive a fleet from a conductor agent (MCP)

```bash
claude mcp add hivemux -- hivemux mcp
```
Then tell your top-level agent:
> "Spin up agents for the 3 TODOs in issues.md, loop each until `bun test` passes,
>  $3 cap each, and tell me which merged."

Tools: `spawn_agent`, `start_loop`, `stop_loop`, `get_status`, `usage`,
`conflicts`, `merge`, `kill`, `broadcast`. Cost-capped + concurrency-limited.

---

## Configuration (`~/.hivemux/config.json`)

```json
{
  "agents":   { "claude-yolo": { "cmd": "claude --dangerously-skip-permissions" } },
  "runners":  { "gemini": { "bin": "gemini", "args": ["-p", "{prompt}"], "parse": "text" } },
  "pricing":  { "gpt-5": { "in": 1.25, "out": 10, "context": 400000 } },
  "integrations": { "slackWebhook": "https://hooks.slack.com/…" }
}
```

State: `~/.hivemux/state.json`. Worktrees: `~/.hivemux/worktrees/<repo>/<name>`.
Loop history: `~/.hivemux/loops/<name>.jsonl`.

---

## Troubleshooting

- **Agent fails immediately**: a stale `ANTHROPIC_API_KEY` can shadow a working
  login; the loop runner unsets it, but for interactive agents `unset ANTHROPIC_API_KEY`
  or use a `runners`/`agents` entry that does (`env -u ANTHROPIC_API_KEY …`).
- **Dead agents linger**: `hivemux prune` (add `--rm-worktree` to drop worktrees).
- **Embedded terminals blank in the GUI**: install `ttyd` and ensure it's on PATH.
- **Loop never finishes**: check `hivemux loop-log <name>`; tighten the `--check`
  or lower `--max`.
