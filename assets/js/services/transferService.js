/**
 * transferService — camada de API para transferências entre contas
 * (docs/API.md § Módulo transfer).
 */

import { callApi } from "./apiClient.js";

export function listTransfers() {
  return callApi("transfer.list");
}

export function createTransfer(payload) {
  return callApi("transfer.create", payload);
}

export function deleteTransfer(transferId) {
  return callApi("transfer.delete", { transferId });
}
