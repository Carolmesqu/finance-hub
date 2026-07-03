/**
 * Router SPA (PROJECT.md § Router).
 *
 * Toda a navegação ocorre dentro do mesmo index.html via Hash Routing —
 * isso evita erros 404 ao atualizar a página (F5) em servidores estáticos.
 * Aplica a guarda de autenticação em toda troca de rota.
 */

import { getState, setCurrentPage } from "../state/store.js";

const routeTable = [];
let containerEl = null;
let fallbackAuthenticatedPath = "/login";
let fallbackPublicPath = "/login";

/**
 * @param {Array<{ path: string, render: () => Node, protected?: boolean, requiresWorkspace?: boolean }>} routes
 * @param {{ container?: HTMLElement, fallbackAuthenticated?: string, fallbackPublic?: string }} options
 *   `fallbackAuthenticated` é para onde o usuário logado é enviado quando a
 *   rota digitada não existe (ou quando `requiresWorkspace` falha).
 */
export function initRouter(routes, options = {}) {
  const { container = document.getElementById("app"), fallbackAuthenticated = "/", fallbackPublic = "/login" } = options;

  containerEl = container;
  fallbackAuthenticatedPath = fallbackAuthenticated;
  fallbackPublicPath = fallbackPublic;
  routeTable.length = 0;
  routeTable.push(...routes);

  document.addEventListener("click", handleLinkClick);
  window.addEventListener("hashchange", renderCurrentRoute);

  // Se não houver hash inicial, define #/ para iniciar a navegação
  if (!window.location.hash) {
    window.location.hash = "#/";
  } else {
    renderCurrentRoute();
  }
}

export function navigate(path, { replace = false } = {}) {
  const targetHash = "#" + path;
  if (window.location.hash === targetHash) {
    renderCurrentRoute();
    return;
  }

  if (replace) {
    const url = new URL(window.location.href);
    url.hash = targetHash;
    window.history.replaceState({}, "", url.href);
    renderCurrentRoute();
  } else {
    window.location.hash = targetHash;
  }
}

function handleLinkClick(event) {
  const link = event.target.closest("[data-link]");
  if (!link) {
    return;
  }

  const destination = new URL(link.href, window.location.origin);
  if (destination.origin !== window.location.origin) {
    return;
  }

  event.preventDefault();
  navigate(destination.pathname);
}

function findRoute(pathname) {
  return routeTable.find((route) => route.path === pathname);
}

function renderCurrentRoute() {
  const { user, workspace } = getState();
  const hash = window.location.hash || "#/";
  const pathname = hash.replace(/^#/, "") || "/";
  let route = findRoute(pathname);

  if (!route) {
    route = findRoute(user ? fallbackAuthenticatedPath : fallbackPublicPath);
    const targetHash = "#" + route.path;
    window.history.replaceState({}, "", targetHash);
  }

  if (route.protected && !user) {
    route = findRoute(fallbackPublicPath);
    const targetHash = "#" + route.path;
    window.history.replaceState({}, "", targetHash);
  } else if (!route.protected && route.path === fallbackPublicPath && user) {
    route = findRoute(fallbackAuthenticatedPath);
    const targetHash = "#" + route.path;
    window.history.replaceState({}, "", targetHash);
  } else if (route.requiresWorkspace && !workspace) {
    route = findRoute(fallbackAuthenticatedPath);
    const targetHash = "#" + route.path;
    window.history.replaceState({}, "", targetHash);
  }

  setCurrentPage(route.path);
  containerEl.replaceChildren(route.render());
}
