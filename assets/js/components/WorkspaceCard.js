import { createElement } from "../utils/dom.js";
import { createRoleBadge } from "./Badge.js";

/**
 * Card de Workspace reutilizável, usado na tela de Seleção de Workspace
 * (docs/screens.md § Seleção de Workspace).
 *
 * @param {{ workspace: object, onSelect: (workspace: object) => void }} options
 */
export function createWorkspaceCard({ workspace, onSelect }) {
  const initial = workspace.name.trim().charAt(0).toUpperCase();

  return createElement(
    "button",
    {
      className: "workspace-card",
      attrs: { type: "button" },
      on: { click: () => onSelect(workspace) },
    },
    [
      createElement("div", { className: "workspace-card__icon", text: initial }),
      createElement("div", { className: "workspace-card__info" }, [
        createElement("span", { className: "workspace-card__name", text: workspace.name }),
        createElement("span", { className: "workspace-card__currency", text: workspace.currency }),
      ]),
      createRoleBadge(workspace.role),
    ]
  );
}
