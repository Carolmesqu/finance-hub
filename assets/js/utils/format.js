/**
 * Utilitários de formatação (moeda, datas, mês/ano) compartilhados por
 * qualquer página/componente que exiba valores financeiros — hoje usado
 * pelo Dashboard, e reaproveitado a partir da Sprint 4 (Receitas/Despesas)
 * para evitar duplicar lógica de formatação.
 */

export function formatCurrency(amount, currency = "BRL") {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatMonthLabel(year, month) {
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Espera uma data no formato "YYYY-MM-DD" e retorna "dd/mm". */
export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = String(dateStr).split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}`;
}

export function formatMonthChartLabel(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "");
}

/** Data de hoje no formato aceito por `<input type="date">` ("YYYY-MM-DD"). */
export function todayDateInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
