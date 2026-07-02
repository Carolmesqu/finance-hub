/**
 * transactionService — única camada que fala com o módulo "transaction" da
 * API (docs/API.md § Módulo transaction). Usado tanto por Receitas (Sprint 4)
 * quanto por Despesas (Sprint 5).
 */

import { callApi } from "./apiClient.js";

export function listTransactions(filters = {}) {
  return callApi("transaction.list", filters);
}

export function getTransaction(transactionId) {
  return callApi("transaction.get", { transactionId });
}

export function createTransaction(payload) {
  return callApi("transaction.create", payload);
}

export function updateTransaction(payload) {
  return callApi("transaction.update", payload);
}

export function deleteTransaction(transactionId, { applyToAllInstallments, applyToAllRecurrences } = {}) {
  return callApi("transaction.delete", { transactionId, applyToAllInstallments, applyToAllRecurrences });
}
