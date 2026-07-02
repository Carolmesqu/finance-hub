import { renderTransactionListPage } from "./transactionListPageFactory.js";
import { openExpenseFormModal } from "../components/ExpenseFormModal.js";

const PERIOD_LABELS = {
  start_of_month: "Início do Mês",
  fortnight: "Quinzena",
};

/**
 * Tela de Despesas (docs/screens.md § Despesas (Lista)) — casca fina sobre
 * `transactionListPageFactory`, compartilhada com Receitas (Sprint 4).
 */
export function renderExpensesPage() {
  return renderTransactionListPage({
    type: "expense",
    title: "Despesas",
    newButtonLabel: "+ Nova Despesa",
    emptyMessage: 'Nenhuma despesa encontrada. Cadastre a primeira clicando em "+ Nova Despesa".',
    headerProps: { title: "Despesas", showDashboardLink: true, showIncomesLink: true, showCardsLink: true, showReportsLink: true },
    withCards: true,
    openFormModal: openExpenseFormModal,
    describeRow: (transaction, categoryName) => {
      const periodLabel = PERIOD_LABELS[transaction.paymentPeriod] || "";
      return [categoryName, periodLabel].filter(Boolean).join(" · ");
    },
  });
}
