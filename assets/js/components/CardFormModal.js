import { createElement } from "../utils/dom.js";
import { createInput } from "./Input.js";
import { createSelect } from "./Select.js";
import { createButton, setButtonLoading } from "./Button.js";
import { openModal, closeModal } from "./Modal.js";
import { showToast } from "./Toast.js";
import { createCard, updateCard } from "../services/cardService.js";

const BRAND_OPTIONS = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "American Express" },
  { value: "other", label: "Outra" },
];

/**
 * Modal de criação/edição de Cartão (docs/screens.md § Cartões/Detalhes do
 * Cartão). Reutilizado tanto pelo "+ Novo Cartão" da tela de Cartões quanto
 * pelo "+ Novo Cartão" inline do formulário de Despesa (Crédito).
 *
 * @param {{ card?: object, onSaved: (card: object) => void }} options
 */
export function openCardFormModal({ card, onSaved } = {}) {
  const isEdit = !!card;

  const nameInput = createInput({
    label: "Nome do cartão",
    placeholder: "Ex.: Nubank, Inter",
    value: card?.name || "",
    required: true,
  });
  const limitInput = createInput({ label: "Limite", type: "number", value: card ? String(card.limit) : "", required: true });
  const closingDayInput = createInput({
    label: "Dia de fechamento (1-31)",
    type: "number",
    value: card ? String(card.closingDay) : "1",
    required: true,
  });
  const dueDayInput = createInput({
    label: "Dia de vencimento (1-31)",
    type: "number",
    value: card ? String(card.dueDay) : "10",
    required: true,
  });
  const brandSelect = createSelect({ label: "Bandeira", options: BRAND_OPTIONS, value: card?.brand || "other" });

  const submitButton = createButton({
    label: isEdit ? "Salvar alterações" : "Criar Cartão",
    variant: "primary",
    fullWidth: true,
    onClick: handleSubmit,
  });

  const form = createElement("div", { className: "workspace-form" }, [
    nameInput.element,
    limitInput.element,
    closingDayInput.element,
    dueDayInput.element,
    brandSelect.element,
    submitButton,
  ]);

  openModal({ title: isEdit ? "Editar Cartão" : "Novo Cartão", content: form });

  async function handleSubmit() {
    const name = nameInput.input.value.trim();
    if (name.length < 2) {
      nameInput.setError("Informe ao menos 2 caracteres.");
      return;
    }
    nameInput.setError();

    const limit = Number(limitInput.input.value);
    if (!(limit > 0)) {
      limitInput.setError("Informe um limite maior que zero.");
      return;
    }
    limitInput.setError();

    const closingDay = Number(closingDayInput.input.value);
    if (!(closingDay >= 1 && closingDay <= 31)) {
      closingDayInput.setError("Informe um dia entre 1 e 31.");
      return;
    }
    closingDayInput.setError();

    const dueDay = Number(dueDayInput.input.value);
    if (!(dueDay >= 1 && dueDay <= 31)) {
      dueDayInput.setError("Informe um dia entre 1 e 31.");
      return;
    }
    dueDayInput.setError();

    setButtonLoading(submitButton, true);
    try {
      const payload = { name, limit, closingDay, dueDay, brand: brandSelect.select.value };
      const saved = isEdit ? await updateCard({ cardId: card.id, ...payload }) : await createCard(payload);
      closeModal();
      showToast({ message: `Cartão "${saved.name}" ${isEdit ? "atualizado" : "criado"} com sucesso.`, type: "success" });
      onSaved(saved);
    } catch (error) {
      showToast({ message: error.message || "Não foi possível salvar o cartão.", type: "error" });
      setButtonLoading(submitButton, false);
    }
  }
}
