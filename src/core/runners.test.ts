// Runner adapter resolution, arg templating, and output parsing are pure —
// unit tested here. (Actually invoking a CLI needs that CLI + credits, so the
// live path is exercised manually.)
import { describe, expect, test } from "bun:test";
import { parseTurn, resolveRunner, turnArgs } from "./runners";

describe("runners.resolveRunner", () => {
  test("built-in claude adapter", () => {
    const a = resolveRunner("claude");
    expect(a.bin).toBe("claude");
    expect(a.parse).toBe("claude-json");
    expect(a.args).toContain("--output-format");
  });
  test("unknown runner falls back to a generic text adapter", () => {
    const a = resolveRunner("some-other-cli");
    expect(a.bin).toBe("some-other-cli");
    expect(a.parse).toBe("text");
    expect(a.args).toEqual(["{prompt}"]);
  });
});

describe("runners.turnArgs", () => {
  test("substitutes {prompt}", () => {
    const a = resolveRunner("claude");
    const args = turnArgs(a, "do X");
    expect(args).toContain("do X");
    expect(args).not.toContain("{prompt}");
  });
  test("appends resume args when resuming", () => {
    const a = resolveRunner("claude");
    const args = turnArgs(a, "do X", "sess-123");
    expect(args).toContain("--resume");
    expect(args).toContain("sess-123");
  });
  test("no resume args without a session id", () => {
    const a = resolveRunner("claude");
    expect(turnArgs(a, "do X")).not.toContain("--resume");
  });
});

describe("runners.parseTurn", () => {
  test("claude-json extracts cost / session / model / tokens", () => {
    const a = resolveRunner("claude");
    const out = parseTurn(
      a,
      JSON.stringify({
        result: "done",
        total_cost_usd: 0.42,
        session_id: "s1",
        model: "claude-opus-4-8",
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    );
    expect(out.costUSD).toBeCloseTo(0.42, 5);
    expect(out.sessionId).toBe("s1");
    expect(out.model).toBe("claude-opus-4-8");
    expect(out.inTok).toBe(100);
    expect(out.outTok).toBe(20);
  });
  test("text adapter returns stdout, no cost", () => {
    const out = parseTurn({ bin: "x", args: ["{prompt}"], parse: "text" }, "the answer");
    expect(out.result).toBe("the answer");
    expect(out.costUSD).toBe(0);
  });
});
