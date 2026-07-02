/**
 * dashboardService — única camada que fala com o módulo "dashboard" da API
 * (docs/API.md § Módulo dashboard).
 */

import { callApi } from "./apiClient.js";

export function getDashboardSummary({ month, year }) {
  return callApi("dashboard.getSummary", { month, year });
}
