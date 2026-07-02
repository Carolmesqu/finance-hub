import { createElement } from "../utils/dom.js";
import { createAppHeader } from "../components/AppHeader.js";
import { createSpinner } from "../components/Spinner.js";
import { createSummaryCard } from "../components/SummaryCard.js";
import { createButton } from "../components/Button.js";
import { createTransactionRow } from "../components/TransactionRow.js";
import { generateReport } from "../services/reportService.js";
import { listCategories } from "../services/categoryService.js";
import { listCards } from "../services/cardService.js";
import { listAccounts } from "../services/accountService.js";
import { formatCurrency } from "../utils/format.js";
import { showToast } from "../components/Toast.js";
import { createMonthlyChart } from "../components/MonthlyChart.js";
import { getState } from "../state/store.js";

/**
 * Tela de Relatórios (docs/screens.md § Relatórios).
 */
export function renderReportsPage() {
  const { workspace } = getState();
  const currency = workspace?.currency || "BRL";

  // Inicializar datas com o mês corrente
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const pad = (n) => String(n).padStart(2, "0");
  const firstDay = `${year}-${pad(month)}-01`;
  const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

  let activeTab = "overview"; // overview, categories, cards, evolution
  let reportData = null;
  let categories = [];
  let cards = [];
  let accounts = [];

  // Elementos de Entrada
  const startDateInput = createElement("input", {
    className: "input__field",
    attrs: { type: "date", value: firstDay },
  });
  const endDateInput = createElement("input", {
    className: "input__field",
    attrs: { type: "date", value: lastDay },
  });

  const searchInput = createElement("input", {
    className: "input__field",
    attrs: { type: "text", placeholder: "Buscar lançamentos..." },
  });

  const categorySelect = createElement("select", { className: "input__field input__field--select" }, [
    createElement("option", { attrs: { value: "" }, text: "Todas as Categorias" }),
  ]);
  const cardSelect = createElement("select", { className: "input__field input__field--select" }, [
    createElement("option", { attrs: { value: "" }, text: "Todos os Cartões" }),
  ]);
  const accountSelect = createElement("select", { className: "input__field input__field--select" }, [
    createElement("option", { attrs: { value: "" }, text: "Todas as Contas" }),
  ]);

  // Containers
  const contentEl = createElement("div", { className: "reports-page__content" });
  const transactionsListEl = createElement("div", { className: "transaction-list-page__list-box" });

  const filterSection = createElement("div", { className: "reports-page__filters" }, [
    createElement("div", { className: "input" }, [
      createElement("label", { className: "input__label", text: "Data Início" }),
      startDateInput,
    ]),
    createElement("div", { className: "input" }, [
      createElement("label", { className: "input__label", text: "Data Fim" }),
      endDateInput,
    ]),
    createButton({
      label: "Gerar Relatório",
      variant: "primary",
      onClick: fetchReport,
    }),
  ]);

  const searchSection = createElement("div", { className: "reports-page__search-row" }, [
    searchInput,
    categorySelect,
    cardSelect,
    accountSelect,
  ]);

  const pdfButton = createButton({
    label: "Exportar PDF",
    variant: "secondary",
    size: "sm",
    onClick: () => handleExport("pdf"),
  });
  const excelButton = createButton({
    label: "Exportar Excel",
    variant: "secondary",
    size: "sm",
    onClick: () => handleExport("xlsx"),
  });

  const page = createElement("main", { className: "reports-page" }, [
    createAppHeader({
      title: workspace.name,
      showBackToWorkspaces: true,
      showDashboardLink: true,
      showIncomesLink: true,
      showExpensesLink: true,
      showCardsLink: true,
      showReportsLink: true,
    }),
    createElement("div", { className: "reports-page__body" }, [
      createElement("div", { className: "reports-page__title-row" }, [
        createElement("h1", { className: "reports-page__title", text: "Relatórios Financeiros" }),
        createElement("div", { className: "reports-page__actions" }, [pdfButton, excelButton]),
      ]),
      filterSection,
      contentEl,
    ]),
  ]);

  // Listeners para filtros interativos locais
  searchInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
  cardSelect.addEventListener("change", applyFilters);
  accountSelect.addEventListener("change", applyFilters);

  bootstrap();

  async function bootstrap() {
    try {
      const [cats, crds, accs] = await Promise.all([listCategories(), listCards(), listAccounts()]);
      categories = cats;
      cards = crds;
      accounts = accs;

      // Popular dropdowns
      categories.forEach((cat) => {
        categorySelect.appendChild(createElement("option", { attrs: { value: cat.id }, text: cat.name }));
      });
      cards.forEach((card) => {
        cardSelect.appendChild(createElement("option", { attrs: { value: card.id }, text: card.name }));
      });
      accounts.forEach((acc) => {
        accountSelect.appendChild(createElement("option", { attrs: { value: acc.id }, text: acc.name }));
      });

      await fetchReport();
    } catch (error) {
      showToast({ message: "Erro ao inicializar filtros.", type: "error" });
    }
  }

  async function fetchReport() {
    contentEl.replaceChildren(createSpinner({ size: "lg" }));
    try {
      const res = await generateReport({
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        format: "json",
      });
      reportData = res.data;
      renderReportContent();
    } catch (error) {
      contentEl.replaceChildren(
        createElement("p", { className: "reports-page__empty", text: error.message || "Erro ao carregar relatório." })
      );
    }
  }

  function renderReportContent() {
    if (!reportData) return;

    // Seção de abas de exibição
    const tabsEl = createElement("div", { className: "reports-page__tabs" }, [
      createTabButton("Visão Geral", "overview"),
      createTabButton("Categorias", "categories"),
      createTabButton("Cartões", "cards"),
      createTabButton("Evolução Mensal", "evolution"),
    ]);

    // Cards indicadores principais
    const summaryCardsEl = createElement("div", { className: "reports-page__summary-cards" }, [
      createSummaryCard({
        label: "Receitas",
        value: formatCurrency(reportData.totals.income, currency),
        variant: "income",
      }),
      createSummaryCard({
        label: "Despesas",
        value: formatCurrency(reportData.totals.expense, currency),
        variant: "expense",
      }),
      createSummaryCard({
        label: "Saldo Líquido",
        value: formatCurrency(reportData.totals.balance, currency),
        variant: reportData.totals.balance >= 0 ? "income" : "expense",
      }),
    ]);

    // Container dinâmico da aba ativa
    const activeTabCardEl = createElement("div", { className: "reports-page__card" });
    renderActiveTabContent(activeTabCardEl);

    // Listagem e busca de transações
    const listCardEl = createElement("div", { className: "reports-page__card" }, [
      createElement("h2", { className: "reports-page__card-title", text: "Transações do Período" }),
      searchSection,
      transactionsListEl,
    ]);

    contentEl.replaceChildren(tabsEl, summaryCardsEl, activeTabCardEl, listCardEl);
    applyFilters();
  }

  function createTabButton(label, tabName) {
    const isActive = activeTab === tabName;
    return createElement("button", {
      className: `reports-page__tab-btn ${isActive ? "reports-page__tab-btn--active" : ""}`,
      text: label,
      on: {
        click: () => {
          activeTab = tabName;
          renderReportContent();
        },
      },
    });
  }

  function renderActiveTabContent(container) {
    if (activeTab === "overview") {
      container.appendChild(createElement("h2", { className: "reports-page__card-title", text: "Comparativo com Período Anterior" }));
      
      const comp = reportData.comparative;
      const incDiff = comp.current.income - comp.previous.income;
      const expDiff = comp.current.expense - comp.previous.expense;

      const incIndicator = incDiff >= 0 
        ? createElement("span", { className: "comparative-card__indicator comparative-card__indicator--down", text: `+${formatCurrency(incDiff, currency)}` })
        : createElement("span", { className: "comparative-card__indicator comparative-card__indicator--up", text: `${formatCurrency(incDiff, currency)}` });

      const expIndicator = expDiff >= 0 
        ? createElement("span", { className: "comparative-card__indicator comparative-card__indicator--up", text: `+${formatCurrency(expDiff, currency)}` })
        : createElement("span", { className: "comparative-card__indicator comparative-card__indicator--down", text: `${formatCurrency(expDiff, currency)}` });

      container.appendChild(createElement("div", { className: "comparative-panel" }, [
        createElement("div", { className: "comparative-card" }, [
          createElement("span", { className: "comparative-card__title", text: "Comparativo de Receitas" }),
          createElement("div", { className: "comparative-card__values" }, [
            createElement("span", { className: "comparative-card__current", text: formatCurrency(comp.current.income, currency) }),
            incIndicator
          ]),
          createElement("span", { className: "input__error", text: `Período anterior: ${formatCurrency(comp.previous.income, currency)}` })
        ]),
        createElement("div", { className: "comparative-card" }, [
          createElement("span", { className: "comparative-card__title", text: "Comparativo de Despesas" }),
          createElement("div", { className: "comparative-card__values" }, [
            createElement("span", { className: "comparative-card__current", text: formatCurrency(comp.current.expense, currency) }),
            expIndicator
          ]),
          createElement("span", { className: "input__error", text: `Período anterior: ${formatCurrency(comp.previous.expense, currency)}` })
        ])
      ]));
    } 
    else if (activeTab === "categories") {
      container.appendChild(createElement("h2", { className: "reports-page__card-title", text: "Despesas por Categoria" }));
      if (reportData.byCategory.length === 0) {
        container.appendChild(createElement("p", { className: "reports-page__empty", text: "Nenhuma despesa registrada no período." }));
        return;
      }

      const list = createElement("div", { className: "progress-list" });
      reportData.byCategory.forEach((item) => {
        list.appendChild(createElement("div", { className: "progress-item" }, [
          createElement("div", { className: "progress-item__header" }, [
            createElement("span", { className: "progress-item__name", text: item.categoryName }),
            createElement("span", { className: "progress-item__value", text: `${formatCurrency(item.total, currency)} (${item.percentage}%)` }),
          ]),
          createElement("div", { className: "progress-item__bar-wrapper" }, [
            createElement("div", { className: "progress-item__bar", style: `width: ${item.percentage}%` }),
          ]),
        ]));
      });
      container.appendChild(list);
    } 
    else if (activeTab === "cards") {
      container.appendChild(createElement("h2", { className: "reports-page__card-title", text: "Despesas por Cartão de Crédito" }));
      if (reportData.byCard.length === 0) {
        container.appendChild(createElement("p", { className: "reports-page__empty", text: "Nenhum gasto em cartão no período." }));
        return;
      }

      const totalSpent = reportData.byCard.reduce((sum, item) => sum + item.total, 0);
      const list = createElement("div", { className: "progress-list" });
      reportData.byCard.forEach((item) => {
        const percentage = totalSpent > 0 ? ((item.total / totalSpent) * 100).toFixed(1) : 0;
        list.appendChild(createElement("div", { className: "progress-item" }, [
          createElement("div", { className: "progress-item__header" }, [
            createElement("span", { className: "progress-item__name", text: item.cardName }),
            createElement("span", { className: "progress-item__value", text: `${formatCurrency(item.total, currency)} (${percentage}%)` }),
          ]),
          createElement("div", { className: "progress-item__bar-wrapper" }, [
            createElement("div", { className: "progress-item__bar", style: `width: ${percentage}%` }),
          ]),
        ]));
      });
      container.appendChild(list);
    } 
    else if (activeTab === "evolution") {
      container.appendChild(createElement("h2", { className: "reports-page__card-title", text: "Evolução Mensal (Receitas x Despesas)" }));
      if (reportData.monthlyEvolution.length === 0) {
        container.appendChild(createElement("p", { className: "reports-page__empty", text: "Dados insuficientes para gerar a evolução." }));
        return;
      }
      container.appendChild(createMonthlyChart(reportData.monthlyEvolution));
    }
  }

  function applyFilters() {
    if (!reportData) return;

    const query = searchInput.value.toLowerCase().trim();
    const catId = categorySelect.value;
    const crdId = cardSelect.value;
    const accId = accountSelect.value;

    const filtered = reportData.transactions.filter((tx) => {
      const matchQuery = !query || String(tx.description).toLowerCase().includes(query);
      const matchCat = !catId || tx.categoryId === catId;
      const matchCard = !crdId || tx.cardId === crdId;
      const matchAccount = !accId || tx.accountId === accId;
      return matchQuery && matchCat && matchCard && matchAccount;
    });

    renderTransactionsList(filtered);
  }

  function renderTransactionsList(list) {
    if (list.length === 0) {
      transactionsListEl.replaceChildren(
        createElement("p", { className: "transaction-list-page__empty", text: "Nenhum lançamento corresponde aos filtros selecionados." })
      );
      return;
    }

    transactionsListEl.replaceChildren(
      ...list.map((tx) =>
        createTransactionRow({
          transaction: tx,
          categoryName: tx.categoryName,
        })
      )
    );
  }

  async function handleExport(format) {
    try {
      const res = await generateReport({
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        format: format,
      });

      if (res.fileURL) {
        const link = document.createElement("a");
        link.href = res.fileURL;
        link.download = `relatorio_${startDateInput.value}_a_${endDateInput.value}.${format === "pdf" ? "pdf" : "csv"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast({ message: "Exportado com sucesso!", type: "success" });
      }
    } catch (error) {
      showToast({ message: error.message || "Erro ao exportar arquivo.", type: "error" });
    }
  }

  return page;
}
