import { createElement } from "../utils/dom.js";

const ROLE_LABELS = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

/**
 * Badge de papel (Admin/Editor/Visualizador), reutilizado em toda a UI de
 * Workspace/Membros (docs/UI_GUIDELINES.md § 5).
 */
export function createRoleBadge(role) {
  return createElement("span", {
    className: `badge badge--${role}`,
    text: ROLE_LABELS[role] || role,
  });
}

/**
 * Badge genérico para outros usos (status, tags).
 */
export function createBadge({ label, variant = "neutral" } = {}) {
  return createElement("span", { className: `badge badge--${variant}`, text: label });
}

export { ROLE_LABELS };
