// Embedded-terminal bridge for the GUI. Like cmux mounts a live terminal per
// workspace, hivemux runs one `ttyd` per agent that serves `tmux attach` over HTTP;
// the GUI embeds it in an <iframe>. ttyd is spawned on demand, bound to loopback,
// and torn down when the agent is killed or the server stops.
import { type ChildProcess, spawn } from "node:child_process";
import * as store from "./store";
import { sessionExists } from "./tmux";

interface Term {
  proc: ChildProcess;
  port: number;
}

const terms = new Map<string, Term>();
let nextPort = 7900;

/** Ensure a ttyd terminal is serving the agent's tmux session; return its port. */
export async function ensureTerminal(name: string): Promise<number> {
  const existing = terms.get(name);
  if (existing && existing.proc.exitCode === null) return existing.port;

  const a = await store.get(name);
  if (!a) throw new Error(`unknown agent '${name}'`);
  if (!(await sessionExists(a.session))) throw new Error(`session for '${name}' is not running`);

  const port = nextPort++;
  let proc: ChildProcess;
  try {
    // -i 127.0.0.1: loopback only. -W: writable (interactive). -t: xterm options.
    proc = spawn(
      "ttyd",
      ["-p", String(port), "-i", "127.0.0.1", "-W", "tmux", "attach", "-t", a.session],
      { stdio: "ignore" },
    );
  } catch {
    throw new Error(
      "ttyd not found — install it for embedded terminals (https://github.com/tsl0922/ttyd)",
    );
  }
  proc.on("error", () => terms.delete(name));
  terms.set(name, { proc, port });
  return port;
}

export function stopTerminal(name: string): void {
  const t = terms.get(name);
  if (t) {
    t.proc.kill();
    terms.delete(name);
  }
}

export function stopAllTerminals(): void {
  for (const t of terms.values()) t.proc.kill();
  terms.clear();
}
