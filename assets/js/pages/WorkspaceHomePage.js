import { createElement } from "../utils/dom.js";
import { createAppHeader } from "../components/AppHeader.js";
import { createButton, setButtonLoading } from "../components/Button.js";
import { createSpinner } from "../components/Spinner.js";
import { createInput } from "../components/Input.js";
import { createSelect } from "../components/Select.js";
import { createMemberRow } from "../components/MemberRow.js";
import { openModal, closeModal } from "../components/Modal.js";
import { confirmDialog } from "../components/Dialog.js";
import { showToast } from "../components/Toast.js";
import { getState } from "../state/store.js";
import { listMembers, inviteMember, revokeInvite, updateMemberRole, removeMember } from "../services/workspaceService.js";

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Visualizador" },
];

const ROLE_LABELS = { admin: "Administrador", editor: "Editor", viewer: "Visualizador" };

/**
 * Tela de gestão de Membros/Convites do Workspace ativo (docs/screens.md §
 * Configurações § Membros). Até a Sprint 3, esta era também a "tela inicial
 * pós-seleção de Workspace"; agora esse papel passa para o Dashboard
 * (renderDashboardPage), e esta tela fica acessível pelo link "Membros" no
 * AppHeader.
 */
export function renderWorkspaceHomePage() {
  const { user, workspace } = getState();
  const isAdmin = workspace.role === "admin";

  const membersListEl = createElement("div", { className: "workspace-home__members" }, [createSpinner({ size: "lg" })]);
  const invitesListEl = createElement("div", { className: "workspace-home__pending-invites" });

  const inviteButton = createButton({ label: "Convidar Membro", variant: "primary", onClick: openInviteModal });
  if (!isAdmin) {
    inviteButton.hidden = true;
  }

  const page = createElement("main", { className: "workspace-home" }, [
    createAppHeader({ title: workspace.name, showDashboardLink: true, showBackToWorkspaces: true }),
    createElement("section", { className: "workspace-home__summary" }, [
      createElement("h1", { className: "workspace-home__name", text: workspace.name }),
      createElement("p", {
        className: "workspace-home__meta",
        text: `Moeda: ${workspace.currency} · Seu papel: ${ROLE_LABELS[workspace.role] || workspace.role}`,
      }),
    ]),
    createElement("section", { className: "workspace-home__section" }, [
      createElement("div", { className: "workspace-home__section-header" }, [
        createElement("h2", { className: "workspace-home__section-title", text: "Membros" }),
        inviteButton,
      ]),
      membersListEl,
    ]),
    invitesListEl,
  ]);

  loadMembers();

  async function loadMembers() {
    try {
      const { members, invites } = await listMembers();
      renderMembers(members);
      renderPendingInvites(invites);
    } catch (error) {
      membersListEl.replaceChildren();
      showToast({ message: error.message || "Não foi possível carregar os membros.", type: "error" });
    }
  }

  function renderMembers(members) {
    membersListEl.replaceChildren(
      ...members.map((member) =>
        createMemberRow({
          member,
          canManage: isAdmin,
          isCurrentUser: member.userId === user.id,
          onRoleChange: (role) => handleRoleChange(member, role),
          onRemove: () => handleRemove(member),
        })
      )
    );
  }

  function renderPendingInvites(invites) {
    if (!isAdmin || invites.length === 0) {
      invitesListEl.replaceChildren();
      return;
    }

    invitesListEl.replaceChildren(
      createElement("h2", { className: "workspace-home__section-title", text: "Convites pendentes" }),
      ...invites.map((invite) => {
        const revokeButton = createButton({
          label: "Cancelar convite",
          variant: "danger",
          size: "sm",
          onClick: async () => {
            setButtonLoading(revokeButton, true);
            try {
              await revokeInvite(invite.id);
              showToast({ message: "Convite cancelado.", type: "info" });
              loadMembers();
            } catch (error) {
              showToast({ message: error.message || "Não foi possível cancelar o convite.", type: "error" });
              setButtonLoading(revokeButton, false);
            }
          },
        });

        return createElement("div", { className: "invite-row" }, [
          createElement("div", { className: "invite-row__info" }, [
            createElement("span", { className: "invite-row__workspace", text: invite.email }),
            createElement("span", { className: "invite-row__role", text: `Convidado como ${ROLE_LABELS[invite.role] || invite.role}` }),
          ]),
          createElement("div", { className: "invite-row__actions" }, [revokeButton]),
        ]);
      })
    );
  }

  async function handleRoleChange(member, role) {
    try {
      await updateMemberRole({ memberId: member.id, role });
      showToast({ message: "Papel atualizado com sucesso.", type: "success" });
      loadMembers();
    } catch (error) {
      showToast({ message: error.message || "Não foi possível atualizar o papel.", type: "error" });
      loadMembers();
    }
  }

  async function handleRemove(member) {
    const confirmed = await confirmDialog({
      title: "Remover membro",
      message: `Tem certeza que deseja remover ${member.name} deste Workspace?`,
      confirmLabel: "Remover",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await removeMember(member.id);
      showToast({ message: "Membro removido com sucesso.", type: "success" });
      loadMembers();
    } catch (error) {
      showToast({ message: error.message || "Não foi possível remover o membro.", type: "error" });
    }
  }

  function openInviteModal() {
    const emailInput = createInput({ label: "E-mail", type: "email", placeholder: "nome@exemplo.com", required: true });
    const roleSelect = createSelect({ label: "Papel", options: ROLE_OPTIONS, value: "editor" });
    const submitButton = createButton({ label: "Enviar convite", variant: "primary", fullWidth: true, onClick: handleSubmit });

    const form = createElement("div", { className: "workspace-form" }, [emailInput.element, roleSelect.element, submitButton]);

    openModal({ title: "Convidar Membro", content: form });

    async function handleSubmit() {
      const email = emailInput.input.value.trim();
      if (!email.includes("@")) {
        emailInput.setError("Informe um e-mail válido.");
        return;
      }
      emailInput.setError();

      setButtonLoading(submitButton, true);
      try {
        await inviteMember({ email, role: roleSelect.select.value });
        closeModal();
        showToast({ message: `Convite enviado para ${email}.`, type: "success" });
        loadMembers();
      } catch (error) {
        showToast({ message: error.message || "Não foi possível enviar o convite.", type: "error" });
        setButtonLoading(submitButton, false);
      }
    }
  }

  return page;
}
