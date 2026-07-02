/**
 * cardService — única camada que fala com o módulo "card" da API
 * (docs/API.md § Módulo card).
 */

import { callApi } from "./apiClient.js";

export function listCards({ includeArchived = false } = {}) {
  return callApi("card.list", { includeArchived });
}

export function createCard(payload) {
  return callApi("card.create", payload);
}

export function updateCard(payload) {
  return callApi("card.update", payload);
}

export function archiveCard(cardId, { force = false } = {}) {
  return callApi("card.archive", { cardId, force });
}

export function getCardSummary(cardId) {
  return callApi("card.getSummary", { cardId });
}
