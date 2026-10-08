#!/usr/bin/env node
// Portable browser checks for the static app: smoke, deeper flows, offline
// reload, 390px layout, a fit scan over every question, and an accessibility
// scan. Runs on Linux, macOS, and CI without the Codex Playwright wrapper.
//
//   cd scripts/browser && npm ci && npx playwright install chromium && node run-checks.mjs
//
// Useful environment variables:
//   CHROMIUM_PATH   reuse an installed Chromium instead of Playwright's download
//   PORT            serve on a fixed port (default: a free port)
//   ONLY            comma-separated sections to run (smoke,flow,offline,layout,fit,a11y)
//   KEEP_ARTIFACTS  set to 1 to keep screenshots of passing runs too
//   TEST_FONT       force a font family, e.g. "DejaVu Sans" to reproduce the
//                   wider fallback font GitHub Actions renders without Inter

import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const checksDir = path.join(here, "checks");
const artifactsDir = path.join(here, "artifacts");
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 720 };
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp"
};

function startServer(port = 0) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.normalize(path.join(root, pathname.endsWith("/") ? `${pathname}index.html` : pathname));
    if (!file.startsWith(root + path.sep) || file.includes(`${path.sep}.git${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(file).pipe(response);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/` });
    });
  });
}

const readCheck = (name) => fs.readFileSync(path.join(checksDir, name), "utf8");

// The check files hold a function expression or an IIFE; call functions so
// page.evaluate returns their result and surfaces their thrown errors.
function runInPage(page, code) {
  const source = code.trim();
  return page.evaluate(/^(async\s*)?\(\)\s*=>/.test(source) ? `(${source})()` : source);
}

async function openPage(browser, { viewport, serviceWorkers = "block" }) {
  const context = await browser.newContext({ viewport, serviceWorkers });
  const page = await context.newPage();
  const problems = [];

  if (process.env.TEST_FONT) {
    const css = `html, body, button, input, select, textarea { font-family: ${JSON.stringify(process.env.TEST_FONT)} !important; }`;
    await context.addInitScript((styles) => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = styles;
        document.head.append(style);
      });
    }, css);
  }

  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console error: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()} for ${response.url()}`);
  });

  return { context, page, problems };
}

function expectNoProblems(problems, label) {
  if (problems.length) throw new Error(`${label} logged problems:\n  ${problems.join("\n  ")}`);
}

async function shot(page, name) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactsDir, `${name}.png`) });
}

async function clickAndSettle(page, selector) {
  await page.click(selector);
  await page.waitForTimeout(50);
}

const sections = {
  async smoke({ browser, url }) {
    const { context, page, problems } = await openPage(browser, { viewport: MOBILE });
    try {
      await page.goto(url);
      await runInPage(page, readCheck("smoke-start.js"));
      await runInPage(page, readCheck("smoke-quiz.js"));
      expectNoProblems(problems, "Smoke check");
    } finally {
      await context.close();
    }
  },

  async flow({ browser, url }) {
    const { context, page, problems } = await openPage(browser, { viewport: DESKTOP });
    try {
      await page.goto(url);
      await page.evaluate("localStorage.clear()");
      await page.goto(url);
      await runInPage(page, readCheck("flow-main.js"));
      await runInPage(page, readCheck("flow-resume-setup.js"));
      await page.goto(url);
      await runInPage(page, readCheck("flow-resume-check.js"));
      await page.goto(url);
      await runInPage(page, readCheck("flow-resume-expired.js"));
      expectNoProblems(problems, "Flow check");
    } finally {
      await context.close();
    }
  },

  // Loads the app once, then stops the server so the reload can only be
  // answered by the service worker's cache.
  async offline({ browser }) {
    const { server, url } = await startServer();
    const { context, page, problems } = await openPage(browser, { viewport: MOBILE, serviceWorkers: "allow" });
    try {
      await page.goto(url);
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15000 });

      const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
      const hash = serviceWorker.match(/const ASSET_HASH = "([0-9a-f]+)";/)?.[1];
      const precached = [...serviceWorker.match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)].length;
      const cache = await page.evaluate(async () => {
        const names = await caches.keys();
        const entries = {};
        for (const name of names) entries[name] = (await (await caches.open(name)).keys()).length;
        return entries;
      });
      if (cache[`lid-test-prep-${hash}`] < precached) {
        throw new Error(`Expected cache lid-test-prep-${hash} with ${precached} files, found ${JSON.stringify(cache)}`);
      }
      if (Object.keys(cache).length !== 1) throw new Error(`Old caches were not cleaned up: ${JSON.stringify(Object.keys(cache))}`);

      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await page.reload();
      await page.waitForSelector("#start-button", { timeout: 10000 });
      const questions = await page.evaluate("window.LID_QUESTIONS && window.LID_QUESTIONS.length");
      if (questions !== 460) throw new Error(`Offline reload did not load the question catalogue (${questions})`);

      await page.click(".consent-banner .secondary-action");
      await page.click("#practice-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      await page.locator(".answer-option").first().click();
      const explanation = await page.textContent("#question-explanation");
      if (!explanation || !explanation.trim()) throw new Error("Offline study run did not show an explanation");
      expectNoProblems(problems.filter((problem) => !/Failed to load resource|net::ERR/.test(problem)), "Offline check");
    } finally {
      await context.close();
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    }
  },

  async layout({ browser, url }) {
    const { context, page, problems } = await openPage(browser, { viewport: MOBILE });
    const failures = [];
    const expect = (ok, message) => { if (!ok) failures.push(message); };
    try {
      await page.goto(url);
      await shot(page, "start-390");
      const start = await page.evaluate(() => {
        const launch = [...document.querySelectorAll(".launch-card")].map((card) => card.getBoundingClientRect());
        const banner = document.querySelector(".consent-banner");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          launchBottom: Math.max(...launch.map((rect) => rect.bottom)),
          bannerPosition: banner ? getComputedStyle(banner).position : null,
          viewport: innerHeight
        };
      });
      expect(!start.overflow, "Start screen overflows horizontally at 390px");
      expect(start.launchBottom <= start.viewport, `Launch cards end at ${Math.round(start.launchBottom)}px, below the ${start.viewport}px first screen`);
      expect(start.bannerPosition !== "fixed", "Consent banner is fixed and can cover the launch cards");

      await page.click(".consent-banner .secondary-action");
      await page.click("#practice-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      await shot(page, "quiz-390");
      const toolbar = await page.evaluate(() => document.querySelector("#quiz-toolbar").getBoundingClientRect().height);
      expect(toolbar <= 100, `Quiz toolbar is ${Math.round(toolbar)}px tall at 390px; expected at most 100px`);

      await page.evaluate(() => {
        const prompt = document.querySelector("#question-title").textContent;
        const question = window.LID_QUESTIONS.find((item) => item.prompt === prompt);
        const wrong = question.options.findIndex((option) => !option.correct);
        document.querySelectorAll(".answer-option")[wrong].click();
      });
      await page.waitForTimeout(100);
      await shot(page, "quiz-answered-390");
      const answered = await page.evaluate(() => {
        const next = document.querySelector("#next-button").getBoundingClientRect();
        const verdict = document.querySelector("#feedback-verdict");
        const answers = document.querySelector("#answers").getBoundingClientRect();
        return {
          nextBottom: next.bottom,
          viewport: innerHeight,
          verdict: verdict.textContent.trim(),
          verdictBelowAnswers: verdict.getBoundingClientRect().top >= answers.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth
        };
      });
      expect(answered.nextBottom <= answered.viewport, "Next is not reachable without scrolling after answering");
      expect(/Not quite/.test(answered.verdict), `Verdict text was "${answered.verdict}"`);
      expect(answered.verdictBelowAnswers, "Verdict is not directly under the answers");
      expect(!answered.overflow, "Answered quiz overflows horizontally at 390px");

      await page.click("#home-button");
      await page.waitForSelector(".confirm-modal");
      await shot(page, "leave-dialog-390");
      await page.keyboard.press("Escape");
      await page.click("#home-button");
      await page.click(".confirm-leave");
      await page.waitForSelector("#start-screen:not(.is-hidden)");
      await page.evaluate(() => document.querySelector("#progress-tab").click());
      await page.locator(".backup-card").scrollIntoViewIfNeeded();
      await shot(page, "progress-390");
      expect(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), "Progress tab overflows horizontally at 390px");

      expectNoProblems(problems, "Layout check");
      if (failures.length) throw new Error(failures.join("\n  "));
    } finally {
      await context.close();
    }
  },

  // Every question, with translations on and an answer picked, must fit the
  // viewport width: long German compounds are what push a layout sideways.
  async fit({ browser, url }) {
    const failures = [];
    for (const width of [360, MOBILE.width]) {
      const { context, page, problems } = await openPage(browser, { viewport: { width, height: MOBILE.height } });
      try {
        await page.goto(url);
        await page.click(".consent-banner .secondary-action");
        const overflowing = await runInPage(page, `async () => {
          const out = [];
          const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
          for (const question of window.LID_QUESTIONS) {
            document.querySelector('[data-start-tab="catalogue"]').click();
            document.querySelector("#jump-question").value = String(question.id);
            document.querySelector("#jump-form").requestSubmit();
            await tick();
            const toggle = document.querySelector("#translation-toggle");
            if (toggle.getAttribute("aria-pressed") !== "true") toggle.click();
            const before = document.documentElement.scrollWidth;
            document.querySelectorAll(".answer-option")[0].click();
            await tick();
            const after = document.documentElement.scrollWidth;
            if (before > innerWidth || after > innerWidth) out.push(question.id);
            document.querySelector("#home-button").click();
            await tick();
            document.querySelector(".confirm-leave")?.click();
            await tick();
          }
          return out;
        }`);
        if (overflowing.length) {
          failures.push(`${overflowing.length} question(s) overflow horizontally at ${width}px, first: ${overflowing.slice(0, 10).join(", ")}`);
        }
        expectNoProblems(problems, `Fit check at ${width}px`);
      } finally {
        await context.close();
      }
    }
    if (failures.length) throw new Error(failures.join("\n  "));
  },

  async a11y({ browser, url }) {
    const { context, page, problems } = await openPage(browser, { viewport: MOBILE });
    const report = [];
    const scan = async (label) => {
      const violations = await page.evaluate(async () => {
        const results = await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }
        });
        return results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" "))
        }));
      });
      violations.forEach((violation) => {
        report.push(`${label}: ${violation.impact} ${violation.id} (${violation.help}) at ${violation.targets.join(", ")}`);
      });
    };
    const finishExam = async () => {
      await page.click("#start-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      for (let i = 0; i < 33; i += 1) {
        await page.locator(".answer-option").first().click();
        await page.click("#next-button");
      }
      await page.waitForSelector("#result-screen:not(.is-hidden)");
    };

    try {
      await page.goto(url);
      await page.addScriptTag({ content: axeSource });
      await scan("start with consent notice");
      await page.click(".consent-banner .secondary-action");
      await scan("start");
      await page.click("#catalogue-tab");
      await scan("catalogue tab");
      await page.click("#learn-tab");
      await scan("learn tab");
      await page.click('[data-legal-panel="privacy"]');
      await scan("privacy dialog");
      await page.keyboard.press("Escape");

      await page.click("#progress-tab");
      await page.click("#practice-button");
      await scan("study question");
      await page.locator(".answer-option").first().click();
      await scan("study question answered");
      await page.click("#home-button");
      await page.waitForSelector(".confirm-modal");
      await scan("leave dialog");
      await page.click(".confirm-leave");
      await scan("progress with data");

      await page.click("#start-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      await scan("exam question");
      await page.locator(".answer-option").first().click();
      await scan("exam question answered");
      await page.reload();
      await page.addScriptTag({ content: axeSource });
      await scan("start with a resumable exam");
      await page.click("#resume-button");
      await page.click("#home-button");
      await page.click(".confirm-leave");

      await finishExam();
      await scan("exam result");

      expectNoProblems(problems, "Accessibility check");
      if (report.length) throw new Error(`axe found ${report.length} accessibility problem${report.length === 1 ? "" : "s"}:\n  ${report.join("\n  ")}`);
    } finally {
      await context.close();
    }
  }
};

const selected = (process.env.ONLY || Object.keys(sections).join(",")).split(",").map((name) => name.trim()).filter(Boolean);
const unknown = selected.filter((name) => !sections[name]);
if (unknown.length) {
  console.error(`Unknown section(s): ${unknown.join(", ")}. Available: ${Object.keys(sections).join(", ")}`);
  process.exit(2);
}

fs.rmSync(artifactsDir, { recursive: true, force: true });
const { server, url } = await startServer(Number(process.env.PORT) || 0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const failures = [];

try {
  for (const name of selected) {
    const started = Date.now();
    try {
      await sections[name]({ browser, url });
      console.log(`PASS ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (error) {
      failures.push(name);
      console.log(`FAIL ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)\n  ${String(error.message).split("\n").join("\n  ")}`);
    }
  }
} finally {
  await browser.close();
  if (server.listening) await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
}

if (!failures.length && process.env.KEEP_ARTIFACTS !== "1") fs.rmSync(artifactsDir, { recursive: true, force: true });
if (failures.length) {
  console.error(`\nBrowser checks failed: ${failures.join(", ")}. Screenshots are in ${path.relative(process.cwd(), artifactsDir) || "."}.`);
  process.exitCode = 1;
} else {
  console.log("\nAll browser checks passed.");
}
