/**
 * Router SPA (PROJECT.md § Router).
 *
 * Toda a navegação ocorre dentro do mesmo index.html via History API — nunca
 * múltiplos arquivos HTML. Aplica a guarda de autenticação em toda troca de
 * rota (nunca confiar apenas na checagem feita no momento do login).
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
  window.addEventListener("popstate", renderCurrentRoute);

  renderCurrentRoute();
}

export function navigate(path, { replace = false } = {}) {
  if (window.location.pathname === path) {
    renderCurrentRoute();
    return;
  }

  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }

  renderCurrentRoute();
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
  const pathname = window.location.pathname || "/";
  let route = findRoute(pathname);

  if (!route) {
    route = findRoute(user ? fallbackAuthenticatedPath : fallbackPublicPath);
    window.history.replaceState({}, "", route.path);
  }

  if (route.protected && !user) {
    route = findRoute(fallbackPublicPath);
    window.history.replaceState({}, "", route.path);
  } else if (!route.protected && route.path === fallbackPublicPath && user) {
    route = findRoute(fallbackAuthenticatedPath);
    window.history.replaceState({}, "", route.path);
  } else if (route.requiresWorkspace && !workspace) {
    route = findRoute(fallbackAuthenticatedPath);
    window.history.replaceState({}, "", route.path);
  }

  setCurrentPage(route.path);
  containerEl.replaceChildren(route.render());
}
