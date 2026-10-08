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
//   ONLY            comma-separated sections to run (smoke,flow,offline,layout,fit,keyboard,visual,review,a11y)
//   KEEP_ARTIFACTS  set to 1 to keep screenshots of passing runs too
//   UPDATE_BASELINES  set to 1 to rewrite scripts/browser/baselines/*.png (visual section)
//   TEST_FONT       force a font family, e.g. "DejaVu Sans" to reproduce the
//                   wider fallback font GitHub Actions renders without Inter

import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const checksDir = path.join(here, "checks");
const artifactsDir = path.join(here, "artifacts");
const baselinesDir = path.join(here, "baselines");
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 720 };

// Visual baselines are rendered in one pinned font so they do not depend on
// whether Inter is installed. A change of up to this share of pixels passes
// (GitHub's runner differs from a local run by up to 0.4% of pixels in
// antialiasing); anything larger is a layout or colour change.
const VISUAL_FONT = "DejaVu Sans";
const VISUAL_VIEWPORT_DESKTOP = { width: 1280, height: 800 };
const MAX_DIFF_RATIO = 0.008;
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

async function openPage(browser, { viewport, serviceWorkers = "block", font = process.env.TEST_FONT, contextOptions = {}, init } = {}) {
  const context = await browser.newContext({ viewport, serviceWorkers, ...contextOptions });
  const page = await context.newPage();
  const problems = [];

  if (init) await context.addInitScript(init.script, init.arg);
  if (font) {
    const css = `html, body, button, input, select, textarea { font-family: ${JSON.stringify(font)} !important; }`;
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

// Compares a viewport screenshot with its committed baseline. With
// UPDATE_BASELINES=1 it rewrites the baseline instead. Returns a failure
// message, or null when the screenshot matches.
async function compareToBaseline(page, name) {
  const actualBuffer = await page.screenshot();
  const file = path.join(baselinesDir, `${name}.png`);

  if (process.env.UPDATE_BASELINES === "1") {
    fs.mkdirSync(baselinesDir, { recursive: true });
    fs.writeFileSync(file, actualBuffer);
    return null;
  }
  if (!fs.existsSync(file)) return `${name}: no baseline yet; run with UPDATE_BASELINES=1 and review the new image`;

  const expected = PNG.sync.read(fs.readFileSync(file));
  const actual = PNG.sync.read(actualBuffer);
  if (expected.width !== actual.width || expected.height !== actual.height) {
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.writeFileSync(path.join(artifactsDir, `${name}.actual.png`), actualBuffer);
    return `${name}: size ${actual.width}x${actual.height} differs from the baseline ${expected.width}x${expected.height}`;
  }

  const diff = new PNG({ width: expected.width, height: expected.height });
  const changed = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, { threshold: 0.15 });
  const ratio = changed / (expected.width * expected.height);
  if (process.env.VERBOSE || process.env.CI) console.log(`  ${name}: ${(ratio * 100).toFixed(3)}% differs`);
  if (ratio <= MAX_DIFF_RATIO) return null;

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${name}.actual.png`), actualBuffer);
  fs.writeFileSync(path.join(artifactsDir, `${name}.diff.png`), PNG.sync.write(diff));
  return `${name}: ${(ratio * 100).toFixed(2)}% of pixels differ from the baseline (limit ${(MAX_DIFF_RATIO * 100).toFixed(1)}%); see artifacts/${name}.diff.png`;
}

async function hasFont(page, family) {
  return page.evaluate((name) => {
    const canvas = document.createElement("canvas").getContext("2d");
    const sample = "mmmmmmmmmmlliWW";
    const widthOf = (font) => { canvas.font = font; return canvas.measureText(sample).width; };
    return widthOf(`20px "${name}", monospace`) !== widthOf("20px monospace") && widthOf(`20px "${name}", serif`) !== widthOf("20px serif");
  }, family);
}

const SEEDED_PROGRESS = {
  version: 1,
  questionStats: Object.fromEntries([[1, [3, 2, 1]], [2, [2, 2, 0]], [3, [4, 1, 3]], [4, [1, 1, 0]], [5, [2, 1, 1]], [6, [3, 3, 0]], [7, [2, 0, 2]], [8, [1, 1, 0]], [9, [2, 2, 0]], [10, [1, 0, 1]]].map(([id, [answered, correct, wrong]]) => [String(id), { answered, correct, wrong }])),
  weakQuestions: { 3: { wrong: 3, correctStreak: 0, lastMissedAt: "2026-09-29T09:00:00.000Z" }, 7: { wrong: 2, correctStreak: 1, lastMissedAt: "2026-09-30T09:00:00.000Z" } },
  bookmarkedQuestions: { 5: { addedAt: "2026-09-28T09:00:00.000Z" } },
  testHistory: [
    { completedAt: "2026-09-28T10:00:00.000Z", correct: 21, total: 33, passed: true, questionIds: [], wrongQuestionIds: [] },
    { completedAt: "2026-09-30T10:00:00.000Z", correct: 15, total: 33, passed: false, questionIds: [], wrongQuestionIds: [] }
  ]
};

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

  // Compares key screens with committed baselines (scripts/browser/baselines).
  // Regenerate them with UPDATE_BASELINES=1 after an intended visual change and
  // review the changed images in the diff.
  async visual({ browser, url }) {
    const failures = [];
    const options = {
      font: VISUAL_FONT,
      contextOptions: { reducedMotion: "reduce", locale: "en-US", timezoneId: "Europe/Berlin", deviceScaleFactor: 1 }
    };
    const compare = async (page, name, scrollTo = null) => {
      await page.evaluate((selector) => {
        if (selector) document.querySelector(selector).scrollIntoView({ block: "start" });
        else window.scrollTo(0, 0);
        return document.fonts.ready;
      }, scrollTo);
      await page.waitForFunction(() => [...document.images].every((image) => {
        const rect = image.getBoundingClientRect();
        const onScreen = image.getClientRects().length > 0 && rect.top < innerHeight + 200;
        return !onScreen || image.complete;
      }));
      await page.waitForTimeout(120);
      const failure = await compareToBaseline(page, name);
      if (failure) failures.push(failure);
    };
    const wrongAnswer = (page) => page.evaluate(() => {
      const prompt = document.querySelector("#question-title").textContent;
      const question = window.LID_QUESTIONS.find((item) => item.prompt === prompt);
      document.querySelectorAll(".answer-option")[question.options.findIndex((option) => !option.correct)].click();
    });
    const sessions = [];
    const open = async (settings) => {
      const session = await openPage(browser, { ...options, ...settings });
      sessions.push(session);
      return session;
    };

    try {
      // Fresh learner on a phone.
      let { page, problems } = await open({ viewport: MOBILE });
      await page.goto(url);
      if (!(await hasFont(page, VISUAL_FONT))) {
        if (process.env.CI) throw new Error(`${VISUAL_FONT} is not installed, so the visual baselines cannot be compared (apt-get install fonts-dejavu-core)`);
        console.log(`  skipped: ${VISUAL_FONT} is not installed here, so baselines cannot be compared`);
        return;
      }
      await compare(page, "start-390");
      await page.click(".consent-banner .secondary-action");
      await page.click("#catalogue-tab");
      await compare(page, "catalogue-390");
      await page.click("#practice-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      await wrongAnswer(page);
      await compare(page, "quiz-answered-390");
      await page.click("#translation-toggle");
      await compare(page, "quiz-translation-390");
      await page.click("#home-button");
      await page.waitForSelector(".confirm-modal");
      await compare(page, "leave-dialog-390");
      await page.click(".confirm-leave");
      await page.waitForSelector("#start-screen:not(.is-hidden)");
      await page.click("#catalogue-tab");
      await page.fill("#jump-question", "70");
      await page.press("#jump-question", "Enter");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      await compare(page, "quiz-image-390");
      await wrongAnswer(page);
      await page.click("#next-button");
      await page.waitForSelector("#result-screen:not(.is-hidden)");
      await compare(page, "result-390");
      expectNoProblems(problems, "Visual check (phone)");

      // Learner with saved progress.
      ({ page, problems } = await open({ viewport: MOBILE, init: { script: (data) => {
        if (!localStorage.getItem("lidTestPrepProgress")) localStorage.setItem("lidTestPrepProgress", JSON.stringify(data));
        localStorage.setItem("lidAnalyticsConsent", "denied");
      }, arg: SEEDED_PROGRESS } }));
      await page.goto(url);
      await compare(page, "start-progress-390");
      await page.click("#progress-tab");
      await compare(page, "progress-390", "#progress-title");
      expectNoProblems(problems, "Visual check (saved progress)");

      // Desktop.
      ({ page, problems } = await open({ viewport: VISUAL_VIEWPORT_DESKTOP }));
      await page.goto(url);
      await compare(page, "start-1280");
      await page.click(".consent-banner .secondary-action");
      await page.click("#practice-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      await wrongAnswer(page);
      await compare(page, "quiz-answered-1280");
      expectNoProblems(problems, "Visual check (desktop)");

      if (failures.length) throw new Error(failures.join("\n  "));
    } finally {
      await Promise.all(sessions.map(({ context }) => context.close()));
    }
  },

  // Drives the app with real key presses only: Tab, Shift+Tab, Enter, Space,
  // Arrow keys, and Escape. Catches focus that is lost when a screen swaps,
  // dialogs that trap or leak focus, and controls with no visible focus ring.
  async keyboard({ browser, url }) {
    const { context, page, problems } = await openPage(browser, { viewport: DESKTOP });
    const failures = [];
    const expect = (ok, message) => { if (!ok) failures.push(message); };
    const describeFocus = () => page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return "nothing (document body)";
      return element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(" ")[0]}` : ""}`;
    });
    const focusIs = (selector) => page.evaluate((target) => Boolean(document.activeElement?.matches(target)), selector);
    const press = async (key) => {
      await page.keyboard.press(key);
      await page.waitForTimeout(25);
    };
    const tabTo = async (selector, { max = 60, reverse = false } = {}) => {
      for (let presses = 0; presses <= max; presses += 1) {
        if (await focusIs(selector)) return true;
        await press(reverse ? "Shift+Tab" : "Tab");
      }
      failures.push(`${selector} cannot be reached with ${reverse ? "Shift+Tab" : "Tab"}; focus is on ${await describeFocus()}`);
      return false;
    };
    const hasFocusRing = () => page.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
    });
    const visible = (selector) => page.evaluate((target) => {
      const element = document.querySelector(target);
      return Boolean(element) && !element.closest(".is-hidden, [hidden]") && element.getClientRects().length > 0;
    }, selector);
    const waitFor = async (selector, what) => {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        return true;
      } catch {
        failures.push(`${what}: ${selector} did not appear; focus is on ${await describeFocus()}`);
        return false;
      }
    };

    try {
      await page.goto(url);

      // Every stop on the start page shows a focus ring, and the expected controls are reachable.
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      const stops = [];
      for (let presses = 0; presses < 45; presses += 1) {
        await press("Tab");
        const stop = await page.evaluate(() => {
          const element = document.activeElement;
          if (!element || element === document.body) return null;
          return { name: element.id ? `#${element.id}` : element.textContent.trim().slice(0, 24) || element.tagName.toLowerCase(), key: element.id || element.className };
        });
        if (!stop) break;
        stops.push(stop.name);
        expect(await hasFocusRing(), `${stop.name} has no visible focus ring on the start page`);
      }
      ["#bundesland-select", "#start-button", "#practice-button", "#study-filter"].forEach((id) => {
        expect(stops.includes(id), `${id} is not in the start page Tab order`);
      });
      expect(stops.includes("Privacy") && stops.includes("Imprint"), "Privacy and Imprint links are not in the start page Tab order");

      // The analytics choice works from the keyboard and focus stays in the page.
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      if (await tabTo(".consent-banner .secondary-action")) {
        await press("Enter");
        expect(!(await visible(".consent-banner")), "Consent banner is still open after choosing from the keyboard");
        expect(!(await focusIs("body")), "Focus is lost to the page body after the analytics choice");
      }

      // Tabs follow the arrow, Home, and End keys.
      if (await tabTo('.start-tab[aria-selected="true"]')) {
        await press("ArrowRight");
        expect(await page.evaluate(() => document.activeElement.getAttribute("aria-selected") === "true" && document.activeElement.id === "catalogue-tab" || document.activeElement.id === "learn-tab"), "ArrowRight does not move to and select the next tab");
        await press("End");
        const endTab = await page.evaluate(() => document.activeElement.id);
        await press("Home");
        const homeTab = await page.evaluate(() => document.activeElement.id);
        expect(endTab && homeTab && endTab !== homeTab, "Home and End do not move between the first and last tab");
      }

      // Catalogue: jump to a question number and land on its title.
      await page.evaluate(() => document.querySelector("#catalogue-tab").click());
      if (await tabTo("#jump-question")) {
        await page.keyboard.type("70");
        await press("Enter");
        await waitFor("#quiz-screen:not(.is-hidden)", "Opening a question from the catalogue");
        expect(await focusIs("#question-title"), `Opening a question from the catalogue leaves focus on ${await describeFocus()} instead of the question title`);
        expect(await page.evaluate(() => /Lehrer|Sch|Bild|\?/.test(document.querySelector("#question-title").textContent)), "Question 70 did not open from the catalogue");
      }

      // Quiz: choose with Space, move on with Enter, and keep focus on the new question.
      if (await tabTo(".answer-option")) {
        await press("Space");
        expect(await visible("#feedback-verdict"), "Choosing an answer with Space did not show the verdict");
        expect(await focusIs("#next-button"), `After answering, focus is on ${await describeFocus()} instead of Next`);
        await press("Enter");
        await waitFor("#result-screen:not(.is-hidden)", "Finishing the question");
        expect(await focusIs("#result-title"), `After finishing, focus is on ${await describeFocus()} instead of the result title`);
      }

      // Result: practise a missed question from the keyboard.
      if (await tabTo(".review-practice")) {
        await press("Enter");
        await waitFor("#quiz-screen:not(.is-hidden)", "Practising from the result");
        expect(await focusIs("#question-title"), `Practising from the result leaves focus on ${await describeFocus()} instead of the question title`);
      }

      // Leave dialog (shown once an answer is saved): focus starts on the safe
      // action, is trapped, and returns to Home on Escape.
      if (await tabTo(".answer-option")) {
        await press("Enter");
      }
      if (await tabTo("#home-button", { reverse: true })) {
        await press("Enter");
        await waitFor(".confirm-modal", "Pressing Home");
        expect(await focusIs(".confirm-actions .primary-action"), `The leave dialog starts with focus on ${await describeFocus()}, not on the safe action`);
        const seen = new Set();
        for (let presses = 0; presses < 8; presses += 1) {
          await press("Tab");
          seen.add(await page.evaluate(() => Boolean(document.activeElement.closest(".confirm-modal"))));
        }
        expect(seen.size === 1 && seen.has(true), "Tab leaves the leave dialog; focus is not trapped");
        await press("Escape");
        expect(!(await visible(".confirm-modal")), "Escape does not close the leave dialog");
        expect(await focusIs("#home-button"), `Closing the dialog leaves focus on ${await describeFocus()} instead of Home`);
        await press("Enter");
        await waitFor(".confirm-modal", "Pressing Home again");
        if (await tabTo(".confirm-leave")) {
          await press("Enter");
          await waitFor("#start-screen:not(.is-hidden)", "Leaving from the dialog");
          expect(await focusIs("#start-title"), `Back on the start page, focus is on ${await describeFocus()} instead of the page heading`);
        }
      }

      // Exam simulation answered entirely from the keyboard, ending on the result.
      if (await tabTo("#start-button")) {
        await press("Enter");
        await waitFor("#quiz-screen:not(.is-hidden)", "Starting an exam");
        expect(await focusIs("#question-title"), `Starting an exam leaves focus on ${await describeFocus()} instead of the question title`);
        for (let question = 1; question <= 33; question += 1) {
          const kicker = await page.evaluate(() => document.querySelector("#question-kicker").textContent);
          if (!(await tabTo(".answer-option", { max: 12 }))) break;
          await press("Enter");
          if (!(await focusIs("#next-button"))) {
            failures.push(`Exam question ${question}: focus is on ${await describeFocus()} instead of Next after answering`);
            break;
          }
          await press("Enter");
          if (question < 33) {
            const next = await page.evaluate(() => document.querySelector("#question-kicker").textContent);
            if (next === kicker) { failures.push(`Exam question ${question}: Enter on Next did not advance`); break; }
            if (!(await focusIs("#question-title"))) { failures.push(`Exam question ${question + 1}: focus is on ${await describeFocus()} instead of the question title`); break; }
          }
        }
        await page.waitForSelector("#result-screen:not(.is-hidden)", { timeout: 3000 }).catch(() => failures.push("The keyboard-only exam did not reach the result screen"));
        expect(await focusIs("#result-title"), `Exam result leaves focus on ${await describeFocus()} instead of the result title`);
      }

      expectNoProblems(problems, "Keyboard check");
      if (failures.length) throw new Error(failures.join("\n  "));
    } catch (error) {
      await shot(page, "keyboard-failure").catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  },

  // Spaced repetition and readiness, driven through the real interface with
  // progress saved by the previous storage version (so the migration runs too).
  async review({ browser, url }) {
    const failures = [];
    const expect = (ok, message) => { if (!ok) failures.push(message); };
    const sessions = [];
    const open = async (progress) => {
      const session = await openPage(browser, { viewport: DESKTOP, init: { script: (data) => {
        if (!localStorage.getItem("lidTestPrepProgress")) localStorage.setItem("lidTestPrepProgress", JSON.stringify(data));
        localStorage.setItem("lidAnalyticsConsent", "denied");
      }, arg: progress } });
      sessions.push(session);
      return session;
    };
    const readiness = (page) => page.evaluate(() => ({
      value: document.querySelector("#readiness-value").textContent,
      label: document.querySelector("#readiness-label").textContent,
      meterVisible: !document.querySelector("#readiness-meter").classList.contains("is-hidden"),
      now: document.querySelector("#readiness-meter").getAttribute("aria-valuenow"),
      score: Number((document.querySelector("#readiness-score").textContent.match(/about ([0-9.]+) of 33/) || [])[1]),
      detail: document.querySelector("#readiness-detail").textContent
    }));
    const dueButton = (page) => page.evaluate(() => {
      const button = document.querySelector("#due-review-button");
      return { visible: !button.classList.contains("is-hidden"), text: button.textContent };
    });
    const answerCorrectly = (page) => page.evaluate(() => {
      const prompt = document.querySelector("#question-title").textContent;
      const question = window.LID_QUESTIONS.find((item) => item.prompt === prompt);
      document.querySelectorAll(".answer-option")[question.options.findIndex((option) => option.correct)].click();
      return question.id;
    });

    try {
      // Saved by version 1 of the storage format: ten studied questions, no schedule.
      const { page, problems } = await open(SEEDED_PROGRESS);
      await page.goto(url);
      const before = await readiness(page);
      const due = await dueButton(page);
      expect(due.visible && due.text === "Review 10 due questions", `Migrated progress should offer "Review 10 due questions", got ${JSON.stringify(due)}`);
      expect(before.meterVisible && /^\d+%$/.test(before.value), `Readiness should show a percentage, got "${before.value}"`);
      expect(Boolean(before.label) && before.now === before.value.replace("%", ""), "Readiness label or meter value is missing");
      expect(/10 of 460 questions studied/.test(before.detail) && /10 questions are due/.test(before.detail), `Readiness detail says: ${before.detail}`);

      await page.click("#due-review-button");
      await page.waitForSelector("#quiz-screen:not(.is-hidden)");
      expect(await page.evaluate(() => document.querySelector("#question-kicker").textContent.includes("1 / 10")), "A due review should hold the 10 due questions");
      const firstId = await answerCorrectly(page);
      const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem("lidTestPrepProgress")), 0);
      expect(saved.version === 2, `Saved progress should be version 2 after the first answer, got ${saved.version}`);
      const entry = saved.questionStats[String(firstId)];
      expect(entry && new Date(entry.dueAt).getTime() > Date.now() && entry.box >= 1 && Boolean(entry.lastAnsweredAt), `Answer ${firstId} should be scheduled in the future, got ${JSON.stringify(entry)}`);

      for (let answered = 1; answered < 10; answered += 1) {
        await page.click("#next-button");
        await answerCorrectly(page);
      }
      await page.click("#next-button");
      await page.waitForSelector("#result-screen:not(.is-hidden)");
      expect(await page.evaluate(() => document.querySelector("#result-title").textContent) === "Review complete", "A due review should end with \"Review complete\"");
      await page.click("#result-home-button");
      await page.waitForSelector("#start-screen:not(.is-hidden)");
      const after = await readiness(page);
      expect(!(await dueButton(page)).visible, "No questions should be due after answering all ten correctly");
      expect(after.score > before.score, `The expected score should rise after ten correct answers (${before.score} to ${after.score})`);
      expect(Number(after.now) >= Number(before.now), `Readiness should not fall after ten correct answers (${before.value} to ${after.value})`);
      expect(!/are due|is due/.test(after.detail), `Readiness detail still mentions due questions: ${after.detail}`);
      expectNoProblems(problems, "Review check");

      // More due questions than one run holds.
      const many = { ...SEEDED_PROGRESS, questionStats: Object.fromEntries(Array.from({ length: 30 }, (_, index) => [String(index + 1), { answered: 2, correct: 1, wrong: 1 }])) };
      const crowded = await open(many);
      await crowded.page.goto(url);
      const capped = await dueButton(crowded.page);
      expect(capped.text === "Review 25 of 30 due questions", `A long backlog should be capped at 25, got "${capped.text}"`);
      await crowded.page.click("#due-review-button");
      await crowded.page.waitForSelector("#quiz-screen:not(.is-hidden)");
      expect(await crowded.page.evaluate(() => document.querySelector("#question-kicker").textContent.includes("1 / 25")), "A capped review should hold 25 questions");
      await answerCorrectly(crowded.page);
      await crowded.page.click("#restart-button");
      await crowded.page.waitForSelector(".confirm-modal");
      await crowded.page.click(".confirm-leave");
      await crowded.page.waitForTimeout(150);
      expect(await crowded.page.evaluate(() => document.querySelector("#question-kicker").textContent.includes("/ 25")), "Restart in a due review should start another due review, not an exam");
      expectNoProblems(crowded.problems, "Review check (backlog)");

      // First-run learners see neither a queue nor an estimate.
      const fresh = await open({ version: 2, questionStats: {}, weakQuestions: {}, bookmarkedQuestions: {}, testHistory: [] });
      await fresh.page.goto(url);
      expect(!(await dueButton(fresh.page)).visible, "A new learner should not see a due review");
      expect(await fresh.page.evaluate(() => document.querySelector("#queue-actions").classList.contains("is-hidden")), "A new learner should not see review queues");

      if (failures.length) throw new Error(failures.join("\n  "));
    } finally {
      await Promise.all(sessions.map(({ context }) => context.close()));
    }
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
// These flags keep text rendering the same on every machine (no OS hinting,
// no LCD subpixel antialiasing), which the visual baselines depend on.
const RENDERING_ARGS = ["--font-render-hinting=none", "--disable-lcd-text", "--disable-font-subpixel-positioning", "--force-color-profile=srgb"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: RENDERING_ARGS });
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
