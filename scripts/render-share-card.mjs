#!/usr/bin/env node
// Renders assets/share-card.png (1200x630, the Open Graph and Twitter preview
// image) from scripts/share-card.html. Needs Playwright with a Chromium build
// (set CHROMIUM_PATH to use an existing browser) and the Inter font installed,
// which is the app's own typeface; the script stops if Inter is missing so the
// committed image never silently falls back to another font.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "..", "assets", "share-card.png");

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, "share-card.html")).href);
await page.evaluate(() => document.fonts.ready);
const hasInter = await page.evaluate(() => document.fonts.check("800 20px Inter"));
if (!hasInter) {
  await browser.close();
  console.error("The Inter font is not installed, so the card would render in a fallback font. Install Inter and run this again.");
  process.exit(1);
}
await page.screenshot({ path: output });
await browser.close();
console.log("assets/share-card.png (1200x630) from scripts/share-card.html");
