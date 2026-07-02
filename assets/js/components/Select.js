import { createElement } from "../utils/dom.js";

/**
 * Select reutilizável (docs/UI_GUIDELINES.md § 5.3).
 *
 * @param {{ label: string, options: { value: string, label: string }[], value?: string, id?: string }} options
 * @returns {{ element: HTMLElement, select: HTMLSelectElement }}
 */
export function createSelect({ label, options = [], value, id } = {}) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;

  const select = createElement(
    "select",
    { className: "input__field input__field--select", attrs: { id: selectId } },
    options.map((option) => createElement("option", { attrs: { value: option.value }, text: option.label }))
  );

  if (value !== undefined) {
    select.value = value;
  }

  const errorEl = createElement("span", { className: "input__error" });

  const wrapper = createElement("div", { className: "input" }, [
    createElement("label", { className: "input__label", attrs: { for: selectId }, text: label }),
    select,
    errorEl,
  ]);

  return { element: wrapper, select };
}
