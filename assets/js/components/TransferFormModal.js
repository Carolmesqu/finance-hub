import { createElement } from "../utils/dom.js";
import { createInput } from "./Input.js";
import { createSelect } from "./Select.js";
import { createButton, setButtonLoading } from "./Button.js";
import { openModal, closeModal } from "./Modal.js";
import { showToast } from "./Toast.js";
import { listAccounts } from "../services/accountService.js";
import { createTransfer } from "../services/transferService.js";
import { todayDateInputValue } from "../utils/format.js";

/**
 * Modal de cadastro de nova transferência (docs/screens.md § Nova Transferência).
 *
 * @param {{ onSaved?: () => void }} options
 */
export async function openTransferFormModal({ onSaved } = {}) {
  let accounts = [];

  const amountInput = createInput({ label: "Valor*", type: "number", placeholder: "0,00" });
  const dateInput = createInput({ label: "Data*", type: "date", value: todayDateInputValue() });
  const notesInput = createInput({ label: "Observações (opcional)", value: "" });

  const fromAccountSelect = createSelect({ label: "Conta Origem*", options: [] });
  const toAccountSelect = createSelect({ label: "Conta Destino*", options: [] });

  const submitButton = createButton({
    label: "Transferir",
    variant: "primary",
    fullWidth: true,
    onClick: handleSubmit,
  });

  const formChildren = [
    amountInput.element,
    dateInput.element,
    fromAccountSelect.element,
    toAccountSelect.element,
    notesInput.element,
    submitButton,
  ];

  const form = createElement("div", { className: "workspace-form" }, formChildren);

  openModal({ title: "Nova Transferência", content: form });

  try {
    accounts = await listAccounts();
    if (accounts.length < 2) {
      showToast({ message: "Cadastre pelo menos duas contas antes de realizar transferências.", type: "error" });
      closeModal();
      return;
    }

    accounts.forEach((acc) => {
      fromAccountSelect.select.appendChild(createElement("option", { attrs: { value: acc.id }, text: acc.name }));
      toAccountSelect.select.appendChild(createElement("option", { attrs: { value: acc.id }, text: acc.name }));
    });

    // Pré-selecionar a segunda conta como destino por conveniência
    if (toAccountSelect.select.options.length > 1) {
      toAccountSelect.select.selectedIndex = 1;
    }
  } catch (error) {
    showToast({ message: error.message || "Erro ao carregar contas.", type: "error" });
    closeModal();
  }

  async function handleSubmit() {
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

    const fromAccountId = fromAccountSelect.select.value;
    const toAccountId = toAccountSelect.select.value;

    if (fromAccountId === toAccountId) {
      toAccountSelect.setError("A conta destino deve ser diferente da conta origem.");
      return;
    }
    toAccountSelect.setError();

    setButtonLoading(submitButton, true);

    try {
      await createTransfer({
        fromAccountId,
        toAccountId,
        amount,
        date: dateInput.input.value,
        notes: notesInput.input.value.trim(),
      });
      showToast({ message: "Transferência realizada com sucesso.", type: "success" });
      closeModal();
      if (onSaved) onSaved();
    } catch (error) {
      showToast({ message: error.message || "Erro ao realizar transferência.", type: "error" });
      setButtonLoading(submitButton, false);
    }
  }
}
