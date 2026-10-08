import { TOTAL_GENERAL, TOTAL_STATE, PASS_THRESHOLD } from "./quiz-rules.js";
import { isDue } from "./scheduling.js";

// Estimated chance of passing today's exam, from the learner's own answers.
// Questions never answered count as guesses (one in four), a few answers
// count for little, and questions that are due for review count for a bit less.
export const GUESS_RATE = 0.25;
export const MIN_STUDIED_FOR_ESTIMATE = 10;
const DUE_RETENTION = 0.8;

export function estimateQuestionProbability(stats, now = new Date()) {
  if (!stats || !stats.answered) return GUESS_RATE;

  const smoothed = (stats.correct + GUESS_RATE * 2) / (stats.answered + 2);
  const lastWasMiss = stats.box === 1 && stats.wrong > 0;
  const capped = lastWasMiss ? Math.min(smoothed, 0.5) : smoothed;
  const retention = isDue(stats, now) ? DUE_RETENTION : 1;
  return GUESS_RATE + (capped - GUESS_RATE) * retention;
}

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : GUESS_RATE;
}

function binomialPmf(trials, probability) {
  const pmf = [];
  let coefficient = 1;
  for (let successes = 0; successes <= trials; successes += 1) {
    pmf.push(coefficient * probability ** successes * (1 - probability) ** (trials - successes));
    coefficient = (coefficient * (trials - successes)) / (successes + 1);
  }
  return pmf;
}

function convolve(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0);
  a.forEach((valueA, indexA) => b.forEach((valueB, indexB) => { result[indexA + indexB] += valueA * valueB; }));
  return result;
}

export function getReadinessLabel(passChance) {
  if (passChance >= 0.85) return "Looking ready";
  if (passChance >= 0.6) return "Nearly ready";
  if (passChance >= 0.25) return "Getting closer";
  return "Keep studying";
}

// `selectedState` is the Bundesland whose three questions the exam would use.
export function estimateReadiness(progress, questions, selectedState = "", now = new Date()) {
  const general = questions.filter((question) => question.category === "general");
  const stateQuestions = questions.filter((question) => question.category === "state" && (!selectedState || question.state === selectedState));
  const probability = (question) => estimateQuestionProbability(progress.questionStats[String(question.id)], now);
  const generalRate = average(general.map(probability));
  const stateRate = average(stateQuestions.map(probability));

  const distribution = convolve(binomialPmf(TOTAL_GENERAL, generalRate), binomialPmf(TOTAL_STATE, stateRate));
  const passChance = distribution.slice(PASS_THRESHOLD).reduce((total, value) => total + value, 0);
  const studied = questions.filter((question) => (progress.questionStats[String(question.id)]?.answered || 0) > 0).length;

  return {
    passChance,
    expectedScore: TOTAL_GENERAL * generalRate + TOTAL_STATE * stateRate,
    studied,
    total: questions.length,
    hasEstimate: studied >= MIN_STUDIED_FOR_ESTIMATE,
    label: getReadinessLabel(passChance)
  };
}
