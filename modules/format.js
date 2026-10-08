export const LETTERS = ["A", "B", "C", "D"];

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatAnswer(question, optionIndex) {
  if (!Number.isInteger(optionIndex)) return "No answer selected";

  const letter = LETTERS[optionIndex] || "";
  const option = question.options[optionIndex];
  return `${letter}. ${option ? option.text : "No answer selected"}`;
}
