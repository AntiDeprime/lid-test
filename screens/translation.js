import { LANGUAGES, getLanguage, isSupportedLanguage } from "../modules/languages.js";
import { saveLanguagePreference } from "../modules/preferences.js";

// The translation toggle, the language picker, and the translated question
// text under the German prompt. Translations load on first use; the panel says
// so while it waits and offers a retry if the file cannot be fetched.
export function createTranslationControls(ctx, { onOptionsChanged = () => {} } = {}) {
  const { state, content, events } = ctx;
  const $ = (id) => document.getElementById(id);
  const toggleButton = $("translation-toggle");
  const toggleLabel = $("translation-label");
  const bar = $("translation-bar");
  const select = $("translation-language");
  const panel = $("question-translation");
  const answers = $("answers");
  // idle -> loading -> idle (loaded) or error; a retry or a new choice resets it.
  let status = "idle";
  let requestedCode = null;

  LANGUAGES.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.nativeName;
    option.lang = language.code;
    select.append(option);
  });
  select.value = getLanguage(state.translationLanguage).code;

  const currentQuestion = () => state.run[state.index];
  const isActive = () => state.mode !== "exam" && state.translationsEnabled;

  function renderToggle() {
    const language = getLanguage(state.translationLanguage);
    const disabled = state.mode === "exam";
    toggleLabel.textContent = language.nativeName;
    toggleLabel.lang = language.code;
    toggleButton.disabled = disabled;
    toggleButton.setAttribute("aria-pressed", String(!disabled && state.translationsEnabled));
    // The visible label is the language's own name, so the accessible name starts with it.
    toggleButton.title = disabled
      ? `${language.nativeName}: translations are disabled in exam simulation`
      : `${language.nativeName}: ${state.translationsEnabled ? "hide" : "show"} translation`;
    toggleButton.setAttribute("aria-label", toggleButton.title);
    bar.classList.toggle("is-hidden", !isActive());
    select.value = language.code;
  }

  function setEnabled(enabled) {
    state.translationsEnabled = enabled;
    renderToggle();
  }

  function toggle() {
    if (state.mode === "exam") return;
    state.translationsEnabled = !state.translationsEnabled;
    status = "idle";
    renderToggle();
    render();
  }

  function clearOptions() {
    answers.querySelectorAll(".option-translation").forEach((item) => {
      item.classList.add("is-hidden");
      item.textContent = "";
      item.removeAttribute("lang");
    });
    onOptionsChanged();
  }

  function showMessage(kind, text, extra) {
    const message = document.createElement("p");
    message.textContent = text;
    panel.replaceChildren(message);
    if (extra) panel.append(extra);
    panel.dataset.state = kind;
    panel.lang = "en";
    panel.classList.remove("is-hidden");
  }

  function showError() {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "secondary-action translation-retry";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => {
      status = "idle";
      render();
    });
    showMessage("error", "The translation could not be loaded. Check your connection and try again.", retry);
  }

  function request(code) {
    if (status === "loading" && requestedCode === code) return;
    status = "loading";
    requestedCode = code;
    content.ensureTranslations(code).then(
      () => {
        if (requestedCode !== code) return;
        status = "idle";
        render();
      },
      () => {
        if (requestedCode !== code) return;
        status = "error";
        render();
      }
    );
  }

  function showTranslation(question, translation, language) {
    const prompt = document.createElement("p");
    prompt.textContent = translation.prompt;
    panel.replaceChildren(prompt);
    panel.dataset.state = "ready";
    panel.lang = language.code;
    panel.classList.remove("is-hidden");

    question.options.forEach((option, index) => {
      const item = answers.querySelector(`[data-translation-index="${index}"]`);
      if (!item) return;
      item.textContent = translation.options[index] || option.text;
      item.lang = language.code;
      item.classList.remove("is-hidden");
    });
    onOptionsChanged();
  }

  function render() {
    const question = currentQuestion();
    if (!question) return;

    if (!isActive()) {
      panel.classList.add("is-hidden");
      panel.replaceChildren();
      delete panel.dataset.state;
      clearOptions();
      return;
    }

    const language = getLanguage(state.translationLanguage);
    const translations = content.translationsFor(language.code);
    if (!translations) {
      clearOptions();
      if (status === "error") {
        showError();
      } else {
        showMessage("loading", "Loading translation…");
        request(language.code);
      }
      return;
    }

    const translation = translations[question.id];
    if (translation) {
      showTranslation(question, translation, language);
    } else {
      clearOptions();
      showMessage("missing", `${language.name} translation is not available for this question yet.`);
    }
  }

  toggleButton.addEventListener("click", toggle);
  select.addEventListener("change", () => {
    if (!isSupportedLanguage(select.value)) return;
    state.translationLanguage = select.value;
    saveLanguagePreference(select.value);
    status = "idle";
    renderToggle();
    render();
    events.emit("language-changed");
  });

  return { render, renderToggle, setEnabled };
}
