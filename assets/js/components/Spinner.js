import { createElement } from "../utils/dom.js";

/**
 * Indicador de carregamento reutilizável (ver docs/UI_GUIDELINES.md § 5).
 * @param {{ size?: "sm" | "md" | "lg" }} options
 */
export function createSpinner({ size = "md" } = {}) {
  return createElement("span", {
    className: `spinner spinner--${size}`,
    attrs: { role: "status", "aria-label": "Carregando" },
  });
}
