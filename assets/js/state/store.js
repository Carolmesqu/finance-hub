/**
 * State Global (ver PROJECT.md § State).
 *
 * Nenhuma página deve manter estado próprio quando puder utilizar este módulo.
 * O formato completo (user, workspace, theme, currentPage) já é definido aqui
 * desde a Sprint 1, mesmo que `workspace` só passe a ser preenchido na Sprint 2 —
 * isso evita retrabalho estrutural nas próximas sprints.
 */

const STORAGE_THEME_KEY = "financehub:theme";

const state = {
  user: null,
  workspace: null,
  theme: "system",
  currentPage: null,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function setUser(user) {
  state.user = user;
  notify();
}

/**
 * Define o Workspace ativo da sessão (docs/PROJECT.md § Workspaces).
 * Passar `null` limpa a seleção (ex.: ao trocar de Workspace ou fazer logout).
 */
export function setWorkspace(workspace) {
  state.workspace = workspace;
  notify();
}

export function setCurrentPage(page) {
  state.currentPage = page;
  notify();
}

export function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem(STORAGE_THEME_KEY, theme);
  applyTheme(theme);
  notify();
}

/**
 * Deve ser chamado uma única vez, no bootstrap (main.js), antes de qualquer
 * renderização, para evitar "flash" de tema incorreto.
 */
export function applyStoredTheme() {
  const stored = localStorage.getItem(STORAGE_THEME_KEY) || "system";
  state.theme = stored;
  applyTheme(stored);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    if (state.theme === "system") {
      applyTheme("system");
    }
  });
}

function applyTheme(theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}
