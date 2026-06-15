// Web dashboard server. Standalone — runs its own Watcher over the core, so it
// works without the daemon. Pushes a full snapshot to browsers over SSE on every
// change/tick. This is the remote-reachable control plane cmux can't offer:
// run it on the box where the agents live, open it from anywhere.
import http from "node:http";
import * as mgr from "../core/manager";
import type { NewAgentOpts, Status } from "../core/types";
import { Watcher } from "../core/watcher";
import { PAGE } from "./page";

function json(res: http.ServerResponse, body: unknown, code = 200): void {
  const s = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json" });
  res.end(s);
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export async function startWeb(port: number, host: string): Promise<http.Server> {
  const clients = new Set<http.ServerResponse>();
  const watcher = new Watcher().start();

  const pushSnapshot = async () => {
    if (clients.size === 0) return;
    const agents = await mgr.list().catch(() => []);
    const data = `event: snapshot\ndata: ${JSON.stringify(agents)}\n\n`;
    for (const c of clients) c.write(data);
  };
  watcher.on("change", pushSnapshot);
  watcher.on("remove", pushSnapshot);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    try {
      if (req.method === "GET" && path === "/") {
        res.writeHead(200, { "content-type": "text/html" });
        return res.end(PAGE);
      }
      if (req.method === "GET" && path === "/api/agents") return json(res, await mgr.list());
      if (req.method === "GET" && path === "/api/conflicts")
        return json(res, await mgr.conflicts());
      if (req.method === "GET" && path === "/api/agent-keys")
        return json(res, await mgr.agentKeys());

      if (req.method === "GET" && path === "/api/events") {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        res.write(": connected\n\n");
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }

      if (req.method === "POST" && path === "/api/new") {
        const b = await readBody(req);
        const a = await mgr.create(b as unknown as NewAgentOpts);
        await pushSnapshot();
        return json(res, a);
      }
      if (req.method === "POST" && path === "/api/kill") {
        const b = await readBody(req);
        await mgr.kill(b.name as string, Boolean(b.rmWorktree));
        await pushSnapshot();
        return json(res, { ok: true });
      }
      if (req.method === "POST" && path === "/api/notify") {
        const b = await readBody(req);
        await mgr.notify(b.name as string, b.status as Status, (b.note as string) ?? "");
        await pushSnapshot();
        return json(res, { ok: true });
      }

      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    } catch (e) {
      json(res, { error: (e as Error).message }, 400);
    }
  });

  server.on("close", () => watcher.stop());
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  return server;
}
