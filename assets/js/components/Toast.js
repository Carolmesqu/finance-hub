import { createElement } from "../utils/dom.js";

const TOAST_DURATION_MS = 3000;
let containerEl = null;

function getContainer() {
  if (!containerEl) {
    containerEl = createElement("div", {
      className: "toast-container",
      attrs: { "aria-live": "polite", "aria-atomic": "true" },
    });
    document.body.appendChild(containerEl);
  }
  return containerEl;
}

/**
 * Notificação temporária reutilizável (ver docs/UI_GUIDELINES.md § 5.4).
 * @param {{ message: string, type?: "success" | "error" | "warning" | "info" }} options
 */
export function showToast({ message, type = "info" } = {}) {
  const container = getContainer();

  const toast = createElement("div", { className: `toast toast--${type}`, attrs: { role: "status" } }, [
    createElement("span", { className: "toast__message", text: message }),
  ]);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  const remove = () => {
    toast.classList.remove("toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };

  setTimeout(remove, TOAST_DURATION_MS);
}
