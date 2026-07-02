import { createElement } from "../utils/dom.js";

/**
 * Switch (toggle) reutilizável (docs/UI_GUIDELINES.md § 5.3), usado em
 * "recorrente", "incluir no total", preferências de tema, etc.
 *
 * @param {{ label: string, checked?: boolean, id?: string }} options
 * @returns {{ element: HTMLElement, input: HTMLInputElement }}
 */
export function createSwitch({ label, checked = false, id } = {}) {
  const switchId = id || `switch-${Math.random().toString(36).slice(2, 9)}`;

  const input = createElement("input", {
    className: "switch__input",
    attrs: { id: switchId, type: "checkbox" },
  });
  input.checked = checked;

  const element = createElement("label", { className: "switch", attrs: { for: switchId } }, [
    input,
    createElement("span", { className: "switch__track" }),
    createElement("span", { className: "switch__label", text: label }),
  ]);

  return { element, input };
}
