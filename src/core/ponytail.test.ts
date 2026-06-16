import { describe, expect, test } from "bun:test";
import { applyPonytail, PONYTAIL } from "./ponytail";

describe("ponytail", () => {
  test("off (or undefined) passes the goal through unchanged", () => {
    expect(applyPonytail("do the thing")).toBe("do the thing");
    expect(applyPonytail("do the thing", false)).toBe("do the thing");
  });

  test("on prepends the directive and keeps the goal", () => {
    const out = applyPonytail("do the thing", true);
    expect(out.startsWith(PONYTAIL)).toBe(true);
    expect(out.endsWith("do the thing")).toBe(true);
    expect(out).toContain("lazy senior developer");
  });
});
