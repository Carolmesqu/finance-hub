/**
 * accountService — única camada que fala com o módulo "account" da API
 * (docs/API.md § Módulo account).
 */

import { callApi } from "./apiClient.js";

export function listAccounts({ includeArchived = false } = {}) {
  return callApi("account.list", { includeArchived });
}

export function createAccount({ name, type, institution, balance, color, icon, includeInTotal }) {
  return callApi("account.create", { name, type, institution, balance, color, icon, includeInTotal });
}

export function updateAccount({ accountId, name, type, institution, color, icon, includeInTotal }) {
  return callApi("account.update", { accountId, name, type, institution, color, icon, includeInTotal });
}

export function archiveAccount(accountId, { force = false } = {}) {
  return callApi("account.archive", { accountId, force });
}
