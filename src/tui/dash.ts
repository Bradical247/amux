// Live full-screen TUI. Zero render deps (works over SSH); driven by the shared
// Watcher and raw-mode key input. Keys:
//   j/k or ↓/↑  move selection      Enter/a  attach (suspends TUI)
//   x  kill selected (keeps worktree)   X  kill + remove worktree
//   r  refresh now                      q/Ctrl-C  quit
import * as mgr from "../core/manager";
import { attach } from "../core/tmux";
import type { AgentView, Conflict } from "../core/types";
import { Watcher } from "../core/watcher";

const ESC = "\x1b[";
const out = (s: string) => process.stdout.write(s);
const clear = () => out(`${ESC}2J${ESC}H`);
const hideCursor = () => out(`${ESC}?25l`);
const showCursor = () => out(`${ESC}?25h`);

const STATUS_COLOR: Record<string, string> = {
  running: "32", // green
  waiting: "33", // yellow
  done: "36", // cyan
  error: "31", // red
  dead: "90", // grey
};

export async function runDash(): Promise<void> {
  let agents: AgentView[] = [];
  let conflicts: Conflict[] = [];
  let sel = 0;
  let suspended = false;

  const watcher = new Watcher(1500);
  watcher.on("tick", async (a: AgentView[]) => {
    agents = a;
    if (sel >= agents.length) sel = Math.max(0, agents.length - 1);
    conflicts = await mgr.conflicts().catch(() => []);
    if (!suspended) render();
  });

  function render(): void {
    clear();
    const W = process.stdout.columns ?? 80;
    const cflag = conflicts.length ? `  ${ESC}31m${conflicts.length}⚠${ESC}0m` : "";
    out(`${ESC}1m amux${ESC}0m  ${agents.length} agents${cflag}\n`);
    out(`${"─".repeat(W)}\n`);

    if (agents.length === 0) {
      out("\n  no agents. start one:  amux new <name>\n");
    } else {
      const conflictedAgents = new Set(conflicts.flatMap((c) => c.agents));
      const head = ["", "NAME", "STATUS", "AGENT", "BRANCH", "NOTE"];
      const widths = [2, 16, 9, 8, 22, 24];
      out(`${ESC}1m${cells(head, widths)}${ESC}0m\n`);
      agents.forEach((a, i) => {
        const cursor = i === sel ? "▸" : " ";
        const color = STATUS_COLOR[a.status] ?? "0";
        const flag = conflictedAgents.has(a.name) ? "⚠" : " ";
        const row = cells([cursor + flag, a.name, a.status, a.agent, a.branch, a.note], widths);
        out(i === sel ? `${ESC}7m${row}${ESC}0m\n` : `${colorize(row, color, a.status)}\n`);
      });
    }

    if (conflicts.length) {
      out(`\n${ESC}31m${ESC}1m ⚠ conflicts${ESC}0m\n`);
      for (const c of conflicts.slice(0, 6)) {
        out(`   ${c.file}  ${ESC}90m← ${c.agents.join(", ")}${ESC}0m\n`);
      }
      if (conflicts.length > 6) out(`   …and ${conflicts.length - 6} more\n`);
    }

    out(`\n${"─".repeat(W)}\n`);
    out(`${ESC}90m j/k move · Enter attach · x kill · X kill+rm · r refresh · q quit${ESC}0m`);
  }

  // colorize only the STATUS column-ish; simplest: tint whole row faint by status
  function colorize(row: string, color: string, _status: string): string {
    return `${ESC}${color}m${row}${ESC}0m`;
  }

  function cells(vals: string[], widths: number[]): string {
    return vals
      .map((v, i) => {
        const w = widths[i] ?? 0;
        return trunc(v ?? "", w).padEnd(w);
      })
      .join(" ");
  }
  function trunc(s: string, n: number): string {
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
  }

  async function doAttach(): Promise<void> {
    const a = agents[sel];
    if (!a?.alive) return;
    suspended = true;
    teardownInput();
    showCursor();
    clear();
    attach(a.session); // blocks until user detaches (Ctrl-b d)
    suspended = false;
    setupInput();
    hideCursor();
    render();
  }

  async function doKill(rmWorktree: boolean): Promise<void> {
    const a = agents[sel];
    if (!a) return;
    await mgr.kill(a.name, rmWorktree).catch(() => {});
    agents = await mgr.list().catch(() => agents);
    if (sel >= agents.length) sel = Math.max(0, agents.length - 1);
    render();
  }

  function onKey(buf: Buffer): void {
    const k = buf.toString();
    if (k === "q" || k === "\x03") {
      quit(); // q / Ctrl-C
      return;
    }
    if (k === "\r" || k === "a") {
      void doAttach();
      return;
    }
    if (k === "x") {
      void doKill(false);
      return;
    }
    if (k === "X") {
      void doKill(true);
      return;
    }
    if (k === "j" || k === `${ESC}B`) sel = Math.min(agents.length - 1, sel + 1);
    else if (k === "k" || k === `${ESC}A`) sel = Math.max(0, sel - 1);
    // "r" and any other key fall through to a redraw (the watcher also refreshes).
    if (!suspended) render();
  }

  function setupInput(): void {
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onKey);
  }
  function teardownInput(): void {
    process.stdin.off("data", onKey);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }

  function quit(): never {
    watcher.stop();
    teardownInput();
    showCursor();
    clear();
    process.exit(0);
  }

  process.on("SIGINT", quit);
  hideCursor();
  setupInput();
  watcher.start();
  render();
}
