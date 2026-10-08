const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const openDialogs = new Map();

export function showModalDialog(options) {
  const { className, title, labelledBy, trigger, renderContent, onClose } = options;
  openDialogs.get(className)?.();
  document.querySelector(`.${className}`)?.remove();
  document.querySelector(`.${className}-backdrop`)?.remove();

  const previousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  const backdrop = document.createElement("div");
  const modal = document.createElement("section");
  const close = document.createElement("button");
  const heading = document.createElement("h2");

  function getFocusableItems() {
    return [...modal.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((element) => element.offsetParent !== null || element === document.activeElement);
  }

  function closeModal() {
    if (openDialogs.get(className) === closeModal) openDialogs.delete(className);
    document.removeEventListener("keydown", handleDocumentKeydown);
    modal.remove();
    backdrop.remove();
    if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
      previousFocus.focus();
    }
    if (typeof onClose === "function") onClose();
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableItems = getFocusableItems();
    if (!focusableItems.length) {
      event.preventDefault();
      close.focus();
      return;
    }

    const first = focusableItems[0];
    const last = focusableItems[focusableItems.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  modal.className = className;
  backdrop.className = `${className}-backdrop modal-backdrop`;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", labelledBy);
  close.className = "icon-action";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");
  heading.id = labelledBy;
  heading.textContent = title;
  close.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  modal.append(close, heading);
  renderContent(modal);
  document.body.append(backdrop);
  document.body.append(modal);
  document.addEventListener("keydown", handleDocumentKeydown);
  openDialogs.set(className, closeModal);
  close.focus();

  return { close: closeModal, element: modal };
}
