import { createElement } from "../utils/dom.js";

/**
 * Campo de texto reutilizável (docs/UI_GUIDELINES.md § 5.3).
 * Label sempre visível (nunca apenas placeholder), com suporte a mensagem de erro.
 *
 * @param {{ label: string, type?: string, value?: string, placeholder?: string, required?: boolean, id?: string }} options
 * @returns {{ element: HTMLElement, input: HTMLInputElement, setError: (message?: string) => void }}
 */
export function createInput({ label, type = "text", value = "", placeholder = "", required = false, id } = {}) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

  const input = createElement("input", {
    className: "input__field",
    attrs: { id: inputId, type, placeholder, required: required || null },
  });
  input.value = value;

  const errorEl = createElement("span", { className: "input__error" });

  const wrapper = createElement("div", { className: "input" }, [
    createElement("label", { className: "input__label", attrs: { for: inputId }, text: label }),
    input,
    errorEl,
  ]);

  function setError(message) {
    if (message) {
      wrapper.classList.add("input--error");
      errorEl.textContent = message;
    } else {
      wrapper.classList.remove("input--error");
      errorEl.textContent = "";
    }
  }

  return { element: wrapper, input, setError };
}
