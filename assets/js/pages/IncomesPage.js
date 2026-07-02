import { renderTransactionListPage } from "./transactionListPageFactory.js";
import { openIncomeFormModal } from "../components/IncomeFormModal.js";

/**
 * Tela de Receitas (docs/screens.md § Receitas (Lista)) — casca fina sobre
 * `transactionListPageFactory`, que concentra a lógica compartilhada com
 * Despesas (Sprint 5).
 */
export function renderIncomesPage() {
  return renderTransactionListPage({
    type: "income",
    title: "Receitas",
    newButtonLabel: "+ Nova Receita",
    emptyMessage: 'Nenhuma receita encontrada. Cadastre a primeira clicando em "+ Nova Receita".',
    headerProps: { title: "Receitas", showDashboardLink: true, showExpensesLink: true, showCardsLink: true, showReportsLink: true },
    openFormModal: openIncomeFormModal,
  });
}

