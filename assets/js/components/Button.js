import { createElement } from "../utils/dom.js";
import { createSpinner } from "./Spinner.js";

/**
 * Botão reutilizável (ver docs/UI_GUIDELINES.md § 5.2).
 *
 * @param {{
 *   label: string,
 *   variant?: "primary" | "secondary" | "ghost" | "danger",
 *   size?: "sm" | "md" | "lg",
 *   type?: "button" | "submit",
 *   icon?: Node,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   fullWidth?: boolean,
 *   onClick?: (event: MouseEvent) => void,
 * }} options
 * @returns {HTMLButtonElement}
 */
export function createButton({
  label,
  variant = "primary",
  size = "md",
  type = "button",
  icon = null,
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
} = {}) {
  const classNames = ["btn", `btn--${variant}`, `btn--${size}`];
  if (fullWidth) {
    classNames.push("btn--full");
  }
  if (loading) {
    classNames.push("btn--loading");
  }

  const children = [];
  if (icon && !loading) {
    children.push(icon);
  }
  children.push(createElement("span", { className: "btn__label", text: label }));
  if (loading) {
    children.push(createSpinner({ size: "sm" }));
  }

  const button = createElement(
    "button",
    {
      className: classNames.join(" "),
      attrs: { type, "aria-busy": loading ? "true" : null },
      on: onClick ? { click: onClick } : undefined,
    },
    children
  );

  button.disabled = Boolean(disabled || loading);

  return button;
}

/**
 * Alterna o estado de carregamento de um botão já criado, sem precisar
 * recriar o elemento (útil em submits assíncronos de formulário).
 */
export function setButtonLoading(button, loading) {
  button.disabled = loading;
  button.setAttribute("aria-busy", loading ? "true" : "false");
  button.classList.toggle("btn--loading", loading);

  const existingSpinner = button.querySelector(".spinner");
  if (loading && !existingSpinner) {
    button.appendChild(createSpinner({ size: "sm" }));
  } else if (!loading && existingSpinner) {
    existingSpinner.remove();
  }
}
