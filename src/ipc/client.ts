// Daemon client. Used by remote/live frontends. The CLI does NOT require the
// daemon for normal commands (it calls the manager in-process), but tools that
// need a single live control plane — the future TUI/web dashboard, or remote
// control — connect through here.
import net from "node:net";
import { type Event, type Method, type Response, SOCKET_PATH } from "./protocol";

export class DaemonClient {
  private sock: net.Socket;
  private buf = "";
  private id = 0;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private onEvent?: (e: Event) => void;

  private constructor(sock: net.Socket) {
    this.sock = sock;
    sock.on("data", (chunk) => this.feed(chunk.toString()));
  }

  static connect(path = SOCKET_PATH): Promise<DaemonClient> {
    return new Promise((resolve, reject) => {
      const sock = net.connect(path);
      sock.once("connect", () => resolve(new DaemonClient(sock)));
      sock.once("error", reject);
    });
  }

  /** Connect if a daemon is up, else null — lets callers gracefully fall back. */
  static async tryConnect(path = SOCKET_PATH): Promise<DaemonClient | null> {
    try {
      return await DaemonClient.connect(path);
    } catch {
      return null;
    }
  }

  private feed(data: string): void {
    this.buf += data;
    let nl = this.buf.indexOf("\n");
    while (nl >= 0) {
      const line = this.buf.slice(0, nl);
      this.buf = this.buf.slice(nl + 1);
      nl = this.buf.indexOf("\n");
      if (!line.trim()) continue;
      const frame = JSON.parse(line) as Response | Event;
      if ("event" in frame) {
        this.onEvent?.(frame);
        continue;
      }
      const p = this.pending.get(frame.id);
      if (!p) continue;
      this.pending.delete(frame.id);
      if (frame.ok) p.resolve(frame.result);
      else p.reject(new Error(frame.error));
    }
  }

  call(method: Method, params?: Record<string, unknown>): Promise<unknown> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sock.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  subscribe(onEvent: (e: Event) => void): Promise<unknown> {
    this.onEvent = onEvent;
    return this.call("subscribe");
  }

  close(): void {
    this.sock.end();
  }
}
