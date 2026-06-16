// Concurrency-safe metadata store. The original MVP did read-modify-write on a
// JSON file with no locking, so two concurrent `notify` calls (e.g. agent hooks
// firing at once) could lose writes. This version:
//   - serializes mutations with a cross-process lock (atomic mkdir)
//   - writes atomically (temp file + rename) so readers never see a torn file
// Reads are lock-free: atomic rename guarantees they see one consistent version.
import { mkdir, readFile, rename, rmdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Agent } from "./types";

const DIR = path.join(os.homedir(), ".hivemux");
const FILE = path.join(DIR, "state.json");
const LOCK = `${FILE}.lock`;

interface State {
  version: number;
  agents: Record<string, Agent>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  // mkdir is atomic across processes -> a reliable lock primitive with no deps.
  for (;;) {
    try {
      await mkdir(DIR, { recursive: true });
      await mkdir(LOCK);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      if (Date.now() - start > 5000) {
        // Break a stale lock left by a crashed process.
        try {
          const st = await stat(LOCK);
          if (Date.now() - st.mtimeMs > 10_000) {
            await rmdir(LOCK);
            continue;
          }
        } catch {
          /* lock vanished; retry */
        }
        throw new Error("hivemux: state lock timeout");
      }
      await sleep(20);
    }
  }
  try {
    return await fn();
  } finally {
    await rmdir(LOCK).catch(() => {});
  }
}

async function read(): Promise<State> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as State;
  } catch {
    return { version: 1, agents: {} };
  }
}

async function write(s: State): Promise<void> {
  await mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.tmp.${process.pid}`;
  await writeFile(tmp, JSON.stringify(s, null, 2));
  await rename(tmp, FILE); // atomic on POSIX
}

export async function getAll(): Promise<Agent[]> {
  return Object.values((await read()).agents);
}

export async function get(name: string): Promise<Agent | undefined> {
  return (await read()).agents[name];
}

export async function put(a: Agent): Promise<void> {
  await withLock(async () => {
    const s = await read();
    s.agents[a.name] = a;
    await write(s);
  });
}

export async function update(name: string, patch: Partial<Agent>): Promise<void> {
  await withLock(async () => {
    const s = await read();
    if (!s.agents[name]) return;
    s.agents[name] = { ...s.agents[name], ...patch };
    await write(s);
  });
}

export async function remove(name: string): Promise<void> {
  await withLock(async () => {
    const s = await read();
    delete s.agents[name];
    await write(s);
  });
}
