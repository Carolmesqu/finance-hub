import { createElement } from "../utils/dom.js";

let activeOverlay = null;

/**
 * Modal genérico e reutilizável (docs/UI_GUIDELINES.md § 5.4).
 * Desktop: centralizado. Mobile: bottom sheet (definido via CSS).
 *
 * @param {{ title: string, content: Node, onClose?: () => void }} options
 * @returns {{ close: () => void }}
 */
export function openModal({ title, content, onClose } = {}) {
  closeModal();

  const closeAndNotify = () => {
    closeModal();
    if (onClose) onClose();
  };

  const dialogBox = createElement(
    "div",
    { className: "modal__box", attrs: { role: "dialog", "aria-modal": "true", "aria-label": title || "" } },
    [
      createElement("header", { className: "modal__header" }, [
        createElement("h2", { className: "modal__title", text: title || "" }),
        createElement("button", {
          className: "modal__close",
          attrs: { type: "button", "aria-label": "Fechar" },
          text: "\u2715",
          on: { click: closeAndNotify },
        }),
      ]),
      createElement("div", { className: "modal__content" }, [content]),
    ]
  );

  const overlay = createElement("div", {
    className: "modal-overlay",
    attrs: { tabindex: "-1" },
    on: {
      click: (event) => {
        if (event.target === overlay) closeAndNotify();
      },
      keydown: (event) => {
        if (event.key === "Escape") closeAndNotify();
      },
    },
  }, [dialogBox]);

  document.body.appendChild(overlay);
  document.body.classList.add("no-scroll");

  requestAnimationFrame(() => {
    overlay.classList.add("modal-overlay--visible");
    overlay.focus();
  });

  activeOverlay = overlay;
  return { close: closeAndNotify };
}

export function closeModal() {
  if (!activeOverlay) return;
  activeOverlay.remove();
  document.body.classList.remove("no-scroll");
  activeOverlay = null;
}
