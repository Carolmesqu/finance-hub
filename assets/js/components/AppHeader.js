import { createElement } from "../utils/dom.js";
import { createButton } from "./Button.js";
import { showToast } from "./Toast.js";
import { logout } from "../services/authService.js";
import { getState, setUser, setWorkspace } from "../state/store.js";
import { navigate } from "../router/router.js";

/**
 * Cabeçalho reutilizável de todas as telas autenticadas (docs/UI_GUIDELINES.md).
 * Evolui nas próximas sprints para incluir busca/notificações; por ora traz
 * o essencial: identidade do contexto atual, avatar do usuário e ações
 * globais (trocar Workspace, sair, navegar para Dashboard/Membros/Receitas).
 *
 * @param {{ title?: string, showBackToWorkspaces?: boolean, showMembersLink?: boolean, showDashboardLink?: boolean, showIncomesLink?: boolean, showExpensesLink?: boolean, showCardsLink?: boolean, showReportsLink?: boolean }} options
 */
export function createAppHeader({
  title = "FinanceHub",
  showBackToWorkspaces = false,
  showMembersLink = false,
  showDashboardLink = false,
  showIncomesLink = false,
  showExpensesLink = false,
  showCardsLink = false,
  showReportsLink = false,
} = {}) {
  const { user } = getState();

  const actions = [];

  if (showDashboardLink) {
    actions.push(
      createButton({
        label: "Dashboard",
        variant: "ghost",
        size: "sm",
        onClick: () => navigate("/dashboard"),
      })
    );
  }

  if (showIncomesLink) {
    actions.push(
      createButton({
        label: "Receitas",
        variant: "ghost",
        size: "sm",
        onClick: () => navigate("/incomes"),
      })
    );
  }

  if (showExpensesLink) {
    actions.push(
      createButton({
        label: "Despesas",
        variant: "ghost",
        size: "sm",
        onClick: () => navigate("/expenses"),
      })
    );
  }

  if (showCardsLink) {
    actions.push(
      createButton({
        label: "Cartões",
        variant: "ghost",
        size: "sm",
        onClick: () => navigate("/cards"),
      })
    );
  }

  if (showReportsLink) {
    actions.push(
      createButton({
        label: "Relatórios",
        variant: "ghost",
        size: "sm",
        onClick: () => navigate("/reports"),
      })
    );
  }

  if (showMembersLink) {
    actions.push(
      createButton({
        label: "Membros",
        variant: "ghost",
        size: "sm",
        onClick: () => navigate("/workspace"),
      })
    );
  }

  if (showBackToWorkspaces) {
    actions.push(
      createButton({
        label: "Trocar Workspace",
        variant: "ghost",
        size: "sm",
        onClick: () => {
          setWorkspace(null);
          navigate("/workspaces");
        },
      })
    );
  }

  actions.push(
    createButton({
      label: "Sair",
      variant: "ghost",
      size: "sm",
      onClick: handleLogout,
    })
  );

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      setWorkspace(null);
      navigate("/login");
    } catch (error) {
      showToast({ message: "Não foi possível sair. Tente novamente.", type: "error" });
    }
  }

  return createElement("header", { className: "app-header" }, [
    createElement("div", { className: "app-header__brand" }, [
      createElement("span", { className: "app-header__title", text: title }),
    ]),
    createElement("div", { className: "app-header__user" }, [
      createAvatar(user),
      createElement("div", { className: "app-header__actions" }, actions),
    ]),
  ]);
}

function createAvatar(user) {
  if (user?.photoURL) {
    return createElement("img", {
      className: "app-header__avatar",
      attrs: { src: user.photoURL, alt: user.name || "Usuário", referrerpolicy: "no-referrer" },
    });
  }
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  return createElement("div", { className: "app-header__avatar app-header__avatar--placeholder", text: initial });
}
