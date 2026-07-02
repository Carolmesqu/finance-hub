/**
 * Handlers do módulo "installment" (docs/API.md § Módulo installment).
 * Regras de geração e arredondamento em docs/BUSINESS_RULES.md § Parcelamentos.
 */

function sanitizeInstallment_(inst) {
  return {
    id: inst.id,
    workspaceId: inst.workspaceId,
    description: inst.description,
    totalAmount: Number(inst.totalAmount) || 0,
    installmentsCount: Number(inst.installmentsCount),
    installmentAmount: Number(inst.installmentAmount) || 0,
    startDate: inst.startDate,
    categoryId: inst.categoryId,
    cardId: inst.cardId || "",
    accountId: inst.accountId || "",
    createdBy: inst.createdBy,
    status: inst.status,
    createdAt: inst.createdAt,
    updatedAt: inst.updatedAt || "",
  };
}

function handleInstallmentCreate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["description", "totalAmount", "installmentsCount", "startDate", "categoryId"]);

  var totalAmount = Number(payload.totalAmount);
  if (!(totalAmount > 0)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O valor total deve ser maior que zero.", "totalAmount");
  }

  var installmentsCount = Number(payload.installmentsCount);
  if (isNaN(installmentsCount) || installmentsCount < 2 || installmentsCount > 60) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "A quantidade de parcelas deve estar entre 2 e 60.", "installmentsCount");
  }

  assertCategoryValid_(request.workspaceId, payload.categoryId, TRANSACTION_TYPES.EXPENSE);

  var accountId = "";
  var cardId = "";
  var paymentMethod = payload.paymentMethod || PAYMENT_METHODS.CREDIT;

  if (paymentMethod === PAYMENT_METHODS.CREDIT) {
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

  var paymentPeriod = payload.paymentPeriod || PAYMENT_PERIODS.START_OF_MONTH;

  var installmentAmount = round2_(totalAmount / installmentsCount);

  var installmentPlan = {
    id: generateId_(),
    workspaceId: request.workspaceId,
    description: String(payload.description).trim(),
    totalAmount: round2_(totalAmount),
    installmentsCount: installmentsCount,
    installmentAmount: installmentAmount,
    startDate: payload.startDate,
    categoryId: payload.categoryId,
    cardId: cardId,
    accountId: accountId,
    createdBy: user.id,
    status: "active",
    createdAt: nowIso_(),
    updatedAt: "",
  };

  insertRecord_(SHEET_NAMES.INSTALLMENTS, installmentPlan);

  var transactions = [];
  for (var i = 1; i <= installmentsCount; i++) {
    var date = addMonthsPreserveDay_(payload.startDate, i - 1);
    
    // Na última parcela, absorve a diferença de arredondamento
    var amount = installmentAmount;
    if (i === installmentsCount) {
      amount = round2_(totalAmount - (installmentAmount * (installmentsCount - 1)));
    }

    var tx = {
      id: generateId_(),
      workspaceId: request.workspaceId,
      type: TRANSACTION_TYPES.EXPENSE,
      description: String(payload.description).trim(),
      amount: amount,
      date: date,
      categoryId: payload.categoryId,
      accountId: accountId,
      cardId: cardId,
      paymentMethod: paymentMethod,
      paymentPeriod: paymentPeriod,
      isRecurring: false,
      recurrenceGroupId: "",
      installmentPlanId: installmentPlan.id,
      installmentNumber: i,
      installmentTotal: installmentsCount,
      notes: payload.notes || "",
      attachmentURL: "",
      createdBy: user.id,
      updatedBy: "",
      createdAt: nowIso_(),
      updatedAt: "",
      deletedAt: "",
    };

    insertRecord_(SHEET_NAMES.TRANSACTIONS, tx);
    applyBalanceEffect_(tx, 1);
    transactions.push(sanitizeTransaction_(tx));
  }

  return successResponse_({
    installment: sanitizeInstallment_(installmentPlan),
    transactions: transactions,
  });
}

function handleInstallmentGet(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  requireFields_(request.payload, ["installmentId"]);

  var found = findRecordRowById_(SHEET_NAMES.INSTALLMENTS, request.payload.installmentId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Plano de parcelamento não encontrado.");
  }

  var transactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return tx.workspaceId === request.workspaceId && tx.installmentPlanId === request.payload.installmentId && !tx.deletedAt;
  });

  transactions.sort(function (a, b) {
    return Number(a.installmentNumber) - Number(b.installmentNumber);
  });

  return successResponse_({
    installment: sanitizeInstallment_(found.record),
    transactions: transactions.map(sanitizeTransaction_),
  });
}

function handleInstallmentCancel(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);
  requireFields_(request.payload, ["installmentId"]);

  var found = findRecordRowById_(SHEET_NAMES.INSTALLMENTS, request.payload.installmentId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Plano de parcelamento não encontrado.");
  }

  var todayStr = todayDateOnly_();

  // Cancelar apenas parcelas futuras não "pagas" (cuja data de vencimento >= hoje)
  var futureTransactions = findRecords_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return (
      tx.workspaceId === request.workspaceId &&
      tx.installmentPlanId === request.payload.installmentId &&
      !tx.deletedAt &&
      String(tx.date) >= todayStr
    );
  });

  var cancelledIds = futureTransactions.map(function (tx) {
    applyBalanceEffect_(tx, -1);
    updateRecordById_(SHEET_NAMES.TRANSACTIONS, tx.id, { deletedAt: nowIso_() });
    return tx.id;
  });

  // Atualiza status do plano se todas as parcelas futuras forem canceladas
  updateRecordById_(SHEET_NAMES.INSTALLMENTS, request.payload.installmentId, {
    status: "cancelled",
    updatedAt: nowIso_(),
  });

  return successResponse_({
    success: true,
    cancelledTransactionIds: cancelledIds,
  });
}
