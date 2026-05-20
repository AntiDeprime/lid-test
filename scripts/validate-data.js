#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

global.window = {};

require("../questions.js");
require("../translations-en.js");

const questions = window.LID_QUESTIONS || [];
const translations = window.LID_TRANSLATIONS_EN || {};
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!Array.isArray(questions) || questions.length === 0) {
  fail("Question catalogue is missing or empty.");
}

const seenIds = new Set();
const categoryCounts = {};

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

  const translation = translations[question.id];
  if (!translation) {
    fail(`Question ${question.id} is missing an English translation.`);
  } else {
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

if (categoryCounts.state !== 10) {
  fail(`Expected 10 bundled Berlin state questions; found ${categoryCounts.state || 0}.`);
}

if (errors.length) {
  console.error("Data validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Data validation passed: ${questions.length} questions, ${categoryCounts.general} general, ${categoryCounts.state} Berlin state.`
);
