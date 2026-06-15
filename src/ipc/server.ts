// Daemon: serves the manager API over a Unix socket and pushes status events.
// The on-disk store remains the single source of truth (concurrency-safe), so
// the daemon never diverges from CLI writes — it re-reads the store each poll
// and broadcasts deltas to subscribers. This gives live dashboards (TUI/web)
// and remote control without exclusive ownership of state.

import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import net from "node:net";
import * as mgr from "../core/manager";
import type { AgentView, NewAgentOpts, Status } from "../core/types";
import { Watcher } from "../core/watcher";
import { type Event, type Request, type Response, SOCKET_PATH } from "./protocol";

async function handle(req: Request): Promise<unknown> {
  const p = req.params ?? {};
  switch (req.method) {
    case "ping":
      return "pong";
    case "list":
      return mgr.list();
    case "get":
      return mgr.get(p.name as string);
    case "new":
      return mgr.create(p as unknown as NewAgentOpts);
    case "kill":
      return mgr.kill(p.name as string, Boolean(p.rmWorktree));
    case "notify":
      return mgr.notify(p.name as string, p.status as Status, (p.note as string) ?? "");
    case "conflicts":
      return mgr.conflicts();
    case "agents":
      return mgr.agentKeys();
    default:
      throw new Error(`unknown method '${req.method}'`);
  }
}

export async function startDaemon(): Promise<net.Server> {
  // Clear a stale socket from a previous crashed run.
  if (existsSync(SOCKET_PATH)) {
    await new Promise<void>((res, rej) => {
      const probe = net.connect(SOCKET_PATH).on("error", () => res());
      probe.on("connect", () => {
        probe.end();
        rej(new Error(`amux daemon already running at ${SOCKET_PATH}`));
      });
    });
    await unlink(SOCKET_PATH).catch(() => {});
  }

  const subscribers = new Set<net.Socket>();

  const send = (sock: net.Socket, frame: Response | Event) => {
    sock.write(`${JSON.stringify(frame)}\n`);
  };

  const server = net.createServer((sock) => {
    let buf = "";
    sock.on("data", async (chunk) => {
      buf += chunk.toString();
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
        if (!line.trim()) continue;
        let req: Request;
        try {
          req = JSON.parse(line);
        } catch {
          continue;
        }
        if (req.method === "subscribe") {
          subscribers.add(sock);
          send(sock, { id: req.id, ok: true, result: "subscribed" });
          continue;
        }
        try {
          const result = await handle(req);
          send(sock, { id: req.id, ok: true, result });
        } catch (e) {
          send(sock, { id: req.id, ok: false, error: (e as Error).message });
        }
      }
    });
    sock.on("close", () => subscribers.delete(sock));
    sock.on("error", () => subscribers.delete(sock));
  });

  await new Promise<void>((res) => server.listen(SOCKET_PATH, res));

  // Shared watcher broadcasts status deltas to all subscribers.
  const watcher = new Watcher().start();
  watcher.on("change", (a: AgentView) => {
    for (const sub of subscribers) send(sub, { event: "status", data: a });
  });
  server.on("close", () => watcher.stop());

  const shutdown = async () => {
    watcher.stop();
    server.close();
    await unlink(SOCKET_PATH).catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
