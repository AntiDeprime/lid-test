#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

global.window = {};

require("../questions.js");
require("../translations-en.js");
const explanationFiles = [
  "explanation-texts-001-115.js",
  "explanation-texts-116-230.js",
  "explanation-texts-231-345.js",
  "explanation-texts-346-460.js"
];
explanationFiles.forEach((file) => require(`../${file}`));
require("../explanations.js");

const questions = window.LID_QUESTIONS || [];
const translations = window.LID_TRANSLATIONS_EN || {};
const errors = [];
const OFFICIAL_IMAGE_QUESTION_IDS = new Set([
  21, 55, 70, 130, 176, 181, 187, 209, 216, 226, 235,
  301, 308, 311, 318, 321, 328, 331, 338, 341, 348, 351, 358,
  361, 368, 371, 378, 381, 388, 391, 398, 401, 408, 411, 418,
  421, 428, 431, 438, 441, 448, 451, 458
]);

const explanationIds = explanationFiles.flatMap((file) => {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  return [...source.matchAll(/^\s+(\d+):/gm)].map((match) => Number(match[1]));
});
const explanationIdCounts = explanationIds.reduce((counts, id) => {
  counts[id] = (counts[id] || 0) + 1;
  return counts;
}, {});

function fail(message) {
  errors.push(message);
}

if (!Array.isArray(questions) || questions.length === 0) {
  fail("Question catalogue is missing or empty.");
}

for (let id = 1; id <= 460; id += 1) {
  if (explanationIdCounts[id] !== 1) {
    fail(`Question ${id} must have exactly one bespoke explanation entry; found ${explanationIdCounts[id] || 0}.`);
  }
}

explanationIds.filter((id) => id < 1 || id > 460).forEach((id) => {
  fail(`Explanation entry ${id} is outside the 1-460 catalogue range.`);
});

const seenIds = new Set();
const categoryCounts = {};
const stateCounts = {};

questions.forEach((question, questionIndex) => {
  const label = `Question at index ${questionIndex}`;

  if (!Number.isInteger(question.id)) {
    fail(`${label} has a non-integer id.`);
  } else if (seenIds.has(question.id)) {
    fail(`Question ${question.id} is duplicated.`);
  } else {
    seenIds.add(question.id);
  }

  if (!["general", "state"].includes(question.category)) {
    fail(`Question ${question.id} has invalid category "${question.category}".`);
  } else {
    categoryCounts[question.category] = (categoryCounts[question.category] || 0) + 1;
  }

  if (question.category === "state") {
    if (typeof question.state !== "string" || !question.state.trim()) {
      fail(`Question ${question.id} is missing a Bundesland.`);
    } else {
      stateCounts[question.state] = (stateCounts[question.state] || 0) + 1;
    }
  }

  if (typeof question.prompt !== "string" || !question.prompt.trim()) {
    fail(`Question ${question.id} has an empty prompt.`);
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    fail(`Question ${question.id} must have exactly four options.`);
  } else {
    const correctCount = question.options.filter((option) => option.correct === true).length;
    if (correctCount !== 1) {
      fail(`Question ${question.id} must have exactly one correct option; found ${correctCount}.`);
    }

    question.options.forEach((option, optionIndex) => {
      if (typeof option.text !== "string" || !option.text.trim()) {
        fail(`Question ${question.id}, option ${optionIndex + 1} has empty text.`);
      }
    });
  }

  if (!Array.isArray(question.images)) {
    fail(`Question ${question.id} images must be an array.`);
  } else {
    if (OFFICIAL_IMAGE_QUESTION_IDS.has(question.id) && question.images.length === 0) {
      fail(`Question ${question.id} is missing its official image.`);
    }

    if (!OFFICIAL_IMAGE_QUESTION_IDS.has(question.id) && question.images.length > 0) {
      fail(`Question ${question.id} has an unexpected image.`);
    }

    question.images.forEach((image) => {
      if (!image || typeof image.src !== "string") {
        fail(`Question ${question.id} has an invalid image entry.`);
        return;
      }

      const imagePath = path.join(__dirname, "..", image.src);
      if (!fs.existsSync(imagePath)) {
        fail(`Question ${question.id} references missing image ${image.src}.`);
      }
    });
  }

  if (typeof question.explanation !== "string" || !question.explanation.trim()) {
    fail(`Question ${question.id} is missing a learner explanation.`);
  } else {
    const lazyExplanationPatterns = [
      /^The correct answer is "[^"]+"\.$/,
      /fits the exact concept/i,
      /the test is looking for/i,
      /plausible-looking distractors/i,
      /other (pictures|choices|answers|numbers|people|groups|offices).*distractors/i,
      /The tempting wrong answers/,
      /different right, institution, date, or everyday rule/,
      /Use the exact wording of the prompt/,
      /does not add learner context/
    ];

    lazyExplanationPatterns.forEach((pattern) => {
      if (pattern.test(question.explanation)) {
        fail(`Question ${question.id} has a generic learner explanation: ${question.explanation}`);
      }
    });

    const sentenceCount = question.explanation.split(/[.!?]+/).filter((part) => part.trim()).length;
    if (sentenceCount < 2) {
      fail(`Question ${question.id} explanation is too thin to be useful: ${question.explanation}`);
    }

    if (sentenceCount > 5) {
      fail(`Question ${question.id} explanation is too long (${sentenceCount} sentences).`);
    }
  }

  const translation = translations[question.id];
  if (!translation && question.category === "general") {
    fail(`Question ${question.id} is missing an English translation.`);
  }

  if (translation) {
    if (typeof translation.prompt !== "string" || !translation.prompt.trim()) {
      fail(`Question ${question.id} has an empty English prompt translation.`);
    }

    if (!Array.isArray(translation.options) || translation.options.length !== question.options.length) {
      fail(`Question ${question.id} translation option count does not match the question.`);
    }
  }
});

if (categoryCounts.general !== 300) {
  fail(`Expected 300 general questions; found ${categoryCounts.general || 0}.`);
}

if (categoryCounts.state !== 160) {
  fail(`Expected 160 bundled Bundesland questions; found ${categoryCounts.state || 0}.`);
}

const states = Object.entries(stateCounts);
if (states.length !== 16) {
  fail(`Expected questions for 16 Bundesländer; found ${states.length}.`);
}

states.forEach(([state, count]) => {
  if (count !== 10) {
    fail(`Expected 10 questions for ${state}; found ${count}.`);
  }
});

if (questions.length !== 460) {
  fail(`Expected 460 total questions; found ${questions.length}.`);
}

if (errors.length) {
  console.error("Data validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Data validation passed: ${questions.length} questions, ${categoryCounts.general} general, ${categoryCounts.state} Bundesland state.`
);
