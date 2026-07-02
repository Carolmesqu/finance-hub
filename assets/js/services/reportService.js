/**
 * reportService — única camada que fala com o módulo "report" da
 * API (docs/API.md § Módulo report).
 */

import { callApi } from "./apiClient.js";

export function generateReport(payload) {
  return callApi("report.generate", payload);
}
