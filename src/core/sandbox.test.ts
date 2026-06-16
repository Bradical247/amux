import { describe, expect, test } from "bun:test";
import { sandboxKind, wrap } from "./sandbox";

describe("sandbox.wrap", () => {
  const base = { worktree: "/tmp/wt", extraBinds: ["/repo/.git"] };

  test("mode off is a passthrough", () => {
    const w = wrap("claude", ["-p", "hi"], { ...base, mode: "off" });
    expect(w.bin).toBe("claude");
    expect(w.args).toEqual(["-p", "hi"]);
  });

  test("when a sandbox is available, it wraps; otherwise passthrough", () => {
    const w = wrap("claude", ["-p", "hi"], { ...base, mode: "on", network: true });
    if (sandboxKind() === "none") {
      expect(w.bin).toBe("claude");
    } else {
      expect(["bwrap", "sandbox-exec"]).toContain(w.bin);
      // the real command is still in there, after the sandbox argv
      expect(w.args).toContain("claude");
      const joined = w.args.join(" ");
      expect(joined).toContain("/tmp/wt"); // worktree is bound
      expect(joined).toContain("/repo/.git"); // git metadata is bound
    }
  });

  test("network flag flips bwrap net sharing", () => {
    if (sandboxKind() !== "bwrap") return;
    expect(wrap("x", [], { ...base, mode: "on", network: true }).args).toContain("--share-net");
    expect(wrap("x", [], { ...base, mode: "on", network: false }).args).toContain("--unshare-net");
  });
});
