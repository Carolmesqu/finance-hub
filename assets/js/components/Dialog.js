import { createElement } from "../utils/dom.js";
import { createButton } from "./Button.js";
import { openModal, closeModal } from "./Modal.js";

/**
 * Diálogo de confirmação reutilizável (docs/UI_GUIDELINES.md § 5.4), usado em
 * toda ação destrutiva (remover membro, excluir lançamento, etc.).
 *
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, variant?: "primary"|"danger" }} options
 * @returns {Promise<boolean>} true se confirmado, false se cancelado/fechado.
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
} = {}) {
  return new Promise((resolve) => {
    let settled = false;

    const settle = (value) => {
      if (settled) return;
      settled = true;
      closeModal();
      resolve(value);
    };

    const cancelButton = createButton({ label: cancelLabel, variant: "secondary", onClick: () => settle(false) });
    const confirmButton = createButton({ label: confirmLabel, variant, onClick: () => settle(true) });

    const content = createElement("div", { className: "dialog" }, [
      createElement("p", { className: "dialog__message", text: message }),
      createElement("div", { className: "dialog__actions" }, [cancelButton, confirmButton]),
    ]);

    openModal({ title, content, onClose: () => settle(false) });
  });
}
