/**
 * Bootstrap da aplicação.
 *
 * Ordem de inicialização é intencional:
 * 1. Aplica o tema salvo antes de qualquer pintura, evitando "flash" de tema errado.
 * 2. Renderiza uma tela de carregamento enquanto o Firebase resolve o estado de sessão.
 * 3. Só inicializa o Router após a primeira resposta do Firebase — assim a guarda de
 *    rota (router.js) já sabe, na primeira renderização, se existe um usuário logado
 *    ou não, restaurando a sessão automaticamente sem piscar a tela de Login.
 */

import { initRouter } from "./router/router.js";
import { routes } from "./router/routes.js";
import { observeAuthState } from "./services/authService.js";
import { setUser, applyStoredTheme, setDeferredInstallPrompt } from "./state/store.js";
import { createSpinner } from "./components/Spinner.js";
import { createElement } from "./utils/dom.js";

applyStoredTheme();

const appRoot = document.getElementById("app");
renderBootScreen(appRoot);

// Captura prompt de instalação PWA
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  setDeferredInstallPrompt(e);
});

// Detecta quando o App é instalado com sucesso
window.addEventListener("appinstalled", () => {
  setDeferredInstallPrompt(null);
  console.log("PWA instalado com sucesso!");
});

let routerStarted = false;

observeAuthState((user) => {
  setUser(user);

  if (!routerStarted) {
    routerStarted = true;
    initRouter(routes, { container: appRoot, fallbackAuthenticated: "/workspaces", fallbackPublic: "/login" });
  }
});

function renderBootScreen(root) {
  root.replaceChildren(createElement("div", { className: "boot-screen" }, [createSpinner({ size: "lg" })]));
}

// Registro do Service Worker (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("Service Worker registrado:", reg.scope))
      .catch((err) => console.error("Falha ao registrar Service Worker:", err));
  });
}

// Monitor de Conexão Offline
function updateOnlineStatus() {
  const offlineBannerId = "offline-banner";
  let banner = document.getElementById(offlineBannerId);

  if (!navigator.onLine) {
    if (!banner) {
      banner = createElement("div", {
        attrs: { id: offlineBannerId },
        className: "offline-banner",
        text: "Você está trabalhando em modo offline. Recursos de escrita e atualização de dados podem estar indisponíveis.",
      });
      document.body.appendChild(banner);
    }
  } else {
    if (banner) {
      banner.remove();
    }
  }
}

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();
