// Download the right prebuilt hivemux binary from the matching GitHub release.
// Exits 0 even on failure so `npm install` never hard-fails; the launcher prints a
// clear message if the binary is missing at run time.
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const VERSION = require("../package.json").version;
const ASSET = {
  "linux-x64": "hivemux-linux-x64",
  "darwin-arm64": "hivemux-macos-arm64",
};
const key = `${process.platform}-${process.arch}`;
const asset = ASSET[key];
const dest = path.join(__dirname, "..", "bin", "hivemux-bin");

if (!asset) {
  console.error(
    `hivemux: no prebuilt binary for ${key} (only linux-x64 and macos-arm64 ship).\n` +
      "Build from source: https://github.com/Bradical247/hivemux",
  );
  process.exit(0);
}

const url = `https://github.com/Bradical247/hivemux/releases/download/v${VERSION}/${asset}`;

function download(u, redirects = 0) {
  if (redirects > 6) {
    console.error("hivemux: too many redirects");
    process.exit(0);
  }
  https
    .get(u, { headers: { "user-agent": "hivemux-postinstall" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(res.headers.location, redirects + 1);
      }
      if (res.statusCode !== 200) {
        console.error(`hivemux: download failed (HTTP ${res.statusCode}) from ${u}`);
        res.resume();
        return process.exit(0);
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () =>
        out.close(() => {
          fs.chmodSync(dest, 0o755);
          console.log(`hivemux ${VERSION} installed (${key})`);
        }),
      );
      out.on("error", (e) => {
        console.error(`hivemux: ${e.message}`);
        process.exit(0);
      });
    })
    .on("error", (e) => {
      console.error(`hivemux: ${e.message}`);
      process.exit(0);
    });
}

download(url);
