"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SERVICE_WORKER_PATH = path.join(ROOT, "service-worker.js");
const TEXT_EXTENSIONS = new Set([".js", ".css", ".html", ".svg", ".webmanifest", ".json"]);

// "./styles.css?v=catalogue" -> { key: "styles.css?v=catalogue", file: "styles.css" }
function normalizeAsset(reference) {
  const key = reference.replace(/^\.\//, "");
  const file = key.split(/[?#]/)[0] || "index.html";
  return { key, file: file.endsWith("/") ? `${file}index.html` : file };
}

function readServiceWorker() {
  return fs.readFileSync(SERVICE_WORKER_PATH, "utf8");
}

function readServiceWorkerAssets(source = readServiceWorker()) {
  const block = source.match(/const ASSETS = \[([\s\S]*?)\];/);
  if (!block) throw new Error("service-worker.js has no ASSETS array");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function readAssetHash(source = readServiceWorker()) {
  const match = source.match(/const ASSET_HASH = "([0-9a-f]*)";/);
  return match ? match[1] : null;
}

function readAssetBytes(file) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  if (!TEXT_EXTENSIONS.has(path.extname(file))) return bytes;
  // Line endings must not change the hash between operating systems.
  return Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"));
}

// One short hash over every precached file, so the cache name changes
// whenever any of them does.
function computeAssetHash(assets = readServiceWorkerAssets()) {
  const hash = crypto.createHash("sha256");
  const files = [...new Set(assets.map((asset) => normalizeAsset(asset).key))].sort();

  files.forEach((key) => {
    const { file } = normalizeAsset(key);
    hash.update(`${key}\n`);
    hash.update(readAssetBytes(file));
    hash.update("\n");
  });

  return hash.digest("hex").slice(0, 12);
}

module.exports = {
  ROOT,
  SERVICE_WORKER_PATH,
  computeAssetHash,
  normalizeAsset,
  readAssetHash,
  readServiceWorker,
  readServiceWorkerAssets
};
