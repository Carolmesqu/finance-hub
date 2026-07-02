import { createElement } from "../utils/dom.js";
import { createAppHeader } from "../components/AppHeader.js";
import { createWorkspaceCard } from "../components/WorkspaceCard.js";
import { createButton, setButtonLoading } from "../components/Button.js";
import { createSpinner } from "../components/Spinner.js";
import { createInput } from "../components/Input.js";
import { createSelect } from "../components/Select.js";
import { openModal, closeModal } from "../components/Modal.js";
import { showToast } from "../components/Toast.js";
import { setWorkspace } from "../state/store.js";
import { navigate } from "../router/router.js";
import { listWorkspaces, createWorkspace, listMyInvites, acceptInvite, declineInvite } from "../services/workspaceService.js";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "Real (BRL)" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
];

/**
 * Tela de Seleção de Workspace (docs/screens.md § Seleção de Workspace).
 * Landing page do usuário autenticado sem Workspace ativo: lista Workspaces
 * dos quais participa, convites pendentes e permite criar um novo.
 */
export function renderWorkspacesPage() {
  const workspacesListEl = createElement("div", { className: "workspaces-page__list" }, [createSpinner({ size: "lg" })]);
  const invitesSectionEl = createElement("section", { className: "workspaces-page__invites" });
  invitesSectionEl.hidden = true;

  const createButtonEl = createButton({ label: "+ Criar Workspace", variant: "primary", onClick: openCreateWorkspaceModal });

  const page = createElement("main", { className: "workspaces-page" }, [
    createAppHeader({ title: "FinanceHub" }),
    createElement("div", { className: "workspaces-page__body" }, [
      createElement("div", { className: "workspaces-page__heading" }, [
        createElement("h1", { className: "workspaces-page__title", text: "Seus Workspaces" }),
        createButtonEl,
      ]),
      invitesSectionEl,
      workspacesListEl,
    ]),
  ]);

  loadData();

  async function loadData() {
    try {
      const [workspaces, invites] = await Promise.all([listWorkspaces(), listMyInvites()]);
      renderWorkspaceList(workspaces);
      renderInvites(invites);
    } catch (error) {
      workspacesListEl.replaceChildren();
      showToast({ message: error.message || "Não foi possível carregar seus Workspaces.", type: "error" });
    }
  }

  function renderWorkspaceList(workspaces) {
    if (workspaces.length === 0) {
      workspacesListEl.replaceChildren(
        createElement("p", {
          className: "workspaces-page__empty",
          text: "Você ainda não participa de nenhum Workspace. Crie o primeiro para começar.",
        })
      );
      return;
    }

    workspacesListEl.replaceChildren(
      ...workspaces.map((workspace) =>
        createWorkspaceCard({
          workspace,
          onSelect: (selected) => {
            setWorkspace(selected);
            navigate("/dashboard");
          },
        })
      )
    );
  }

  function renderInvites(invites) {
    if (invites.length === 0) {
      invitesSectionEl.hidden = true;
      return;
    }

    invitesSectionEl.hidden = false;
    invitesSectionEl.replaceChildren(
      createElement("h2", { className: "workspaces-page__subtitle", text: "Convites pendentes" }),
      ...invites.map((invite) => renderInviteRow(invite))
    );
  }

  function renderInviteRow(invite) {
    const acceptButton = createButton({
      label: "Aceitar",
      variant: "primary",
      size: "sm",
      onClick: async () => {
        setButtonLoading(acceptButton, true);
        try {
          const workspace = await acceptInvite(invite.token);
          showToast({ message: `Você agora faz parte do Workspace "${workspace.name}".`, type: "success" });
          setWorkspace(workspace);
          navigate("/dashboard");
        } catch (error) {
          showToast({ message: error.message || "Não foi possível aceitar o convite.", type: "error" });
          setButtonLoading(acceptButton, false);
        }
      },
    });

    const declineButton = createButton({
      label: "Recusar",
      variant: "ghost",
      size: "sm",
      onClick: async () => {
        setButtonLoading(declineButton, true);
        try {
          await declineInvite(invite.token);
          showToast({ message: "Convite recusado.", type: "info" });
          loadData();
        } catch (error) {
          showToast({ message: error.message || "Não foi possível recusar o convite.", type: "error" });
          setButtonLoading(declineButton, false);
        }
      },
    });

    return createElement("div", { className: "invite-row" }, [
      createElement("div", { className: "invite-row__info" }, [
        createElement("span", { className: "invite-row__workspace", text: invite.workspaceName }),
        createElement("span", { className: "invite-row__role", text: `Convite como ${invite.role}` }),
      ]),
      createElement("div", { className: "invite-row__actions" }, [declineButton, acceptButton]),
    ]);
  }

  function openCreateWorkspaceModal() {
    const nameInput = createInput({ label: "Nome do Workspace", placeholder: "Ex.: Casa, Empresa, Viagem", required: true });
    const currencySelect = createSelect({ label: "Moeda", options: CURRENCY_OPTIONS, value: "BRL" });
    const submitButton = createButton({ label: "Criar Workspace", variant: "primary", fullWidth: true, onClick: handleSubmit });

    const form = createElement("div", { className: "workspace-form" }, [nameInput.element, currencySelect.element, submitButton]);

    openModal({ title: "Criar Workspace", content: form });

    async function handleSubmit() {
      const name = nameInput.input.value.trim();
      if (name.length < 2) {
        nameInput.setError("Informe ao menos 2 caracteres.");
        return;
      }
      nameInput.setError();

      setButtonLoading(submitButton, true);
      try {
        const workspace = await createWorkspace({ name, currency: currencySelect.select.value });
        closeModal();
        showToast({ message: `Workspace "${workspace.name}" criado com sucesso.`, type: "success" });
        setWorkspace(workspace);
        navigate("/dashboard");
      } catch (error) {
        showToast({ message: error.message || "Não foi possível criar o Workspace.", type: "error" });
        setButtonLoading(submitButton, false);
      }
    }
  }

  return page;
}
