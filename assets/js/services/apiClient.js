/**
 * Cliente HTTP genérico para o backend (Google Apps Script).
 *
 * Implementa o envelope de requisição/resposta definido em docs/API.md.
 * Nenhum service deve usar fetch() diretamente — sempre passar por callApi().
 */

import { APPS_SCRIPT_URL } from "../config/appConfig.js";
import { getIdToken } from "./authService.js";
import { getState } from "../state/store.js";

export class ApiError extends Error {
  constructor(code, message, field) {
    super(message || "Erro inesperado ao comunicar com o servidor.");
    this.code = code;
    this.field = field || null;
  }
}

/**
 * @param {string} action Ex.: "workspace.create"
 * @param {object} payload Corpo específico da ação (ver docs/API.md)
 * @param {{ requireWorkspace?: boolean }} options `requireWorkspace` (default true)
 *   impede a chamada de prosseguir sem um Workspace ativo em state.workspace.
 */
export async function callApi(action, payload = {}, { requireWorkspace = true } = {}) {
  const { workspace } = getState();

  if (requireWorkspace && !workspace) {
    throw new ApiError("WORKSPACE_NOT_FOUND", "Nenhum Workspace ativo selecionado.");
  }

  const idToken = await getIdToken();
  if (!idToken) {
    throw new ApiError("AUTH_INVALID_TOKEN", "Sessão expirada. Faça login novamente.");
  }

  const requestBody = {
    action,
    idToken,
    workspaceId: workspace ? workspace.id : "",
    payload,
  };

  let rawResponse;
  try {
    rawResponse = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      // "text/plain" evita o preflight CORS (OPTIONS), que o Web App do Apps
      // Script não sabe responder. O corpo continua sendo JSON válido — só o
      // cabeçalho HTTP muda, e o backend faz JSON.parse manualmente.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    throw new ApiError("NETWORK_ERROR", "Falha de conexão com o servidor. Verifique sua internet.");
  }

  let result;
  try {
    result = await rawResponse.json();
  } catch (parseError) {
    throw new ApiError("INTERNAL_ERROR", "Resposta inválida do servidor.");
  }

  if (!result.success) {
    const error = result.error || {};
    throw new ApiError(error.code, error.message, error.field);
  }

  return result.data;
}
