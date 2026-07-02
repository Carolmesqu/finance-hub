import { createElement } from "../utils/dom.js";
import { formatCurrency, formatDateShort } from "../utils/format.js";

/**
 * Linha de lançamento reutilizada em "Últimos Lançamentos"/"Próximos
 * Vencimentos" no Dashboard (somente leitura) e nas listas de Receitas/
 * Despesas (com ações de editar/excluir, quando `onEdit`/`onDelete` são
 * informados).
 *
 * @param {{ transaction: object, categoryName?: string, onEdit?: () => void, onDelete?: () => void }} options
 */
export function createTransactionRow({ transaction, categoryName = "", onEdit, onDelete }) {
  const isIncome = transaction.type === "income";
  const sign = isIncome ? "+" : "-";
  const dateLabel = formatDateShort(transaction.date);

  const children = [
    createElement("div", {
      className: `transaction-row__icon transaction-row__icon--${transaction.type}`,
      text: isIncome ? "↑" : "↓",
    }),
    createElement("div", { className: "transaction-row__info" }, [
      createElement("span", { className: "transaction-row__description", text: transaction.description || "Sem descrição" }),
      createElement("span", {
        className: "transaction-row__date",
        text: categoryName ? `${dateLabel} · ${categoryName}` : dateLabel,
      }),
    ]),
    createElement("span", {
      className: `transaction-row__amount transaction-row__amount--${transaction.type}`,
      text: `${sign} ${formatCurrency(transaction.amount)}`,
    }),
  ];

  if (onEdit || onDelete) {
    const actions = [];
    if (onEdit) {
      actions.push(
        createElement("button", {
          className: "transaction-row__action",
          attrs: { type: "button", "aria-label": "Editar" },
          text: "✏️",
          on: { click: onEdit },
        })
      );
    }
    if (onDelete) {
      actions.push(
        createElement("button", {
          className: "transaction-row__action",
          attrs: { type: "button", "aria-label": "Excluir" },
          text: "🗑️",
          on: { click: onDelete },
        })
      );
    }
    children.push(createElement("div", { className: "transaction-row__actions" }, actions));
  }

  return createElement("div", { className: "transaction-row" }, children);
}
