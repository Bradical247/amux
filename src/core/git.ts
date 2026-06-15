// Git worktree management: each agent gets its own working dir + branch,
// all sharing one .git so agents cannot collide on each other's files.
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export async function repoRoot(dir: string): Promise<string> {
  const { stdout } = await pexec("git", ["-C", dir, "rev-parse", "--show-toplevel"]);
  return stdout.trim();
}

export function repoName(root: string): string {
  return path.basename(root);
}

export function worktreesDir(root: string): string {
  return path.join(os.homedir(), ".amux", "worktrees", repoName(root));
}

/** Create ~/.amux/worktrees/<repo>/<name> on a fresh branch. Returns the path. */
export async function addWorktree(
  root: string,
  name: string,
  branch: string,
  base?: string,
): Promise<string> {
  const dir = path.join(worktreesDir(root), name);
  await mkdir(path.dirname(dir), { recursive: true });
  const args = ["-C", root, "worktree", "add", "-b", branch, dir];
  if (base) args.push(base);
  await pexec("git", args);
  return dir;
}

export async function removeWorktree(root: string, dir: string): Promise<void> {
  await pexec("git", ["-C", root, "worktree", "remove", "--force", dir]);
}

/** Files changed on an agent's branch vs its base — used for conflict detection. */
export async function changedFiles(worktree: string): Promise<string[]> {
  try {
    const { stdout } = await pexec("git", ["-C", worktree, "status", "--porcelain", "-uall"]);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((l) => l.slice(3));
  } catch {
    return [];
  }
}
