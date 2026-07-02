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
