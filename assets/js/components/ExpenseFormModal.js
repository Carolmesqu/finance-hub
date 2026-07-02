import { createElement } from "../utils/dom.js";
import { createInput } from "./Input.js";
import { createSelect } from "./Select.js";
import { createSwitch } from "./Switch.js";
import { createButton, setButtonLoading } from "./Button.js";
import { openModal, closeModal } from "./Modal.js";
import { confirmDialog } from "./Dialog.js";
import { showToast } from "./Toast.js";
import { openAccountFormModal } from "./AccountFormModal.js";
import { openCardFormModal } from "./CardFormModal.js";
import { createTransaction, updateTransaction, deleteTransaction } from "../services/transactionService.js";
import { createInstallmentPlan } from "../services/installmentService.js";
import { todayDateInputValue } from "../utils/format.js";

const PAYMENT_METHOD_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "debit", label: "Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "credit", label: "Crédito" },
];

const PAYMENT_PERIOD_OPTIONS = [
  { value: "start_of_month", label: "Início do Mês" },
  { value: "fortnight", label: "Quinzena" },
];

/**
 * Modal de Nova/Editar Despesa (docs/screens.md § Nova / Editar Despesa).
 * A partir da Sprint 6, "Crédito" já é uma opção válida (Cartões existe);
 * parcelamento ainda não (Sprint 7) — uma despesa no crédito criada aqui é
 * sempre uma compra "à vista" de uma parcela só.
 *
 * @param {{
 *   transaction?: object,
 *   accounts: object[],
 *   cards: object[],
 *   categories: object[],
 *   presetCard?: object,
 *   onAccountsChanged: () => Promise<object[]>,
 *   onCardsChanged: () => Promise<object[]>,
 *   onSaved: () => void,
 * }} options
 */
export function openExpenseFormModal({ transaction, accounts, cards, categories, presetCard, onAccountsChanged, onCardsChanged, onSaved }) {
  const isEdit = !!transaction;
  let currentAccounts = accounts || [];
  let currentCards = cards || [];
  let accountSelect = null;
  let cardSelect = null;

  const descriptionInput = createInput({
    label: "Descrição",
    placeholder: "Ex.: Mercado, Aluguel, Internet",
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

  const initialPaymentMethod = transaction?.paymentMethod || (presetCard ? "credit" : "pix");
  const paymentMethodSelect = createSelect({
    label: "Forma de pagamento",
    options: PAYMENT_METHOD_OPTIONS,
    value: initialPaymentMethod,
  });

  const paymentPeriodSelect = createSelect({
    label: "Período de planejamento",
    options: PAYMENT_PERIOD_OPTIONS,
    value: transaction?.paymentPeriod || "start_of_month",
  });

  const paymentTargetWrapper = createElement("div", { className: "income-form__account-row" });
  const newAccountButton = createButton({ label: "+ Nova Conta", variant: "ghost", size: "sm", onClick: handleNewAccount });
  const newCardButton = createButton({ label: "+ Novo Cartão", variant: "ghost", size: "sm", onClick: handleNewCard });

  paymentMethodSelect.select.addEventListener("change", renderPaymentTarget);
  renderPaymentTarget();

  const recurringSwitch = createSwitch({ label: "Repetir todo mês", checked: false });
  const installmentSwitch = createSwitch({ label: "Compra parcelada", checked: false });
  const installmentsCountInput = createInput({
    label: "Número de parcelas",
    type: "number",
    placeholder: "De 2 a 60",
    value: "2",
  });
  installmentsCountInput.element.hidden = true;

  const installmentPreviewEl = createElement("p", {
    className: "expense-form__installment-preview",
    text: "",
  });
  installmentPreviewEl.hidden = true;

  installmentSwitch.input.addEventListener("change", () => {
    const isChecked = installmentSwitch.input.checked;
    installmentsCountInput.element.hidden = !isChecked;
    installmentPreviewEl.hidden = !isChecked;
    
    // Altera o label dinamicamente usando querySelector
    const labelEl = amountInput.element.querySelector(".input__label");
    if (labelEl) {
      labelEl.textContent = isChecked ? "Valor total" : "Valor";
    }

    if (isChecked) {
      recurringSwitch.input.checked = false;
      updateInstallmentPreview();
    }
  });

  recurringSwitch.input.addEventListener("change", () => {
    if (recurringSwitch.input.checked) {
      installmentSwitch.input.checked = false;
      installmentsCountInput.element.hidden = true;
      installmentPreviewEl.hidden = true;
      
      const labelEl = amountInput.element.querySelector(".input__label");
      if (labelEl) {
        labelEl.textContent = "Valor";
      }
    }
  });

  amountInput.input.addEventListener("input", updateInstallmentPreview);
  installmentsCountInput.input.addEventListener("input", updateInstallmentPreview);

  function updateInstallmentPreview() {
    const totalAmount = Number(amountInput.input.value);
    const count = Number(installmentsCountInput.input.value);
    if (totalAmount > 0 && count >= 2 && count <= 60) {
      const pAmount = (totalAmount / count).toFixed(2);
      installmentPreviewEl.textContent = `Serão criadas ${count} parcelas de R$ ${pAmount} (última parcela ajustada).`;
    } else {
      installmentPreviewEl.textContent = "";
    }
  }

  const notesInput = createInput({ label: "Observações (opcional)", value: transaction?.notes || "" });

  const formChildren = [
    descriptionInput.element,
    amountInput.element,
    dateInput.element,
    categorySelect.element,
    paymentMethodSelect.element,
    paymentTargetWrapper,
    paymentPeriodSelect.element,
  ];

  if (!isEdit) {
    formChildren.push(recurringSwitch.element);
    formChildren.push(installmentSwitch.element);
    formChildren.push(installmentsCountInput.element);
    formChildren.push(installmentPreviewEl);
  }

  const submitButton = createButton({
    label: isEdit ? "Salvar alterações" : "Salvar Despesa",
    variant: "primary",
    fullWidth: true,
    onClick: handleSubmit,
  });

  formChildren.push(notesInput.element, submitButton);

  if (isEdit) {
    formChildren.push(createButton({ label: "Excluir Despesa", variant: "danger", fullWidth: true, onClick: handleDelete }));
  }

  const form = createElement("div", { className: "workspace-form" }, formChildren);

  openModal({ title: isEdit ? "Editar Despesa" : "Nova Despesa", content: form });

  function renderPaymentTarget() {
    paymentTargetWrapper.replaceChildren();

    if (paymentMethodSelect.select.value === "credit") {
      accountSelect = null;
      renderCardSelect();
    } else {
      cardSelect = null;
      renderAccountSelect();
    }
  }

  function renderAccountSelect() {
    if (currentAccounts.length === 0) {
      paymentTargetWrapper.append(
        createElement("p", { className: "income-form__empty-accounts", text: "Você ainda não tem nenhuma conta cadastrada." }),
        newAccountButton
      );
      return;
    }

    accountSelect = createSelect({
      label: "Conta utilizada",
      options: currentAccounts.map((account) => ({ value: account.id, label: account.name })),
      value: transaction?.accountId || currentAccounts[0].id,
    });

    paymentTargetWrapper.append(
      createElement("div", { className: "income-form__account-field" }, [accountSelect.element, newAccountButton])
    );
  }

  function renderCardSelect() {
    if (currentCards.length === 0) {
      paymentTargetWrapper.append(
        createElement("p", { className: "income-form__empty-accounts", text: "Você ainda não tem nenhum cartão cadastrado." }),
        newCardButton
      );
      return;
    }

    cardSelect = createSelect({
      label: "Cartão utilizado",
      options: currentCards.map((card) => ({ value: card.id, label: card.name })),
      value: (presetCard && presetCard.id) || transaction?.cardId || currentCards[0].id,
    });

    paymentTargetWrapper.append(
      createElement("div", { className: "income-form__account-field" }, [cardSelect.element, newCardButton])
    );
  }

  function handleNewAccount() {
    openAccountFormModal({
      onSaved: async (createdAccount) => {
        currentAccounts = await onAccountsChanged();
        if (!currentAccounts || currentAccounts.length === 0) {
          currentAccounts = [createdAccount];
        }
        renderPaymentTarget();
        openModal({ title: isEdit ? "Editar Despesa" : "Nova Despesa", content: form });
      },
    });
  }

  function handleNewCard() {
    openCardFormModal({
      onSaved: async (createdCard) => {
        currentCards = await onCardsChanged();
        if (!currentCards || currentCards.length === 0) {
          currentCards = [createdCard];
        }
        renderPaymentTarget();
        openModal({ title: isEdit ? "Editar Despesa" : "Nova Despesa", content: form });
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

    const isCredit = paymentMethodSelect.select.value === "credit";
    if (isCredit && !cardSelect) {
      showToast({ message: "Cadastre um cartão antes de continuar.", type: "error" });
      return;
    }
    if (!isCredit && !accountSelect) {
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
        paymentMethod: paymentMethodSelect.select.value,
        paymentPeriod: paymentPeriodSelect.select.value,
        notes: notesInput.input.value.trim(),
        accountId: isCredit ? undefined : accountSelect.select.value,
        cardId: isCredit ? cardSelect.select.value : undefined,
      };

      if (isEdit) {
        let applyToAllInstallments = false;
        if (transaction.installmentPlanId) {
          applyToAllInstallments = await confirmDialog({
            title: "Despesa parcelada",
            message: "Esta despesa faz parte de um parcelamento. Deseja aplicar as alterações também às parcelas futuras?",
            confirmLabel: "Salvar futuras",
            cancelLabel: "Somente esta",
            variant: "primary",
          });
        }
        await updateTransaction({ transactionId: transaction.id, applyToAllInstallments, ...payload });
        showToast({ message: "Despesa atualizada com sucesso.", type: "success" });
      } else if (installmentSwitch.input.checked) {
        const count = Number(installmentsCountInput.input.value);
        if (isNaN(count) || count < 2 || count > 60) {
          installmentsCountInput.setError("Informe um número de parcelas entre 2 e 60.");
          setButtonLoading(submitButton, false);
          return;
        }
        await createInstallmentPlan({
          description,
          totalAmount: amount,
          installmentsCount: count,
          startDate: dateInput.input.value,
          categoryId: categorySelect.select.value,
          paymentMethod: paymentMethodSelect.select.value,
          paymentPeriod: paymentPeriodSelect.select.value,
          notes: notesInput.input.value.trim(),
          accountId: isCredit ? undefined : accountSelect.select.value,
          cardId: isCredit ? cardSelect.select.value : undefined,
        });
        showToast({ message: "Plano de parcelamento criado com sucesso.", type: "success" });
      } else {
        await createTransaction({ type: "expense", isRecurring: recurringSwitch.input.checked, ...payload });
        showToast({ message: "Despesa criada com sucesso.", type: "success" });
      }
      closeModal();
      onSaved();
    } catch (error) {
      showToast({ message: error.message || "Não foi possível salvar a despesa.", type: "error" });
      setButtonLoading(submitButton, false);
    }
  }

  async function handleDelete() {
    const confirmed = await confirmDialog({
      title: "Excluir Despesa",
      message: `Tem certeza que deseja excluir "${transaction.description}"?`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!confirmed) return;

    let applyToAllInstallments = false;
    let applyToAllRecurrences = false;

    if (transaction.installmentPlanId) {
      applyToAllInstallments = await confirmDialog({
        title: "Despesa parcelada",
        message: "Esta despesa faz parte de um parcelamento. Deseja excluir também as parcelas futuras?",
        confirmLabel: "Excluir futuras",
        cancelLabel: "Somente esta",
        variant: "danger",
      });
    } else if (transaction.recurrenceGroupId) {
      applyToAllRecurrences = await confirmDialog({
        title: "Lançamento recorrente",
        message: "Esta despesa faz parte de uma recorrência. Deseja excluir também as ocorrências futuras?",
        confirmLabel: "Excluir futuras",
        cancelLabel: "Somente esta",
        variant: "danger",
      });
    }

    try {
      await deleteTransaction(transaction.id, { applyToAllInstallments, applyToAllRecurrences });
      closeModal();
      showToast({ message: "Despesa excluída.", type: "success" });
      onSaved();
    } catch (error) {
      showToast({ message: error.message || "Não foi possível excluir a despesa.", type: "error" });
    }
  }
}

