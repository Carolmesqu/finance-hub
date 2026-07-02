/**
 * Tabela de rotas da aplicação.
 *
 * `protected: true` exige `state.user` preenchido; `requiresWorkspace: true`
 * exige adicionalmente `state.workspace` preenchido (ver router.js). Novas
 * páginas devem ser registradas aqui conforme forem criadas nas próximas
 * sprints (Dashboard, Receitas, Despesas, etc.).
 */

import { renderLoginPage } from "../pages/LoginPage.js";
import { renderWorkspacesPage } from "../pages/WorkspacesPage.js";
import { renderWorkspaceHomePage } from "../pages/WorkspaceHomePage.js";
import { renderDashboardPage } from "../pages/DashboardPage.js";
import { renderIncomesPage } from "../pages/IncomesPage.js";
import { renderExpensesPage } from "../pages/ExpensesPage.js";
import { renderCardsPage } from "../pages/CardsPage.js";
import { renderReportsPage } from "../pages/ReportsPage.js";

export const routes = [
  { path: "/login", render: renderLoginPage, protected: false },
  { path: "/workspaces", render: renderWorkspacesPage, protected: true },
  { path: "/workspace", render: renderWorkspaceHomePage, protected: true, requiresWorkspace: true },
  { path: "/dashboard", render: renderDashboardPage, protected: true, requiresWorkspace: true },
  { path: "/incomes", render: renderIncomesPage, protected: true, requiresWorkspace: true },
  { path: "/expenses", render: renderExpensesPage, protected: true, requiresWorkspace: true },
  { path: "/cards", render: renderCardsPage, protected: true, requiresWorkspace: true },
  { path: "/reports", render: renderReportsPage, protected: true, requiresWorkspace: true },
];
