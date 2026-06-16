// Governance for what agents may do, inspired by omnigent's policy engine but
// scoped to the actions hivemux automates. Read from ~/.hivemux/config.json:
//
//   { "policy": {
//       "sandbox": "auto",        // auto | on | off  (OS confinement, see sandbox.ts)
//       "network": true,          // allow network inside the sandbox
//       "maxCostUSD": 5,          // hard cost ceiling per loop (caps per-agent costCap)
//       "requireApproval": false  // hold commit/PR/merge for `hivemux approve <name>`
//   } }
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SandboxMode } from "./sandbox";

export interface Policy {
  sandbox: SandboxMode;
  network: boolean;
  maxCostUSD?: number;
  requireApproval: boolean;
}

const DEFAULT: Policy = { sandbox: "auto", network: true, requireApproval: false };

export function loadPolicy(): Policy {
  try {
    const cfg = JSON.parse(
      readFileSync(path.join(os.homedir(), ".hivemux", "config.json"), "utf8"),
    );
    const p = (cfg.policy ?? {}) as Partial<Policy>;
    return {
      sandbox: p.sandbox === "on" || p.sandbox === "off" ? p.sandbox : DEFAULT.sandbox,
      network: p.network !== false,
      maxCostUSD: typeof p.maxCostUSD === "number" ? p.maxCostUSD : undefined,
      requireApproval: Boolean(p.requireApproval),
    };
  } catch {
    return { ...DEFAULT };
  }
}
