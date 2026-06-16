// Line-delimited JSON over a Unix domain socket. This is the scalable control
// plane: a long-lived daemon owns a tmux poller and broadcasts status events, so
// many clients (CLI, TUI, web bridge, remote) get live updates without each one
// polling tmux independently.

import os from "node:os";
import path from "node:path";

export const SOCKET_PATH =
  process.env.HIVEMUX_SOCKET ?? path.join(os.homedir(), ".hivemux", "daemon.sock");

export type Method =
  | "list"
  | "get"
  | "new"
  | "kill"
  | "notify"
  | "conflicts"
  | "agents"
  | "loop_start"
  | "loop_stop"
  | "loop_list"
  | "ping"
  | "subscribe";

export interface Request {
  id: number;
  method: Method;
  params?: Record<string, unknown>;
}

export interface Response {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface Event {
  event: "status"; // pushed to subscribers when an agent's state changes
  data: unknown;
}

export type Frame = Response | Event;
