import { createElement } from "../utils/dom.js";
import { formatMonthLabel } from "../utils/format.js";

/**
 * Seletor de mês/ano do Dashboard (docs/screens.md § Dashboard).
 *
 * @param {{ month: number, year: number, onChange: (value: { month: number, year: number }) => void }} options
 */
export function createMonthSelector({ month, year, onChange }) {
  let current = { month, year };

  const labelEl = createElement("span", { className: "month-selector__label", text: formatMonthLabel(current.year, current.month) });

  const prevButton = createElement("button", {
    className: "month-selector__button",
    attrs: { type: "button", "aria-label": "Mês anterior" },
    text: "◀",
    on: { click: () => shift(-1) },
  });

  const nextButton = createElement("button", {
    className: "month-selector__button",
    attrs: { type: "button", "aria-label": "Próximo mês" },
    text: "▶",
    on: { click: () => shift(1) },
  });

  function shift(delta) {
    let newMonth = current.month + delta;
    let newYear = current.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    current = { month: newMonth, year: newYear };
    labelEl.textContent = formatMonthLabel(current.year, current.month);
    onChange(current);
  }

  return createElement("div", { className: "month-selector" }, [prevButton, labelEl, nextButton]);
}
