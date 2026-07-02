/**
 * installmentService — única camada que fala com o módulo "installment" da
 * API (docs/API.md § Módulo installment).
 */

import { callApi } from "./apiClient.js";

export function createInstallmentPlan(payload) {
  return callApi("installment.create", payload);
}

export function getInstallmentPlan(installmentId) {
  return callApi("installment.get", { installmentId });
}

export function cancelInstallmentPlan(installmentId) {
  return callApi("installment.cancel", { installmentId });
}
