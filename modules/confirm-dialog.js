import { showModalDialog } from "./dialog.js";

function createButton(className, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

// Resolves true only when the confirm button is pressed. Escape, the close
// button, the backdrop, and the keep button all resolve false.
export function confirmDialog({ title, message, confirmLabel, cancelLabel, trigger }) {
  return new Promise((resolve) => {
    let settled = false;
    let dialog = null;

    function settle(value) {
      if (settled) return;
      settled = true;
      resolve(value);
    }

    dialog = showModalDialog({
      className: "confirm-modal",
      title,
      labelledBy: "confirm-title",
      trigger,
      onClose: () => settle(false),
      renderContent(modal) {
        const copy = document.createElement("p");
        const actions = document.createElement("div");
        const keep = createButton("primary-action", cancelLabel);
        const confirm = createButton("secondary-action confirm-leave", confirmLabel);

        copy.textContent = message;
        actions.className = "confirm-actions";
        keep.addEventListener("click", () => dialog.close());
        confirm.addEventListener("click", () => {
          settle(true);
          dialog.close();
        });
        actions.append(keep, confirm);
        modal.append(copy, actions);
      }
    });

    dialog.element.querySelector(".confirm-actions .primary-action")?.focus();
  });
}
