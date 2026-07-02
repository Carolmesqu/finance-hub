/**
 * Handlers do módulo "transaction" (docs/API.md § Módulo transaction).
 *
 * Entidade unificada de Receitas/Despesas (`type` diferencia — ver
 * docs/database.md § Transactions). A Sprint 4 exercita este módulo pela
 * tela de Receitas (`type = "income"`); a Sprint 5 (Despesas) reutiliza os
 * mesmos handlers, apenas adicionando a UI de parcelamento/cartão.
 */

function sanitizeTransaction_(tx) {
  return {
    id: tx.id,
    type: tx.type,
    description: tx.description,
    amount: Number(tx.amount) || 0,
    date: tx.date,
    categoryId: tx.categoryId,
    accountId: tx.accountId || "",
    cardId: tx.cardId || "",
    paymentMethod: tx.paymentMethod,
    paymentPeriod: tx.paymentPeriod || "",
    isRecurring: !!tx.isRecurring,
    recurrenceGroupId: tx.recurrenceGroupId || "",
    installmentPlanId: tx.installmentPlanId || "",
    installmentNumber: tx.installmentNumber || "",
    installmentTotal: tx.installmentTotal || "",
    notes: tx.notes || "",
    createdBy: tx.createdBy,
    updatedBy: tx.updatedBy || "",
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt || "",
  };
}

function handleTransactionList(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  var payload = request.payload || {};
  var page = Number(payload.page) || 1;
  var pageSize = Math.min(Number(payload.pageSize) || 20, 100);

  if (payload.startDate && payload.endDate && String(payload.startDate) > String(payload.endDate)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "'startDate' deve ser anterior ou igual a 'endDate'.");
  }

  var search = payload.search ? String(payload.search).toLowerCase() : "";

  var items = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    if (tx.workspaceId !== request.workspaceId || tx.deletedAt) return false;
    if (payload.type && tx.type !== payload.type) return false;
    if (payload.categoryId && tx.categoryId !== payload.categoryId) return false;
    if (payload.accountId && tx.accountId !== payload.accountId) return false;
    if (payload.cardId && tx.cardId !== payload.cardId) return false;
    if (payload.createdBy && tx.createdBy !== payload.createdBy) return false;
    if (payload.startDate && String(tx.date) < String(payload.startDate)) return false;
    if (payload.endDate && String(tx.date) > String(payload.endDate)) return false;
    if (search && String(tx.description).toLowerCase().indexOf(search) === -1) return false;
    return true;
  });

  items.sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt));
  });

  var total = items.length;
  var start = (page - 1) * pageSize;
  var pageItems = items.slice(start, start + pageSize).map(sanitizeTransaction_);

  return successResponse_({ items: pageItems, total: total, page: page, pageSize: pageSize });
}

function handleTransactionGet(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  requireFields_(request.payload, ["transactionId"]);

  var found = findRecordRowById_(SHEET_NAMES.TRANSACTIONS, request.payload.transactionId);
  if (!found || found.record.workspaceId !== request.workspaceId || found.record.deletedAt) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Lançamento não encontrado.");
  }

  return successResponse_(sanitizeTransaction_(found.record));
}

function handleTransactionCreate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["type", "description", "amount", "date", "categoryId", "paymentMethod"]);

  if (ALL_TRANSACTION_TYPES.indexOf(payload.type) === -1) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Tipo de lançamento inválido.", "type");
  }

  var amount = Number(payload.amount);
  if (!(amount > 0)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O campo 'amount' deve ser maior que zero.", "amount");
  }

  if (ALL_PAYMENT_METHODS.indexOf(payload.paymentMethod) === -1) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Forma de pagamento inválida.", "paymentMethod");
  }

  if (payload.type === TRANSACTION_TYPES.INCOME && payload.paymentMethod === PAYMENT_METHODS.CREDIT) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Receitas não podem usar cartão de crédito.", "paymentMethod");
  }

  assertCategoryValid_(request.workspaceId, payload.categoryId, payload.type);

  var accountId = "";
  var cardId = "";
  if (payload.paymentMethod === PAYMENT_METHODS.CREDIT) {
    if (!payload.cardId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Informe o cartão utilizado.", "cardId");
    }
    assertCardValid_(request.workspaceId, payload.cardId);
    cardId = payload.cardId;
  } else {
    if (!payload.accountId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Informe a conta utilizada.", "accountId");
    }
    assertAccountValid_(request.workspaceId, payload.accountId);
    accountId = payload.accountId;
  }

  var paymentPeriod = "";
  if (payload.type === TRANSACTION_TYPES.EXPENSE) {
    if (ALL_PAYMENT_PERIODS.indexOf(payload.paymentPeriod) === -1) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        "Informe o período de planejamento (início do mês ou quinzena).",
        "paymentPeriod"
      );
    }
    paymentPeriod = payload.paymentPeriod;
  }

  var isRecurring = !!payload.isRecurring;
  var recurrenceGroupId = isRecurring ? generateId_() : "";

  var baseTransaction = {
    id: generateId_(),
    workspaceId: request.workspaceId,
    type: payload.type,
    description: String(payload.description).trim(),
    amount: round2_(amount),
    date: payload.date,
    categoryId: payload.categoryId,
    accountId: accountId,
    cardId: cardId,
    paymentMethod: payload.paymentMethod,
    paymentPeriod: paymentPeriod,
    isRecurring: isRecurring,
    recurrenceGroupId: recurrenceGroupId,
    installmentPlanId: "",
    installmentNumber: "",
    installmentTotal: "",
    notes: payload.notes || "",
    attachmentURL: "",
    createdBy: user.id,
    updatedBy: "",
    createdAt: nowIso_(),
    updatedAt: "",
    deletedAt: "",
  };

  insertRecord_(SHEET_NAMES.TRANSACTIONS, baseTransaction);
  applyBalanceEffect_(baseTransaction, 1);

  if (isRecurring) {
    generateRecurrenceOccurrences_(baseTransaction, 12).forEach(function (occurrence) {
      insertRecord_(SHEET_NAMES.TRANSACTIONS, occurrence);
      applyBalanceEffect_(occurrence, 1);
    });
  }

  return successResponse_(sanitizeTransaction_(baseTransaction));
}

function handleTransactionUpdate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["transactionId"]);

  var found = findRecordRowById_(SHEET_NAMES.TRANSACTIONS, payload.transactionId);
  if (!found || found.record.workspaceId !== request.workspaceId || found.record.deletedAt) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Lançamento não encontrado.");
  }

  var targets = [found.record];
  if (payload.applyToAllInstallments && found.record.installmentPlanId) {
    targets = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
      return (
        tx.workspaceId === request.workspaceId &&
        tx.installmentPlanId === found.record.installmentPlanId &&
        !tx.deletedAt &&
        String(tx.date) >= String(found.record.date)
      );
    });
  } else if (payload.applyToAllRecurrences && found.record.recurrenceGroupId) {
    targets = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
      return (
        tx.workspaceId === request.workspaceId &&
        tx.recurrenceGroupId === found.record.recurrenceGroupId &&
        !tx.deletedAt &&
        String(tx.date) >= String(found.record.date)
      );
    });
  }

  var updated = targets.map(function (tx) {
    return applyTransactionPatch_(tx, payload, user);
  });

  return successResponse_((payload.applyToAllInstallments || payload.applyToAllRecurrences) ? updated : updated[0]);
}

function applyTransactionPatch_(tx, payload, user) {
  // Reverte o efeito antigo no saldo ANTES de aplicar o patch, para nunca
  // deixar o saldo inconsistente (docs/BUSINESS_RULES.md § Atualização
  // Automática dos Saldos).
  applyBalanceEffect_(tx, -1);

  var patch = { updatedBy: user.id, updatedAt: nowIso_() };

  if (payload.description !== undefined) patch.description = String(payload.description).trim();

  if (payload.amount !== undefined) {
    var amount = Number(payload.amount);
    if (!(amount > 0)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O campo 'amount' deve ser maior que zero.", "amount");
    }
    patch.amount = round2_(amount);
  }

  if (payload.date !== undefined) patch.date = payload.date;
  if (payload.notes !== undefined) patch.notes = payload.notes;

  if (payload.categoryId !== undefined) {
    assertCategoryValid_(tx.workspaceId, payload.categoryId, tx.type);
    patch.categoryId = payload.categoryId;
  }

  if (payload.accountId !== undefined && tx.paymentMethod !== PAYMENT_METHODS.CREDIT) {
    assertAccountValid_(tx.workspaceId, payload.accountId);
    patch.accountId = payload.accountId;
  }

  if (payload.paymentPeriod !== undefined && tx.type === TRANSACTION_TYPES.EXPENSE) {
    if (ALL_PAYMENT_PERIODS.indexOf(payload.paymentPeriod) === -1) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Período de planejamento inválido.", "paymentPeriod");
    }
    patch.paymentPeriod = payload.paymentPeriod;
  }

  var updated = updateRecordById_(SHEET_NAMES.TRANSACTIONS, tx.id, patch);
  applyBalanceEffect_(updated, 1);
  return sanitizeTransaction_(updated);
}

function handleTransactionDelete(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["transactionId"]);

  var found = findRecordRowById_(SHEET_NAMES.TRANSACTIONS, payload.transactionId);
  if (!found || found.record.workspaceId !== request.workspaceId || found.record.deletedAt) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Lançamento não encontrado.");
  }

  var targets = [found.record];
  if (payload.applyToAllInstallments && found.record.installmentPlanId) {
    targets = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
      return (
        tx.workspaceId === request.workspaceId &&
        tx.installmentPlanId === found.record.installmentPlanId &&
        !tx.deletedAt &&
        String(tx.date) >= String(found.record.date)
      );
    });
  } else if (payload.applyToAllRecurrences && found.record.recurrenceGroupId) {
    targets = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
      return (
        tx.workspaceId === request.workspaceId &&
        tx.recurrenceGroupId === found.record.recurrenceGroupId &&
        !tx.deletedAt &&
        String(tx.date) >= String(found.record.date)
      );
    });
  }

  var deletedIds = targets.map(function (tx) {
    applyBalanceEffect_(tx, -1);
    updateRecordById_(SHEET_NAMES.TRANSACTIONS, tx.id, { deletedAt: nowIso_() });
    return tx.id;
  });

  return successResponse_({ success: true, deletedIds: deletedIds });
}

/**
 * Aplica (sign=1) ou reverte (sign=-1) o efeito de um lançamento no saldo da
 * conta (docs/BUSINESS_RULES.md § Atualização Automática dos Saldos).
 * Despesas no cartão (`paymentMethod = "credit"`) nunca afetam `Accounts` —
 * apenas o limite do cartão (Card.gs, Sprint 6).
 */
function applyBalanceEffect_(transaction, sign) {
  if (transaction.paymentMethod === PAYMENT_METHODS.CREDIT || !transaction.accountId) {
    return;
  }
  var delta = transaction.type === TRANSACTION_TYPES.INCOME ? transaction.amount : -transaction.amount;
  adjustAccountBalance_(transaction.accountId, delta * sign);
}

function adjustAccountBalance_(accountId, delta) {
  var found = findRecordRowById_(SHEET_NAMES.ACCOUNTS, accountId);
  if (!found) return;
  var newBalance = round2_((Number(found.record.balance) || 0) + delta);
  updateRecordById_(SHEET_NAMES.ACCOUNTS, accountId, { balance: newBalance });
}

/**
 * Gera as ocorrências futuras de um lançamento recorrente (docs/
 * BUSINESS_RULES.md § Recorrências). `baseTransaction` já é a 1ª ocorrência
 * (inserida separadamente por handleTransactionCreate); esta função retorna
 * apenas as `months - 1` ocorrências seguintes.
 */
function generateRecurrenceOccurrences_(baseTransaction, months) {
  var occurrences = [];
  for (var i = 1; i < months; i++) {
    var occurrence = Object.assign({}, baseTransaction);
    occurrence.id = generateId_();
    occurrence.date = addMonthsPreserveDay_(baseTransaction.date, i);
    occurrence.createdAt = nowIso_();
    occurrence.updatedAt = "";
    occurrence.deletedAt = "";
    occurrences.push(occurrence);
  }
  return occurrences;
}

// assertCardValid_ mudou para Card.gs a partir da Sprint 6 (junto com o
// resto do módulo "card": CRUD completo + getSummary).

