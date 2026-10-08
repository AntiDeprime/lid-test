#!/usr/bin/env node
// Renders the PNG app icons in assets/ from the SVG sources in assets/.
// Needs Playwright with a Chromium build; set CHROMIUM_PATH to use an existing browser.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const icons = [
  { source: "favicon.svg", file: "favicon-32.png", size: 32 },
  { source: "favicon.svg", file: "icon-192.png", size: 192 },
  { source: "favicon.svg", file: "icon-512.png", size: 512 },
  { source: "icon-maskable.svg", file: "icon-maskable-512.png", size: 512 },
  { source: "icon-maskable.svg", file: "apple-touch-icon.png", size: 180 }
];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

for (const { source, file, size } of icons) {
  const svg = readFileSync(join(assets, source));
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block}</style>` +
    `<img src="data:image/svg+xml;base64,${svg.toString("base64")}" width="${size}" height="${size}" alt="">`
  );
  await page.screenshot({ path: join(assets, file), omitBackground: true });
  await page.close();
  console.log(`assets/${file} (${size}x${size}) from ${source}`);
}

await browser.close();
