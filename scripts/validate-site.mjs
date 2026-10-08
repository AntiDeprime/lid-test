#!/usr/bin/env node
// Checks the launch configuration in site-config.js and the files generated
// from it.
//
//   node scripts/validate-site.mjs               consistency check; lists what is still to fill in
//   node scripts/validate-site.mjs --production  also fails while anything is still to fill in
//
// The default run is what CI uses: the repository is allowed to be
// unconfigured, but never inconsistent. Run it with --production before
// deploying to the public address.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SHARE_IMAGE_PATH,
  SHARE_IMAGE_SIZE,
  readHeadBlock,
  renderHeadBlock,
  renderRobots,
  renderSitemap,
  validateOrigin
} from "./site-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = process.argv.includes("--production");
const { SITE } = await import(pathToFileURL(path.join(root, "site-config.js")).href);
const { buildLegalNotice } = await import(pathToFileURL(path.join(root, "modules", "legal.js")).href);

const errors = [];
const toDo = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

// Shape of the config.
const operator = SITE.operator || {};
if (typeof SITE.origin !== "string") errors.push("site-config.js origin must be a string (empty until launch).");
["name", "address", "email"].forEach((field) => {
  if (typeof operator[field] !== "string") errors.push(`site-config.js operator.${field} must be a string (empty until launch).`);
});
if (SITE.analyticsRetentionMonths !== null && !(Number.isInteger(SITE.analyticsRetentionMonths) && SITE.analyticsRetentionMonths > 0)) {
  errors.push("site-config.js analyticsRetentionMonths must be null or a positive whole number of months.");
}
const originProblem = typeof SITE.origin === "string" ? validateOrigin(SITE.origin) : null;
if (originProblem) errors.push(`site-config.js origin: ${originProblem}`);
if (operator.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operator.email)) errors.push("site-config.js operator.email is not an email address.");

// The share image.
if (!exists(SHARE_IMAGE_PATH)) {
  errors.push(`${SHARE_IMAGE_PATH} is missing; render it with scripts/render-share-card.mjs.`);
} else {
  const png = fs.readFileSync(path.join(root, SHARE_IMAGE_PATH));
  const isPng = png.length > 24 && png.subarray(1, 4).toString("latin1") === "PNG";
  const size = isPng ? { width: png.readUInt32BE(16), height: png.readUInt32BE(20) } : null;
  if (!size || size.width !== SHARE_IMAGE_SIZE.width || size.height !== SHARE_IMAGE_SIZE.height) {
    errors.push(`${SHARE_IMAGE_PATH} must be a ${SHARE_IMAGE_SIZE.width}x${SHARE_IMAGE_SIZE.height} PNG.`);
  }
}

// index.html, robots.txt, and sitemap.xml must match what the origin generates.
const origin = originProblem ? "" : SITE.origin || "";
const html = read("index.html");
if (originProblem) {
  // Already reported above; the generated files cannot be checked without a valid origin.
} else if (readHeadBlock(html) === null) {
  errors.push("index.html has no <!-- site:start --> ... <!-- site:end --> block.");
} else if (readHeadBlock(html) !== renderHeadBlock(origin)) {
  errors.push(origin
    ? "index.html does not match site-config.js origin; run `node scripts/generate-site.mjs`."
    : "index.html has a canonical or absolute social-image block but site-config.js has no origin; run `node scripts/generate-site.mjs` after setting it, or restore the unconfigured block.");
}
if (origin && !originProblem) {
  if (!exists("robots.txt") || read("robots.txt") !== renderRobots(origin)) errors.push("robots.txt does not match site-config.js origin; run `node scripts/generate-site.mjs`.");
  if (!exists("sitemap.xml") || read("sitemap.xml") !== renderSitemap(origin)) errors.push("sitemap.xml does not match site-config.js origin; run `node scripts/generate-site.mjs`.");
}

// The dialogs must render real text from this config.
const notice = JSON.stringify(buildLegalNotice(SITE));
if (/undefined|null|NaN/.test(notice)) errors.push("The privacy or imprint text contains an unfilled value.");

// What is still to be supplied before the public launch.
if (!SITE.origin) toDo.push("origin: the public address of the app (site-config.js), then `node scripts/generate-site.mjs`");
if (!operator.name) toDo.push("operator.name: who is responsible for the site (shown in the Imprint and Privacy dialogs)");
if (!operator.address) toDo.push("operator.address: a postal address for the operator");
if (!operator.email) toDo.push("operator.email: a contact address for the operator");

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

if (toDo.length) {
  const heading = `Launch configuration is incomplete (${toDo.length} item${toDo.length === 1 ? "" : "s"} to fill in):`;
  if (production) {
    console.error(`${heading}`);
    toDo.forEach((item) => console.error(`- ${item}`));
    process.exit(1);
  }
  console.log(`Site validation passed. ${heading}`);
  toDo.forEach((item) => console.log(`- ${item}`));
} else {
  console.log(`Site validation passed${production ? " for production" : ""}: ${SITE.origin}`);
}
if (SITE.analyticsRetentionMonths === null) {
  console.log("Optional: set analyticsRetentionMonths to the retention period of the Google Analytics property so the Privacy dialog can state it.");
}
