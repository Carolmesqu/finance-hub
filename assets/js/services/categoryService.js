/**
 * categoryService — única camada que fala com o módulo "category" da API
 * (docs/API.md § Módulo category).
 */

import { callApi } from "./apiClient.js";

export function listCategories({ type } = {}) {
  return callApi("category.list", { type });
}
