#!/usr/bin/env node
// Launcher: exec the native hivemux binary that postinstall fetched into this dir.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const bin = path.join(__dirname, "hivemux-bin");
if (!fs.existsSync(bin)) {
  console.error(
    "hivemux: native binary not found. The postinstall download may have failed,\n" +
      "or this platform has no prebuilt binary (only linux-x64 and macos-arm64 ship).\n" +
      "Build from source instead: https://github.com/Bradical247/hivemux",
  );
  process.exit(1);
}
const r = spawnSync(bin, process.argv.slice(2), { stdio: "inherit" });
if (r.error) {
  console.error(`hivemux: ${r.error.message}`);
  process.exit(1);
}
process.exit(r.status ?? 1);
