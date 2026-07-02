import { createElement } from "../utils/dom.js";
import { createAppHeader } from "../components/AppHeader.js";
import { createSpinner } from "../components/Spinner.js";
import { createButton, setButtonLoading } from "../components/Button.js";
import { createInput } from "../components/Input.js";
import { createSelect } from "../components/Select.js";
import { createTransactionRow } from "../components/TransactionRow.js";
import { showToast } from "../components/Toast.js";
import { confirmDialog } from "../components/Dialog.js";
import { listTransactions, deleteTransaction } from "../services/transactionService.js";
import { listAccounts } from "../services/accountService.js";
import { listCategories } from "../services/categoryService.js";
import { listCards } from "../services/cardService.js";

const PAGE_SIZE = 20;

/**
 * Fábrica de página de lista de lançamentos, reutilizada por Receitas
 * (Sprint 4) e Despesas (Sprint 5) — ambas compartilham exatamente a mesma
 * estrutura de filtros/lista/paginação, diferindo apenas no `type` e no
 * modal usado para criar/editar (docs/screens.md § Receitas/Despesas).
 *
 * @param {{
 *   type: "income" | "expense",
 *   title: string,
 *   newButtonLabel: string,
 *   emptyMessage: string,
 *   headerProps: object,
 *   withCards?: boolean,
 *   openFormModal: (options: {
 *     transaction?: object,
 *     accounts: object[],
 *     categories: object[],
 *     cards: object[],
 *     onAccountsChanged: () => Promise<object[]>,
 *     onCardsChanged: () => Promise<object[]>,
 *     onSaved: () => void,
 *   }) => void,
 *   describeRow?: (transaction: object, categoryName: string) => string,
 * }} config
 */
export function renderTransactionListPage({
  type,
  title,
  newButtonLabel,
  emptyMessage,
  headerProps,
  withCards = false,
  openFormModal,
  describeRow,
}) {
  let accounts = [];
  let categories = [];
  let cards = [];
  let categoryNameById = {};
  let currentPage = 1;
  let totalItems = 0;
  let loadedItems = [];

  const listEl = createElement("div", { className: "transaction-list-page__list" });
  const loadMoreButton = createButton({ label: "Carregar mais", variant: "secondary", fullWidth: true, onClick: loadMore });
  loadMoreButton.hidden = true;

  const searchInput = createInput({ label: "Buscar", placeholder: "Descrição" });
  const categoryFilter = createSelect({ label: "Categoria", options: [{ value: "", label: "Todas as categorias" }] });
  const startDateInput = createInput({ label: "De", type: "date" });
  const endDateInput = createInput({ label: "Até", type: "date" });
  const filterButton = createButton({ label: "Filtrar", variant: "secondary", onClick: applyFilters });

  const filterButtonWrapper = createElement("div", { className: "input" }, [
    createElement("label", { className: "input__label", text: "\u00A0" }),
    filterButton,
    createElement("span", { className: "input__error" }),
  ]);

  const newButton = createButton({ label: newButtonLabel, variant: "primary", onClick: openNewModal });

  const page = createElement("main", { className: "transaction-list-page" }, [
    createAppHeader(headerProps),
    createElement("div", { className: "transaction-list-page__body" }, [
      createElement("div", { className: "transaction-list-page__heading" }, [
        createElement("h1", { className: "transaction-list-page__title", text: title }),
        newButton,
      ]),
      createElement("div", { className: "transaction-list-page__filters" }, [
        searchInput.element,
        categoryFilter.element,
        startDateInput.element,
        endDateInput.element,
        filterButtonWrapper,
      ]),
      listEl,
      loadMoreButton,
    ]),
  ]);

  bootstrap();

  async function bootstrap() {
    listEl.replaceChildren(createSpinner({ size: "lg" }));
    try {
      const basePromises = [listAccounts(), listCategories({ type })];
      if (withCards) basePromises.push(listCards());
      const results = await Promise.all(basePromises);
      accounts = results[0];
      categories = results[1];
      if (withCards) cards = results[2];
      categoryNameById = Object.fromEntries(categories.map((category) => [category.id, category.name]));
      categoryFilter.select.replaceChildren(
        createElement("option", { attrs: { value: "" }, text: "Todas as categorias" }),
        ...categories.map((category) => createElement("option", { attrs: { value: category.id }, text: category.name }))
      );
      await loadPage(1, { reset: true });
    } catch (error) {
      listEl.replaceChildren(
        createElement("p", {
          className: "transaction-list-page__empty",
          text: error.message || "Não foi possível carregar os lançamentos.",
        })
      );
      showToast({ message: error.message || "Não foi possível carregar os lançamentos.", type: "error" });
    }
  }

  function buildFilters() {
    return {
      type,
      search: searchInput.input.value.trim() || undefined,
      categoryId: categoryFilter.select.value || undefined,
      startDate: startDateInput.input.value || undefined,
      endDate: endDateInput.input.value || undefined,
    };
  }

  async function applyFilters() {
    setButtonLoading(filterButton, true);
    try {
      await loadPage(1, { reset: true });
    } finally {
      setButtonLoading(filterButton, false);
    }
  }

  async function loadPage(pageNumber, { reset = false } = {}) {
    if (reset) {
      listEl.replaceChildren(createSpinner({ size: "lg" }));
    }

    const response = await listTransactions({ ...buildFilters(), page: pageNumber, pageSize: PAGE_SIZE });
    currentPage = pageNumber;
    totalItems = response.total;
    loadedItems = reset ? response.items : [...loadedItems, ...response.items];
    renderList();
  }

  async function loadMore() {
    setButtonLoading(loadMoreButton, true);
    try {
      await loadPage(currentPage + 1);
    } catch (error) {
      showToast({ message: error.message || "Não foi possível carregar mais itens.", type: "error" });
    } finally {
      setButtonLoading(loadMoreButton, false);
    }
  }

  function renderList() {
    if (loadedItems.length === 0) {
      listEl.replaceChildren(createElement("p", { className: "transaction-list-page__empty", text: emptyMessage }));
      loadMoreButton.hidden = true;
      return;
    }

    listEl.replaceChildren(
      createElement(
        "div",
        { className: "transaction-list-page__list-box" },
        loadedItems.map((transaction) => {
          const categoryName = categoryNameById[transaction.categoryId] || "";
          return createTransactionRow({
            transaction,
            categoryName: describeRow ? describeRow(transaction, categoryName) : categoryName,
            onEdit: () => openEditModal(transaction),
            onDelete: () => handleDelete(transaction),
          });
        })
      )
    );

    loadMoreButton.hidden = loadedItems.length >= totalItems;
  }

  async function refreshAccounts() {
    accounts = await listAccounts();
    return accounts;
  }

  async function refreshCards() {
    cards = await listCards();
    return cards;
  }

  function openNewModal() {
    openFormModal({
      accounts,
      categories,
      cards,
      onAccountsChanged: refreshAccounts,
      onCardsChanged: refreshCards,
      onSaved: () => loadPage(1, { reset: true }),
    });
  }

  function openEditModal(transaction) {
    openFormModal({
      transaction,
      accounts,
      categories,
      cards,
      onAccountsChanged: refreshAccounts,
      onCardsChanged: refreshCards,
      onSaved: () => loadPage(1, { reset: true }),
    });
  }

  async function handleDelete(transaction) {
    const confirmed = await confirmDialog({
      title: "Excluir Lançamento",
      message: `Tem certeza que deseja excluir "${transaction.description}"?`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!confirmed) return;

    let applyToAllInstallments = false;
    let applyToAllRecurrences = false;

    if (transaction.installmentPlanId) {
      applyToAllInstallments = await confirmDialog({
        title: "Despesa parcelada",
        message: "Esta despesa faz parte de um parcelamento. Deseja excluir também as parcelas futuras?",
        confirmLabel: "Excluir futuras",
        cancelLabel: "Somente esta",
        variant: "danger",
      });
    } else if (transaction.recurrenceGroupId) {
      applyToAllRecurrences = await confirmDialog({
        title: "Lançamento recorrente",
        message: "Este lançamento faz parte de uma recorrência. Deseja excluir também as ocorrências futuras?",
        confirmLabel: "Excluir futuras",
        cancelLabel: "Somente esta",
        variant: "danger",
      });
    }

    try {
      await deleteTransaction(transaction.id, { applyToAllInstallments, applyToAllRecurrences });
      showToast({ message: "Lançamento excluído.", type: "success" });
      loadPage(1, { reset: true });
    } catch (error) {
      showToast({ message: error.message || "Não foi possível excluir o lançamento.", type: "error" });
    }
  }

  return page;
}
