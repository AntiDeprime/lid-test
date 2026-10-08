#!/usr/bin/env node
// Writes the files that depend on the production address, from site-config.js:
// the canonical link and social image URLs in index.html, robots.txt, and
// sitemap.xml. Run it again whenever `origin` changes, then commit the result.
//
//   node scripts/generate-site.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  applyHeadBlock,
  renderHeadBlock,
  renderRobots,
  renderSitemap,
  robotsIsReachable,
  validateOrigin
} from "./site-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { SITE } = await import(pathToFileURL(path.join(root, "site-config.js")).href);

if (!SITE.origin) {
  console.error("site-config.js has no `origin` yet. Set it to the public address of the app (for example https://learn.example.org/), then run this again.");
  process.exit(1);
}
const problem = validateOrigin(SITE.origin);
if (problem) {
  console.error(`site-config.js origin: ${problem}`);
  process.exit(1);
}

const indexPath = path.join(root, "index.html");
fs.writeFileSync(indexPath, applyHeadBlock(fs.readFileSync(indexPath, "utf8"), renderHeadBlock(SITE.origin)));
fs.writeFileSync(path.join(root, "robots.txt"), renderRobots(SITE.origin));
fs.writeFileSync(path.join(root, "sitemap.xml"), renderSitemap(SITE.origin));
console.log(`Updated index.html, robots.txt, and sitemap.xml for ${SITE.origin}`);

if (!robotsIsReachable(SITE.origin)) {
  console.warn(`Note: crawlers only read robots.txt at the root of a host, so ${SITE.origin}robots.txt will be ignored. Serve the Sitemap line from the host's own robots.txt or submit sitemap.xml in Search Console.`);
}
