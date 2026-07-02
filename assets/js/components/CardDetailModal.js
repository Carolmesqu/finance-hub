import { createElement } from "../utils/dom.js";
import { createSpinner } from "./Spinner.js";
import { createButton } from "./Button.js";
import { createTransactionRow } from "./TransactionRow.js";
import { openModal, closeModal } from "./Modal.js";
import { confirmDialog } from "./Dialog.js";
import { showToast } from "./Toast.js";
import { openCardFormModal } from "./CardFormModal.js";
import { openExpenseFormModal } from "./ExpenseFormModal.js";
import { getCardSummary, archiveCard } from "../services/cardService.js";
import { formatCurrency, formatDateShort } from "../utils/format.js";

/**
 * Modal de Detalhes do Cartão (docs/screens.md § Detalhes do Cartão).
 * Mostra Resumo (limite/usado/disponível) + Fatura Atual + Próxima Fatura.
 * As abas "Parcelamentos" e "Histórico" ficam para a Sprint 7 (dependem da
 * entidade Installments, que ainda não tem tela de cadastro).
 *
 * @param {{
 *   card: object,
 *   accounts: object[],
 *   categories: object[],
 *   cards: object[],
 *   onCardsChanged: () => Promise<object[]>,
 *   onChanged: () => void,
 * }} options
 */
export function openCardDetailModal({ card, accounts, categories, cards, onCardsChanged, onChanged }) {
  const content = createElement("div", { className: "card-detail" }, [createSpinner({ size: "lg" })]);
  openModal({ title: card.name, content });

  load();

  async function load() {
    content.replaceChildren(createSpinner({ size: "lg" }));
    try {
      const summary = await getCardSummary(card.id);
      renderSummary(summary);
    } catch (error) {
      content.replaceChildren(
        createElement("p", { className: "card-detail__error", text: error.message || "Não foi possível carregar o cartão." })
      );
      showToast({ message: error.message || "Não foi possível carregar o cartão.", type: "error" });
    }
  }

  function renderSummary(summary) {
    const editButton = createButton({ label: "Editar", variant: "secondary", size: "sm", onClick: handleEdit });
    const archiveButton = createButton({ label: "Arquivar", variant: "danger", size: "sm", onClick: handleArchive });
    const newExpenseButton = createButton({
      label: "+ Nova Despesa neste Cartão",
      variant: "primary",
      fullWidth: true,
      onClick: handleNewExpense,
    });

    content.replaceChildren(
      createElement("div", { className: "card-detail__actions" }, [editButton, archiveButton]),
      createElement("div", { className: "card-detail__stats" }, [
        statTile("Limite", formatCurrency(summary.limit)),
        statTile("Utilizado", formatCurrency(summary.used)),
        statTile("Disponível", formatCurrency(summary.available)),
      ]),
      invoiceSection("Fatura Atual", summary.currentInvoice),
      invoiceSection("Próxima Fatura", summary.nextInvoice),
      newExpenseButton
    );

    function handleEdit() {
      openCardFormModal({
        card,
        onSaved: (updated) => {
          Object.assign(card, updated);
          onChanged();
          openCardDetailModal({ card, accounts, categories, cards, onCardsChanged, onChanged });
        },
      });
    }

    async function handleArchive() {
      const confirmed = await confirmDialog({
        title: "Arquivar Cartão",
        message: `Tem certeza que deseja arquivar o cartão "${card.name}"?`,
        confirmLabel: "Arquivar",
        variant: "danger",
      });
      if (!confirmed) return;

      try {
        await archiveCard(card.id);
        closeModal();
        showToast({ message: "Cartão arquivado.", type: "success" });
        onChanged();
      } catch (error) {
        showToast({ message: error.message || "Não foi possível arquivar o cartão.", type: "error" });
      }
    }

    function handleNewExpense() {
      openExpenseFormModal({
        accounts,
        categories,
        cards,
        presetCard: card,
        onAccountsChanged: async () => accounts,
        onCardsChanged,
        onSaved: () => {
          onChanged();
          load();
        },
      });
    }
  }

  function statTile(label, value) {
    return createElement("div", { className: "card-detail__stat" }, [
      createElement("span", { className: "card-detail__stat-label", text: label }),
      createElement("strong", { className: "card-detail__stat-value", text: value }),
    ]);
  }

  function invoiceSection(title, invoice) {
    const rows =
      invoice.transactions.length === 0
        ? [createElement("p", { className: "card-detail__empty", text: "Nenhuma compra neste período." })]
        : invoice.transactions.map((transaction) => createTransactionRow({ transaction }));

    return createElement("section", { className: "card-detail__invoice" }, [
      createElement("div", { className: "card-detail__invoice-header" }, [
        createElement("h3", { className: "card-detail__invoice-title", text: title }),
        createElement("span", {
          className: "card-detail__invoice-period",
          text: `${formatDateShort(invoice.periodStart)} a ${formatDateShort(invoice.periodEnd)}`,
        }),
      ]),
      createElement("p", {
        className: "card-detail__invoice-total",
        text: `Total: ${formatCurrency(invoice.total)} · Vencimento: ${formatDateShort(invoice.dueDate)}`,
      }),
      createElement("div", { className: "card-detail__invoice-list" }, rows),
    ]);
  }
}
