/**
 * Handlers do módulo "card" (docs/API.md § Módulo card).
 * Regras de cálculo de fatura em docs/BUSINESS_RULES.md § Cartões.
 */

function sanitizeCard_(card) {
  return {
    id: card.id,
    name: card.name,
    limit: Number(card.limit) || 0,
    closingDay: Number(card.closingDay),
    dueDay: Number(card.dueDay),
    brand: card.brand || "",
    institution: card.institution || "",
    color: card.color || "",
    billingAccountId: card.billingAccountId || "",
    archivedAt: card.archivedAt || "",
    createdAt: card.createdAt,
  };
}

function handleCardList(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  var includeArchived = !!(request.payload && request.payload.includeArchived);

  var cards = findRecords_(SHEET_NAMES.CARDS, function (card) {
    if (card.workspaceId !== request.workspaceId) return false;
    if (!includeArchived && card.archivedAt) return false;
    return true;
  });

  return successResponse_(cards.map(sanitizeCard_));
}

function handleCardCreate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["name", "limit", "closingDay", "dueDay"]);

  var limit = Number(payload.limit);
  if (!(limit > 0)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O limite deve ser maior que zero.", "limit");
  }

  var closingDay = Number(payload.closingDay);
  var dueDay = Number(payload.dueDay);
  if (!(closingDay >= 1 && closingDay <= 31)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Dia de fechamento inválido.", "closingDay");
  }
  if (!(dueDay >= 1 && dueDay <= 31)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Dia de vencimento inválido.", "dueDay");
  }

  var card = {
    id: generateId_(),
    workspaceId: request.workspaceId,
    name: payload.name.trim(),
    limit: round2_(limit),
    closingDay: closingDay,
    dueDay: dueDay,
    brand: payload.brand || "",
    institution: payload.institution || "",
    color: payload.color || "",
    billingAccountId: payload.billingAccountId || "",
    archivedAt: "",
    createdAt: nowIso_(),
    updatedAt: "",
  };

  insertRecord_(SHEET_NAMES.CARDS, card);
  return successResponse_(sanitizeCard_(card));
}

function handleCardUpdate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["cardId"]);

  var found = findRecordRowById_(SHEET_NAMES.CARDS, payload.cardId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Cartão não encontrado.");
  }

  var patch = { updatedAt: nowIso_() };
  if (payload.name !== undefined) patch.name = String(payload.name).trim();

  if (payload.limit !== undefined) {
    var limit = Number(payload.limit);
    if (!(limit > 0)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O limite deve ser maior que zero.", "limit");
    }
    patch.limit = round2_(limit);
  }

  if (payload.closingDay !== undefined) {
    var closingDay = Number(payload.closingDay);
    if (!(closingDay >= 1 && closingDay <= 31)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Dia de fechamento inválido.", "closingDay");
    }
    patch.closingDay = closingDay;
  }

  if (payload.dueDay !== undefined) {
    var dueDay = Number(payload.dueDay);
    if (!(dueDay >= 1 && dueDay <= 31)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Dia de vencimento inválido.", "dueDay");
    }
    patch.dueDay = dueDay;
  }

  if (payload.brand !== undefined) patch.brand = payload.brand;
  if (payload.institution !== undefined) patch.institution = payload.institution;
  if (payload.color !== undefined) patch.color = payload.color;
  if (payload.billingAccountId !== undefined) patch.billingAccountId = payload.billingAccountId;

  var updated = updateRecordById_(SHEET_NAMES.CARDS, payload.cardId, patch);
  return successResponse_(sanitizeCard_(updated));
}

function handleCardArchive(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["cardId"]);

  var found = findRecordRowById_(SHEET_NAMES.CARDS, payload.cardId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Cartão não encontrado.");
  }

  var hasOpenInstallments = findOneRecord_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return tx.cardId === payload.cardId && !tx.deletedAt && tx.installmentPlanId;
  });
  if (hasOpenInstallments) {
    throw new AppError(
      ERROR_CODES.CONFLICT,
      "Este cartão possui parcelas futuras em aberto. Cancele o parcelamento antes de arquivar."
    );
  }

  updateRecordById_(SHEET_NAMES.CARDS, payload.cardId, { archivedAt: nowIso_() });
  return successResponse_({ success: true });
}

/**
 * Calcula limite/fatura atual/próxima fatura de um cartão (docs/
 * BUSINESS_RULES.md § Cálculo das Faturas). Simplificação da Sprint 6:
 * "Fatura atual" = último período já fechado (ou fechando hoje); "Próxima
 * fatura" = período em andamento, ainda aceitando novas compras.
 */
function handleCardGetSummary(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  requireFields_(request.payload, ["cardId"]);

  var found = findRecordRowById_(SHEET_NAMES.CARDS, request.payload.cardId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Cartão não encontrado.");
  }
  var card = found.record;

  var dueDay = Number(card.dueDay);
  var todayStr = todayDateOnly_();

  var curDue = getCurrentInvoiceDueMonth_(dueDay, todayStr);
  var curPeriod = getInvoicePeriodForDueMonth_(dueDay, curDue.year, curDue.month);

  var nextDue = shiftMonth_(curDue.year, curDue.month, 1);
  var nextPeriod = getInvoicePeriodForDueMonth_(dueDay, nextDue.year, nextDue.month);

  var cardTransactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return (
      tx.workspaceId === request.workspaceId &&
      tx.cardId === request.payload.cardId &&
      tx.paymentMethod === PAYMENT_METHODS.CREDIT &&
      !tx.deletedAt
    );
  });

  var currentInvoiceTransactions = cardTransactions.filter(function (tx) {
    return String(tx.date) >= curPeriod.start && String(tx.date) <= curPeriod.end;
  });
  var nextInvoiceTransactions = cardTransactions.filter(function (tx) {
    return String(tx.date) >= nextPeriod.start && String(tx.date) <= nextPeriod.end;
  });

  // Limite usado = todas as compras já lançadas até o fim da fatura em
  // aberto (inclui parcelas futuras já geradas — docs/BUSINESS_RULES.md).
  var used = sumAmountList_(
    cardTransactions.filter(function (tx) {
      return String(tx.date) <= nextPeriod.end;
    })
  );
  var limit = Number(card.limit) || 0;

  return successResponse_({
    id: card.id,
    name: card.name,
    limit: limit,
    used: round2_(used),
    available: round2_(limit - used),
    currentInvoice: {
      periodStart: curPeriod.start,
      periodEnd: curPeriod.end,
      dueDate: curPeriod.dueDate,
      total: sumAmountList_(currentInvoiceTransactions),
      transactions: currentInvoiceTransactions.map(sanitizeTransaction_),
    },
    nextInvoice: {
      periodStart: nextPeriod.start,
      periodEnd: nextPeriod.end,
      dueDate: nextPeriod.dueDate,
      total: sumAmountList_(nextInvoiceTransactions),
      transactions: nextInvoiceTransactions.map(sanitizeTransaction_),
    },
  });
}

/** Usado por Transaction.gs para validar `cardId` recebido no payload. */
function assertCardValid_(workspaceId, cardId) {
  var found = findRecordRowById_(SHEET_NAMES.CARDS, cardId);
  if (!found || found.record.workspaceId !== workspaceId || found.record.archivedAt) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Cartão inválido.", "cardId");
  }
}

/** "YYYY-MM-DD" para o dia `day` do mês `month` (1-12), com clamp no último dia do mês. */
function buildDateString_(year, month, day) {
  var lastDay = new Date(year, month, 0).getDate();
  var clampedDay = Math.min(day, lastDay);
  return year + "-" + pad2_(month) + "-" + pad2_(clampedDay);
}

/** Desloca (year, month 1-12) por `delta` meses, com normalização correta para negativos. */
function shiftMonth_(year, month, delta) {
  var total = month - 1 + delta;
  var newYear = year + Math.floor(total / 12);
  var newMonth = (((total % 12) + 12) % 12) + 1;
  return { year: newYear, month: newMonth };
}

function addDays_(dateStr, days) {
  var parts = String(dateStr).split("-").map(Number);
  var date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + days);
  return formatDateOnly_(date);
}

function dueDateForClosing_(closingYear, closingMonth, closingDay, dueDay) {
  if (dueDay > closingDay) {
    return buildDateString_(closingYear, closingMonth, dueDay);
  }
  var next = shiftMonth_(closingYear, closingMonth, 1);
  return buildDateString_(next.year, next.month, dueDay);
}
