import { createElement } from "../utils/dom.js";
import { createInput } from "./Input.js";
import { createSelect } from "./Select.js";
import { createButton, setButtonLoading } from "./Button.js";
import { openModal, closeModal } from "./Modal.js";
import { showToast } from "./Toast.js";
import { createAccount, updateAccount } from "../services/accountService.js";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "wallet", label: "Carteira" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

/**
 * Modal de criação/edição de Conta. Reutilizado tanto pelo "+ Nova Conta"
 * inline do formulário de Receitas/Despesas quanto pela futura tela de
 * Configurações § Contas (docs/screens.md).
 *
 * @param {{ account?: object, onSaved: (account: object) => void }} options
 */
export function openAccountFormModal({ account, onSaved } = {}) {
  const isEdit = !!account;

  const nameInput = createInput({
    label: "Nome da conta",
    placeholder: "Ex.: Nubank, Carteira",
    value: account?.name || "",
    required: true,
  });
  const typeSelect = createSelect({ label: "Tipo", options: ACCOUNT_TYPE_OPTIONS, value: account?.type || "checking" });
  const balanceInput = createInput({
    label: isEdit ? "Saldo atual" : "Saldo inicial",
    type: "number",
    value: account ? String(account.balance) : "0",
  });

  if (isEdit) {
    // "balance" é sempre derivado das operações (docs/BUSINESS_RULES.md) —
    // só é editável na criação, como saldo de partida.
    balanceInput.input.disabled = true;
  }

  const submitButton = createButton({
    label: isEdit ? "Salvar alterações" : "Criar Conta",
    variant: "primary",
    fullWidth: true,
    onClick: handleSubmit,
  });

  const form = createElement("div", { className: "workspace-form" }, [
    nameInput.element,
    typeSelect.element,
    balanceInput.element,
    submitButton,
  ]);

  openModal({ title: isEdit ? "Editar Conta" : "Nova Conta", content: form });

  async function handleSubmit() {
    const name = nameInput.input.value.trim();
    if (name.length < 2) {
      nameInput.setError("Informe ao menos 2 caracteres.");
      return;
    }
    nameInput.setError();

    setButtonLoading(submitButton, true);
    try {
      const saved = isEdit
        ? await updateAccount({ accountId: account.id, name, type: typeSelect.select.value })
        : await createAccount({ name, type: typeSelect.select.value, balance: Number(balanceInput.input.value) || 0 });
      closeModal();
      showToast({ message: `Conta "${saved.name}" ${isEdit ? "atualizada" : "criada"} com sucesso.`, type: "success" });
      onSaved(saved);
    } catch (error) {
      showToast({ message: error.message || "Não foi possível salvar a conta.", type: "error" });
      setButtonLoading(submitButton, false);
    }
  }
}
