/* eslint-disable @typescript-eslint/no-require-imports */
// scripts/copy-static.js — cross-platform static asset copy for standalone build
const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const root = path.resolve(__dirname, "..");
copyDir(path.join(root, ".next", "static"), path.join(root, ".next", "standalone", ".next", "static"));
copyDir(path.join(root, "public"), path.join(root, ".next", "standalone", "public"));
console.log("✓ Static assets copied to standalone");
