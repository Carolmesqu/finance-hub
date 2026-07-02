import { createElement } from "../utils/dom.js";

/**
 * Card de estatística reutilizável (Saldo, Receitas, Despesas, Economia).
 * `variant` controla a cor do valor: "income" | "expense" | "brand" | "neutral".
 */
export function createSummaryCard({ label, value, variant = "neutral", hint = "" } = {}) {
  return createElement("div", { className: "summary-card" }, [
    createElement("span", { className: "summary-card__label", text: label }),
    createElement("strong", { className: `summary-card__value summary-card__value--${variant}`, text: value }),
    hint ? createElement("span", { className: "summary-card__hint", text: hint }) : null,
  ]);
}
