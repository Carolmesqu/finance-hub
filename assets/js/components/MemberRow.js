import { createElement } from "../utils/dom.js";
import { createRoleBadge } from "./Badge.js";
import { createSelect } from "./Select.js";
import { createButton } from "./Button.js";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Visualizador" },
];

/**
 * Linha de membro reutilizável na gestão de membros do Workspace
 * (docs/screens.md § Configurações).
 *
 * @param {{
 *   member: object,
 *   canManage: boolean,
 *   isCurrentUser: boolean,
 *   onRoleChange: (role: string) => void,
 *   onRemove: () => void,
 * }} options
 */
export function createMemberRow({ member, canManage, isCurrentUser, onRoleChange, onRemove }) {
  const infoBlock = createElement("div", { className: "member-row__info" }, [
    createElement("span", { className: "member-row__name", text: member.name + (isCurrentUser ? " (você)" : "") }),
    createElement("span", { className: "member-row__email", text: member.email }),
  ]);

  const controls = [];

  if (canManage && !isCurrentUser) {
    const { element: roleSelectEl, select } = createSelect({
      label: "Papel",
      options: ROLE_OPTIONS,
      value: member.role,
    });
    roleSelectEl.classList.add("member-row__role-select");
    select.addEventListener("change", () => onRoleChange(select.value));

    controls.push(roleSelectEl);
    controls.push(createButton({ label: "Remover", variant: "danger", size: "sm", onClick: onRemove }));
  } else {
    controls.push(createRoleBadge(member.role));
  }

  return createElement("div", { className: "member-row" }, [
    infoBlock,
    createElement("div", { className: "member-row__controls" }, controls),
  ]);
}
