// Single shared poll loop. The daemon, the TUI, and the web server all consume
// this instead of each running its own timer against tmux/git. Emits:
//   "tick"   (AgentView[])  every interval — full snapshot
//   "change" (AgentView)    when one agent's status/note/liveness changes
//   "remove" (name)         when an agent disappears
import { EventEmitter } from "node:events";
import * as mgr from "./manager";
import type { AgentView } from "./types";

export class Watcher extends EventEmitter {
  private timer?: NodeJS.Timeout;
  private last = new Map<string, string>();

  constructor(private intervalMs = 2000) {
    super();
  }

  start(): this {
    if (this.timer) return this;
    const tick = async () => {
      let agents: AgentView[];
      try {
        agents = await mgr.list();
      } catch {
        return;
      }
      const key = (a: AgentView) => `${a.status}|${a.note}|${a.alive}`;
      const next = new Map(agents.map((a) => [a.name, key(a)]));
      for (const a of agents) {
        if (this.last.get(a.name) !== key(a)) this.emit("change", a);
      }
      for (const name of this.last.keys()) {
        if (!next.has(name)) this.emit("remove", name);
      }
      this.last = next;
      this.emit("tick", agents);
    };
    void tick();
    this.timer = setInterval(tick, this.intervalMs);
    this.timer.unref?.();
    return this;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
