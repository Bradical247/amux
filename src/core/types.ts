export type Status = "running" | "waiting" | "done" | "error" | "dead";

export interface Agent {
  name: string;
  repo: string; // abs path to main repo root
  worktree: string; // abs path to this agent's worktree
  branch: string;
  session: string; // tmux session name
  agent: string; // adapter key (claude, codex, ...)
  cmd: string; // launch command
  createdAt: string;
  status: Status; // self-reported via `amux notify`; overridden to "dead" if session gone
  note: string; // last notification text
}

/** Agent enriched with live tmux liveness. */
export interface AgentView extends Agent {
  alive: boolean;
}

export interface Conflict {
  repo: string;
  file: string;
  agents: string[]; // agent names whose worktrees both touch this file
}

export interface NewAgentOpts {
  name: string;
  agent: string; // adapter key
  repo: string; // dir to resolve repo root from
  branch?: string;
  base?: string;
}
