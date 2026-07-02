import { createElement } from "../utils/dom.js";
import { createAppHeader } from "../components/AppHeader.js";
import { createSpinner } from "../components/Spinner.js";
import { createSummaryCard } from "../components/SummaryCard.js";
import { createMonthSelector } from "../components/MonthSelector.js";
import { createMonthlyChart } from "../components/MonthlyChart.js";
import { createTransactionRow } from "../components/TransactionRow.js";
import { createButton, setButtonLoading } from "../components/Button.js";
import { showToast } from "../components/Toast.js";
import { getState } from "../state/store.js";
import { getDashboardSummary } from "../services/dashboardService.js";
import { formatCurrency, formatDateShort } from "../utils/format.js";
import { openIncomeFormModal } from "../components/IncomeFormModal.js";
import { openExpenseFormModal } from "../components/ExpenseFormModal.js";
import { openTransferFormModal } from "../components/TransferFormModal.js";
import { listAccounts } from "../services/accountService.js";
import { listCategories } from "../services/categoryService.js";
import { listCards } from "../services/cardService.js";

/**
 * Dashboard (docs/screens.md § Dashboard) — visão consolidada do mês
 * corrente do Workspace ativo. Accounts/Cards/Categories/Transactions ainda
 * não possuem telas de cadastro (chegam nas Sprints 4 a 7, docs/roadmap.md),
 * então os Cards abaixo naturalmente aparecem zerados/vazios até lá — o
 * cálculo já está pronto no backend e passa a refletir dados reais sem
 * nenhuma alteração aqui.
 */
export function renderDashboardPage() {
  const { workspace } = getState();
  const currency = workspace.currency || "BRL";
  const now = new Date();

  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1;

  const monthSelector = createMonthSelector({
    month: currentMonth,
    year: currentYear,
    onChange: (value) => {
      currentYear = value.year;
      currentMonth = value.month;
      loadSummary(currentMonth, currentYear);
    },
  });

  const refresh = () => loadSummary(currentMonth, currentYear);

  let isActionLoading = false;

  const toolbarActions = createElement("div", { className: "dashboard__toolbar-actions" }, [
    createButton({
      label: "+ Receita",
      variant: "primary",
      size: "sm",
      onClick: async (event) => {
        if (isActionLoading) return;
        isActionLoading = true;
        const btn = event.currentTarget;
        setButtonLoading(btn, true);
        try {
          const [accounts, categories] = await Promise.all([
            listAccounts(),
            listCategories({ type: "income" }),
          ]);
          openIncomeFormModal({
            accounts,
            categories,
            onAccountsChanged: listAccounts,
            onSaved: refresh,
          });
        } catch (error) {
          showToast({ message: "Erro ao carregar dados para receita.", type: "error" });
        } finally {
          setButtonLoading(btn, false);
          isActionLoading = false;
        }
      },
    }),
    createButton({
      label: "+ Despesa",
      variant: "danger",
      size: "sm",
      onClick: async (event) => {
        if (isActionLoading) return;
        isActionLoading = true;
        const btn = event.currentTarget;
        setButtonLoading(btn, true);
        try {
          const [accounts, categories, cards] = await Promise.all([
            listAccounts(),
            listCategories({ type: "expense" }),
            listCards(),
          ]);
          openExpenseFormModal({
            accounts,
            categories,
            cards,
            onAccountsChanged: listAccounts,
            onCardsChanged: listCards,
            onSaved: refresh,
          });
        } catch (error) {
          showToast({ message: "Erro ao carregar dados para despesa.", type: "error" });
        } finally {
          setButtonLoading(btn, false);
          isActionLoading = false;
        }
      },
    }),
    createButton({
      label: "+ Transferência",
      variant: "secondary",
      size: "sm",
      onClick: async (event) => {
        if (isActionLoading) return;
        isActionLoading = true;
        const btn = event.currentTarget;
        setButtonLoading(btn, true);
        try {
          const accounts = await listAccounts();
          if (accounts.length < 2) {
            showToast({ message: "Cadastre pelo menos duas contas antes de realizar transferências.", type: "error" });
            return;
          }
          await openTransferFormModal({ onSaved: refresh, preloadedAccounts: accounts });
        } catch (error) {
          showToast({ message: "Erro ao carregar contas para transferência.", type: "error" });
        } finally {
          setButtonLoading(btn, false);
          isActionLoading = false;
        }
      },
    }),
  ]);

  const bodyEl = createElement("div", { className: "dashboard__body" });

  const page = createElement("main", { className: "dashboard" }, [
    createAppHeader({
      title: workspace.name,
      showBackToWorkspaces: true,
      showMembersLink: true,
      showIncomesLink: true,
      showExpensesLink: true,
      showCardsLink: true,
      showReportsLink: true,
    }),
    createElement("div", { className: "dashboard__toolbar" }, [monthSelector, toolbarActions]),
    bodyEl,
  ]);

  loadSummary(now.getMonth() + 1, now.getFullYear());

  async function loadSummary(month, year) {
    bodyEl.replaceChildren(createSpinner({ size: "lg" }));
    try {
      const summary = await getDashboardSummary({ month, year });
      bodyEl.replaceChildren(renderSummary(summary));
    } catch (error) {
      bodyEl.replaceChildren(
        createElement("p", { className: "dashboard__error", text: error.message || "Não foi possível carregar o Dashboard." })
      );
      showToast({ message: error.message || "Não foi possível carregar o Dashboard.", type: "error" });
    }
  }

  function renderSummary(summary) {
    const economyPercent = summary.totalIncome > 0 ? (summary.balance / summary.totalIncome) * 100 : 0;

    return createElement("div", { className: "dashboard__content" }, [
      createElement("section", { className: "dashboard__cards" }, [
        createSummaryCard({
          label: "Saldo do Mês",
          value: formatCurrency(summary.balance, currency),
          variant: summary.balance >= 0 ? "income" : "expense",
        }),
        createSummaryCard({ label: "Receitas", value: formatCurrency(summary.totalIncome, currency), variant: "income" }),
        createSummaryCard({ label: "Despesas", value: formatCurrency(summary.totalExpense, currency), variant: "expense" }),
        createSummaryCard({
          label: "Economia do Mês",
          value: `${economyPercent.toFixed(1)}%`,
          variant: economyPercent >= 0 ? "income" : "expense",
        }),
      ]),

      createElement("section", { className: "dashboard__section" }, [
        createElement("h2", { className: "dashboard__section-title", text: "Quinzena" }),
        createElement("div", { className: "dashboard__cards" }, [
          createSummaryCard({
            label: "Início do Mês",
            value: formatCurrency(summary.startOfMonth.total, currency),
            hint: `Pendente: ${formatCurrency(summary.startOfMonth.pending, currency)}`,
          }),
          createSummaryCard({
            label: "Quinzena",
            value: formatCurrency(summary.fortnight.total, currency),
            hint: `Pendente: ${formatCurrency(summary.fortnight.pending, currency)}`,
          }),
        ]),
      ]),

      createElement("section", { className: "dashboard__section" }, [
        createElement("h2", { className: "dashboard__section-title", text: "Cartões" }),
        renderCardsList(summary.cards),
      ]),

      createElement("section", { className: "dashboard__section" }, [
        createElement("h2", { className: "dashboard__section-title", text: "Gráfico Mensal" }),
        createMonthlyChart(summary.monthlyChart),
      ]),

      createElement("section", { className: "dashboard__section" }, [
        createElement("h2", { className: "dashboard__section-title", text: "Resumo Anual" }),
        createElement("div", { className: "dashboard__cards" }, [
          createSummaryCard({ label: "Receitas do Ano", value: formatCurrency(summary.yearlySummary.totalIncome, currency), variant: "income" }),
          createSummaryCard({ label: "Despesas do Ano", value: formatCurrency(summary.yearlySummary.totalExpense, currency), variant: "expense" }),
          createSummaryCard({
            label: "Saldo do Ano",
            value: formatCurrency(summary.yearlySummary.balance, currency),
            variant: summary.yearlySummary.balance >= 0 ? "income" : "expense",
          }),
        ]),
      ]),

      createElement("section", { className: "dashboard__section" }, [
        createElement("h2", { className: "dashboard__section-title", text: "Próximos Vencimentos" }),
        renderTransactionList(summary.upcomingDue, "Nenhum vencimento nos próximos 7 dias."),
      ]),

      createElement("section", { className: "dashboard__section" }, [
        createElement("h2", { className: "dashboard__section-title", text: "Últimos Lançamentos" }),
        renderTransactionList(summary.recentTransactions, "Nenhum lançamento registrado ainda."),
      ]),
    ]);
  }

  function renderCardsList(cards) {
    if (cards.length === 0) {
      return createElement("p", { className: "dashboard__empty", text: "Nenhum cartão cadastrado ainda." });
    }
    return createElement(
      "div",
      { className: "dashboard__card-list" },
      cards.map((card) =>
        createElement("div", { className: "dashboard-card-item" }, [
          createElement("span", { className: "dashboard-card-item__name", text: card.name }),
          createElement("span", { className: "dashboard-card-item__invoice", text: formatCurrency(card.invoiceTotal, currency) }),
          createElement("span", { className: "dashboard-card-item__due", text: `Vence em ${formatDateShort(card.dueDate)}` }),
        ])
      )
    );
  }

  function renderTransactionList(transactions, emptyMessage) {
    if (transactions.length === 0) {
      return createElement("p", { className: "dashboard__empty", text: emptyMessage });
    }
    return createElement(
      "div",
      { className: "dashboard__transaction-list" },
      transactions.map((transaction) => createTransactionRow({ transaction }))
    );
  }

  return page;
}
