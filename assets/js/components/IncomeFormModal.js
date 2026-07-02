import { createElement } from "../utils/dom.js";
import { createInput } from "./Input.js";
import { createSelect } from "./Select.js";
import { createSwitch } from "./Switch.js";
import { createButton, setButtonLoading } from "./Button.js";
import { openModal, closeModal } from "./Modal.js";
import { confirmDialog } from "./Dialog.js";
import { showToast } from "./Toast.js";
import { openAccountFormModal } from "./AccountFormModal.js";
import { createTransaction, updateTransaction, deleteTransaction } from "../services/transactionService.js";
import { todayDateInputValue } from "../utils/format.js";

const PAYMENT_METHOD_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "debit", label: "Débito" },
];

/**
 * Modal de Nova/Editar Receita (docs/screens.md § Nova / Editar Receita).
 * Implementado como modal sobre /incomes — alternativa explicitamente
 * permitida pela documentação, já que o Router ainda não suporta rotas com
 * parâmetro dinâmico (:id).
 *
 * @param {{
 *   transaction?: object,
 *   accounts: object[],
 *   categories: object[],
 *   onAccountsChanged: () => Promise<object[]>,
 *   onSaved: () => void,
 * }} options
 */
export function openIncomeFormModal({ transaction, accounts, categories, onAccountsChanged, onSaved }) {
  const isEdit = !!transaction;
  let currentAccounts = accounts;
  let accountSelect = null;

  const descriptionInput = createInput({
    label: "Descrição",
    placeholder: "Ex.: Salário, Freelance",
    value: transaction?.description || "",
    required: true,
  });
  const amountInput = createInput({
    label: "Valor",
    type: "number",
    value: transaction ? String(transaction.amount) : "",
    required: true,
  });
  const dateInput = createInput({
    label: "Data",
    type: "date",
    value: transaction?.date || todayDateInputValue(),
    required: true,
  });

  const categorySelect = createSelect({
    label: "Categoria",
    options: categories.map((category) => ({ value: category.id, label: category.name })),
    value: transaction?.categoryId || (categories[0] && categories[0].id),
  });

  const paymentMethodSelect = createSelect({
    label: "Onde o valor entrou",
    options: PAYMENT_METHOD_OPTIONS,
    value: transaction?.paymentMethod || "pix",
  });

  const accountSelectWrapper = createElement("div", { className: "income-form__account-row" });
  const newAccountButton = createButton({ label: "+ Nova Conta", variant: "ghost", size: "sm", onClick: handleNewAccount });
  renderAccountSelect();

  const recurringSwitch = createSwitch({ label: "Repetir todo mês", checked: false });
  const notesInput = createInput({ label: "Observações (opcional)", value: transaction?.notes || "" });

  const formChildren = [
    descriptionInput.element,
    amountInput.element,
    dateInput.element,
    categorySelect.element,
    accountSelectWrapper,
    paymentMethodSelect.element,
  ];

  if (!isEdit) {
    formChildren.push(recurringSwitch.element);
  }

  const submitButton = createButton({
    label: isEdit ? "Salvar alterações" : "Salvar Receita",
    variant: "primary",
    fullWidth: true,
    onClick: handleSubmit,
  });

  formChildren.push(notesInput.element, submitButton);

  if (isEdit) {
    formChildren.push(createButton({ label: "Excluir Receita", variant: "danger", fullWidth: true, onClick: handleDelete }));
  }

  const form = createElement("div", { className: "workspace-form" }, formChildren);

  openModal({ title: isEdit ? "Editar Receita" : "Nova Receita", content: form });

  function renderAccountSelect() {
    accountSelectWrapper.replaceChildren();

    if (currentAccounts.length === 0) {
      accountSelect = null;
      accountSelectWrapper.append(
        createElement("p", {
          className: "income-form__empty-accounts",
          text: "Você ainda não tem nenhuma conta cadastrada.",
        }),
        newAccountButton
      );
      return;
    }

    accountSelect = createSelect({
      label: "Conta de destino",
      options: currentAccounts.map((account) => ({ value: account.id, label: account.name })),
      value: transaction?.accountId || currentAccounts[0].id,
    });

    accountSelectWrapper.append(
      createElement("div", { className: "income-form__account-field" }, [accountSelect.element, newAccountButton])
    );
  }

  function handleNewAccount() {
    openAccountFormModal({
      onSaved: async (createdAccount) => {
        currentAccounts = await onAccountsChanged();
        if (!currentAccounts || currentAccounts.length === 0) {
          currentAccounts = [createdAccount];
        }
        renderAccountSelect();
        openModal({ title: isEdit ? "Editar Receita" : "Nova Receita", content: form });
      },
    });
  }

  async function handleSubmit() {
    const description = descriptionInput.input.value.trim();
    if (description.length < 2) {
      descriptionInput.setError("Informe ao menos 2 caracteres.");
      return;
    }
    descriptionInput.setError();

    const amount = Number(amountInput.input.value);
    if (!(amount > 0)) {
      amountInput.setError("Informe um valor maior que zero.");
      return;
    }
    amountInput.setError();

    if (!dateInput.input.value) {
      dateInput.setError("Informe a data.");
      return;
    }
    dateInput.setError();

    if (!accountSelect) {
      showToast({ message: "Cadastre uma conta antes de continuar.", type: "error" });
      return;
    }

    setButtonLoading(submitButton, true);
    try {
      const payload = {
        description,
        amount,
        date: dateInput.input.value,
        categoryId: categorySelect.select.value,
        accountId: accountSelect.select.value,
        paymentMethod: paymentMethodSelect.select.value,
        notes: notesInput.input.value.trim(),
      };

      if (isEdit) {
        await updateTransaction({ transactionId: transaction.id, ...payload });
        showToast({ message: "Receita atualizada com sucesso.", type: "success" });
      } else {
        await createTransaction({ type: "income", isRecurring: recurringSwitch.input.checked, ...payload });
        showToast({ message: "Receita criada com sucesso.", type: "success" });
      }
      closeModal();
      onSaved();
    } catch (error) {
      showToast({ message: error.message || "Não foi possível salvar a receita.", type: "error" });
      setButtonLoading(submitButton, false);
    }
  }

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: "Excluir Receita",
      message: `Tem certeza que deseja excluir "${transaction.description}"?`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!confirmed) return;

    let applyToAllRecurrences = false;
    if (transaction.recurrenceGroupId) {
      applyToAllRecurrences = await confirmDialog({
        title: "Lançamento recorrente",
        message: "Esta receita faz parte de uma recorrência. Deseja excluir também as ocorrências futuras?",
        confirmLabel: "Excluir futuras",
        cancelLabel: "Somente esta",
        variant: "danger",
      });
    }

    try {
      await deleteTransaction(transaction.id, { applyToAllRecurrences });
      closeModal();
      showToast({ message: "Receita excluída.", type: "success" });
      onSaved();
    } catch (error) {
      showToast({ message: error.message || "Não foi possível excluir a receita.", type: "error" });
    }
  }
}
