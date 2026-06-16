# hivemux

Linux-native, tmux-backed orchestrator for parallel AI coding agents in isolated
git worktrees. Run a swarm of agents (Claude Code, Codex, Gemini, Aider, …) at once,
each in its own worktree + tmux session, driven from a CLI, a live TUI, a tiled web
GUI, or a conductor agent over MCP.

```bash
npx hivemux --help
# or
npm install -g hivemux
```

This package downloads the prebuilt `hivemux` binary for your platform
(**linux-x64** or **macos-arm64**) from the matching
[GitHub release](https://github.com/Bradical247/hivemux/releases) on install.
For any other platform, build from source.

Full docs, GUI manual, and source: **https://github.com/Bradical247/hivemux**

Needs `tmux >= 3.2` and `git` on the host; the GUI also needs `ttyd` and a browser.

MIT
