import { createElement } from "../utils/dom.js";
import { formatCurrency, formatMonthChartLabel } from "../utils/format.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

/**
 * Gráfico de barras (Receitas x Despesas) dos últimos 12 meses, em SVG puro
 * (sem bibliotecas externas de gráficos, conforme PROJECT.md § Arquitetura).
 *
 * @param {Array<{ month: string, income: number, expense: number }>} data
 */
export function createMonthlyChart(data = []) {
  const hasData = data.some((item) => item.income > 0 || item.expense > 0);

  const wrapper = createElement("div", { className: "monthly-chart" }, [
    createElement("div", { className: "monthly-chart__legend" }, [
      createElement("span", { className: "monthly-chart__legend-item" }, [
        createElement("span", { className: "monthly-chart__dot monthly-chart__dot--income" }),
        createElement("span", { text: "Receitas" }),
      ]),
      createElement("span", { className: "monthly-chart__legend-item" }, [
        createElement("span", { className: "monthly-chart__dot monthly-chart__dot--expense" }),
        createElement("span", { text: "Despesas" }),
      ]),
    ]),
  ]);

  if (!hasData) {
    wrapper.appendChild(
      createElement("p", {
        className: "monthly-chart__empty",
        text: "Ainda não há lançamentos suficientes para exibir o gráfico.",
      })
    );
    return wrapper;
  }

  const width = 600;
  const height = 200;
  const chartHeight = height - 24;
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.income, item.expense]));
  const groupWidth = width / Math.max(data.length, 1);
  const barWidth = Math.min(14, groupWidth / 3);

  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "monthly-chart__svg",
    role: "img",
    "aria-label": "Gráfico de receitas e despesas dos últimos 12 meses",
  });

  data.forEach((item, index) => {
    const groupX = index * groupWidth + groupWidth / 2;
    const incomeHeight = Math.max((item.income / maxValue) * (chartHeight - 8), item.income > 0 ? 2 : 0);
    const expenseHeight = Math.max((item.expense / maxValue) * (chartHeight - 8), item.expense > 0 ? 2 : 0);

    const incomeBar = createSvgElement("rect", {
      x: groupX - barWidth - 2,
      y: chartHeight - incomeHeight,
      width: barWidth,
      height: incomeHeight,
      rx: 2,
      class: "monthly-chart__bar monthly-chart__bar--income",
    });
    const incomeTitle = createSvgElement("title");
    incomeTitle.textContent = `Receitas: ${formatCurrency(item.income)}`;
    incomeBar.appendChild(incomeTitle);
    svg.appendChild(incomeBar);

    const expenseBar = createSvgElement("rect", {
      x: groupX + 2,
      y: chartHeight - expenseHeight,
      width: barWidth,
      height: expenseHeight,
      rx: 2,
      class: "monthly-chart__bar monthly-chart__bar--expense",
    });
    const expenseTitle = createSvgElement("title");
    expenseTitle.textContent = `Despesas: ${formatCurrency(item.expense)}`;
    expenseBar.appendChild(expenseTitle);
    svg.appendChild(expenseBar);

    const label = createSvgElement("text", {
      x: groupX,
      y: height - 6,
      class: "monthly-chart__month-label",
      "text-anchor": "middle",
    });
    label.textContent = formatMonthChartLabel(item.month);
    svg.appendChild(label);
  });

  wrapper.appendChild(svg);
  return wrapper;
}
