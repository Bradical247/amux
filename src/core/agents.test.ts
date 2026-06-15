// Adapter resolution is the one piece of pure logic worth pinning down: built-ins
// resolve to their command, and an unknown key falls back to itself (treated as a
// bare command name). Run with `bun test`.
import { describe, expect, test } from "bun:test";
import { agentKeys, resolveAgent } from "./agents";

describe("agents", () => {
  test("built-in adapters resolve to their command", async () => {
    expect((await resolveAgent("claude")).cmd).toBe("claude");
    expect((await resolveAgent("shell")).cmd).toBe("");
  });

  test("unknown key falls back to itself", async () => {
    expect((await resolveAgent("my-custom-cli")).cmd).toBe("my-custom-cli");
  });

  test("agentKeys lists the built-ins", async () => {
    const keys = await agentKeys();
    expect(keys).toContain("claude");
    expect(keys).toContain("aider");
  });
});
