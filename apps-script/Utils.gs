/**
 * Utilitários compartilhados: erros de aplicação, respostas padronizadas e
 * validações. Ver contrato completo em docs/API.md.
 */

class AppError extends Error {
  constructor(code, message, field) {
    super(message);
    this.code = code;
    this.field = field || null;
  }
}

function successResponse_(data) {
  return { success: true, data: data, error: null };
}

function errorResponse_(error) {
  var code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL_ERROR;
  var message = error && error.message ? error.message : "Erro inesperado.";
  var field = error instanceof AppError ? error.field : null;
  return { success: false, data: null, error: { code: code, message: message, field: field } };
}

function requireFields_(source, fields) {
  fields.forEach(function (field) {
    var value = source ? source[field] : undefined;
    if (value === undefined || value === null || value === "") {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O campo '" + field + "' é obrigatório.", field);
    }
  });
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole_(role) {
  return ALL_ROLES.indexOf(role) !== -1;
}

function generateId_() {
  return Utilities.getUuid();
}

function generateToken_() {
  return Utilities.getUuid().replace(/-/g, "");
}

function pad2_(value) {
  var text = String(value);
  return text.length < 2 ? "0" + text : text;
}

function monthKey_(year, month) {
  return year + "-" + pad2_(month);
}

function formatDateOnly_(date) {
  return date.getFullYear() + "-" + pad2_(date.getMonth() + 1) + "-" + pad2_(date.getDate());
}

function todayDateOnly_() {
  return formatDateOnly_(new Date());
}

function round2_(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Soma `months` a uma data "YYYY-MM-DD" preservando o dia, ajustando para o
 * último dia do mês quando necessário (ex.: dia 31 em fevereiro vira 28/29).
 * Usado por recorrências (Transaction.gs) e, futuramente, por parcelamentos
 * (Installment.gs, Sprint 7) — ver docs/BUSINESS_RULES.md § Parcelamentos.
 */
function addMonthsPreserveDay_(dateStr, months) {
  var parts = String(dateStr).split("-").map(Number);
  var year = parts[0];
  var month = parts[1];
  var day = parts[2];

  var totalMonths = month - 1 + months;
  var newYear = year + Math.floor(totalMonths / 12);
  var newMonth = (totalMonths % 12) + 1;
  var lastDayOfNewMonth = new Date(newYear, newMonth, 0).getDate();
  var newDay = Math.min(day, lastDayOfNewMonth);

  return newYear + "-" + pad2_(newMonth) + "-" + pad2_(newDay);
}

function nowIso_() {
  return new Date().toISOString();
}

/**
 * Calcula o período de início e fim e o vencimento de uma fatura de cartão com vencimento no ano/mês especificados.
 * O fechamento da fatura ocorre exatamente 10 dias antes da data do vencimento.
 */
function getInvoicePeriodForDueMonth_(dueDay, dueYear, dueMonth) {
  // O vencimento desta fatura
  var dueDate = new Date(dueYear, dueMonth - 1, dueDay);
  // O fechamento ocorre 10 dias antes do vencimento
  var closingDate = new Date(dueDate.getTime() - 10 * 24 * 60 * 60 * 1000);
  
  // O vencimento da fatura anterior
  var prevDueDate = new Date(dueYear, dueMonth - 2, dueDay);
  // O fechamento anterior ocorre 10 dias antes do vencimento anterior
  var prevClosingDate = new Date(prevDueDate.getTime() - 10 * 24 * 60 * 60 * 1000);
  
  // Período começa no dia seguinte ao fechamento anterior
  var periodStart = new Date(prevClosingDate.getTime() + 24 * 60 * 60 * 1000);
  var periodEnd = closingDate;
  
  return {
    start: formatDateOnly_(periodStart),
    end: formatDateOnly_(periodEnd),
    dueDate: formatDateOnly_(dueDate)
  };
}

/**
 * Determina o ano e mês de vencimento da fatura atualmente "aberta" na data atual (todayStr).
 * Se a data de hoje passou da data de fechamento da fatura deste mês, a fatura aberta passa a ser a do mês seguinte.
 */
function getCurrentInvoiceDueMonth_(dueDay, todayStr) {
  var todayYear = Number(todayStr.slice(0, 4));
  var todayMonth = Number(todayStr.slice(5, 7));
  
  var curPeriod = getInvoicePeriodForDueMonth_(dueDay, todayYear, todayMonth);
  if (todayStr <= curPeriod.end) {
    return { year: todayYear, month: todayMonth };
  } else {
    return shiftMonth_(todayYear, todayMonth, 1);
  }
}

/**
 * Mapeia uma transação para a fatura (mês/ano de vencimento) correspondente.
 */
function getInvoiceMonthForTransaction_(txDateStr, dueDay) {
  var txDate = new Date(txDateStr + "T12:00:00");
  var year = txDate.getFullYear();
  var month = txDate.getMonth() + 1;
  
  // Verifica se cai no mês da transação ou nos 3 meses seguintes
  for (var offset = 0; offset <= 3; offset++) {
    var check = shiftMonth_(year, month, offset);
    var period = getInvoicePeriodForDueMonth_(dueDay, check.year, check.month);
    if (txDateStr >= period.start && txDateStr <= period.end) {
      return { year: check.year, month: check.month, dueDate: period.dueDate };
    }
  }
  
  // Verifica nos meses anteriores caso a data seja atípica
  for (var offset = -1; offset >= -3; offset--) {
    var check = shiftMonth_(year, month, offset);
    var period = getInvoicePeriodForDueMonth_(dueDay, check.year, check.month);
    if (txDateStr >= period.start && txDateStr <= period.end) {
      return { year: check.year, month: check.month, dueDate: period.dueDate };
    }
  }
  
  // Fallback seguro
  return { year: year, month: month, dueDate: year + "-" + pad2_(month) + "-" + pad2_(dueDay) };
}
