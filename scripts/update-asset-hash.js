#!/usr/bin/env node
"use strict";

// Rewrites ASSET_HASH in service-worker.js. Run it after changing any file
// the service worker precaches, so installed copies pick up the update.

const fs = require("node:fs");
const {
  SERVICE_WORKER_PATH,
  computeAssetHash,
  readAssetHash,
  readServiceWorker
} = require("./pwa-assets.js");

const source = readServiceWorker();
const previous = readAssetHash(source);
let next;

try {
  next = computeAssetHash();
} catch (error) {
  console.error(`Could not hash the precached files: ${error.message}`);
  process.exit(1);
}

if (previous === null) {
  console.error('service-worker.js has no `const ASSET_HASH = "";` line to update.');
  process.exit(1);
}

if (previous === next) {
  console.log(`ASSET_HASH is already current (${next}).`);
} else {
  fs.writeFileSync(SERVICE_WORKER_PATH, source.replace(/const ASSET_HASH = "[0-9a-f]*";/, `const ASSET_HASH = "${next}";`));
  console.log(`ASSET_HASH updated: ${previous} -> ${next}`);
}
