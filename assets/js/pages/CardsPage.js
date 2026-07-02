import { createElement } from "../utils/dom.js";
import { createAppHeader } from "../components/AppHeader.js";
import { createSpinner } from "../components/Spinner.js";
import { createButton } from "../components/Button.js";
import { showToast } from "../components/Toast.js";
import { openCardFormModal } from "../components/CardFormModal.js";
import { openCardDetailModal } from "../components/CardDetailModal.js";
import { listCards } from "../services/cardService.js";
import { listAccounts } from "../services/accountService.js";
import { listCategories } from "../services/categoryService.js";
import { formatCurrency } from "../utils/format.js";

/**
 * Tela de Cartões (docs/screens.md § Cartões (Lista)).
 */
export function renderCardsPage() {
  let cards = [];
  let accounts = [];
  let categories = [];

  const listEl = createElement("div", { className: "cards-page__list" }, [createSpinner({ size: "lg" })]);
  const newCardButton = createButton({ label: "+ Novo Cartão", variant: "primary", onClick: openNewCardModal });

  const page = createElement("main", { className: "cards-page" }, [
    createAppHeader({ title: "Cartões", showDashboardLink: true, showExpensesLink: true, showReportsLink: true }),
    createElement("div", { className: "cards-page__body" }, [
      createElement("div", { className: "cards-page__heading" }, [
        createElement("h1", { className: "cards-page__title", text: "Cartões" }),
        newCardButton,
      ]),
      listEl,
    ]),
  ]);

  bootstrap();

  async function bootstrap() {
    listEl.replaceChildren(createSpinner({ size: "lg" }));
    try {
      [cards, accounts, categories] = await Promise.all([listCards(), listAccounts(), listCategories({ type: "expense" })]);
      renderList();
    } catch (error) {
      listEl.replaceChildren(
        createElement("p", { className: "cards-page__empty", text: error.message || "Não foi possível carregar os cartões." })
      );
      showToast({ message: error.message || "Não foi possível carregar os cartões.", type: "error" });
    }
  }

  async function refreshCards() {
    cards = await listCards();
    return cards;
  }

  function renderList() {
    if (cards.length === 0) {
      listEl.replaceChildren(
        createElement("p", {
          className: "cards-page__empty",
          text: 'Nenhum cartão cadastrado ainda. Clique em "+ Novo Cartão" para começar.',
        })
      );
      return;
    }

    listEl.replaceChildren(
      createElement(
        "div",
        { className: "cards-page__grid" },
        cards.map((card) =>
          createElement(
            "button",
            {
              className: "card-tile",
              attrs: { type: "button" },
              on: { click: () => openCardDetail(card) },
            },
            [
              createElement("span", { className: "card-tile__name", text: card.name }),
              createElement("span", { className: "card-tile__limit", text: `Limite: ${formatCurrency(card.limit)}` }),
              createElement("span", {
                className: "card-tile__due",
                text: `Fecha dia ${card.closingDay} · Vence dia ${card.dueDay}`,
              }),
            ]
          )
        )
      )
    );
  }

  function openNewCardModal() {
    openCardFormModal({
      onSaved: async () => {
        cards = await refreshCards();
        renderList();
      },
    });
  }

  function openCardDetail(card) {
    openCardDetailModal({
      card,
      accounts,
      categories,
      cards,
      onCardsChanged: refreshCards,
      onChanged: async () => {
        cards = await refreshCards();
        renderList();
      },
    });
  }

  return page;
}
