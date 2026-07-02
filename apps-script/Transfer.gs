/**
 * Handlers do módulo "transfer" (docs/API.md § Módulo transfer).
 * Regras de saldos em docs/BUSINESS_RULES.md § Transferência entre contas.
 */

function sanitizeTransfer_(t) {
  return {
    id: t.id,
    workspaceId: t.workspaceId,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    amount: Number(t.amount) || 0,
    date: t.date,
    notes: t.notes || "",
    createdBy: t.createdBy,
    createdAt: t.createdAt,
  };
}

function handleTransferCreate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["fromAccountId", "toAccountId", "amount", "date"]);

  var amount = Number(payload.amount);
  if (!(amount > 0)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O valor da transferência deve ser maior que zero.", "amount");
  }

  var fromAccountId = payload.fromAccountId;
  var toAccountId = payload.toAccountId;

  if (fromAccountId === toAccountId) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "A conta de destino deve ser diferente da conta de origem.", "toAccountId");
  }

  assertAccountValid_(request.workspaceId, fromAccountId);
  assertAccountValid_(request.workspaceId, toAccountId);

  var transfer = {
    id: generateId_(),
    workspaceId: request.workspaceId,
    fromAccountId: fromAccountId,
    toAccountId: toAccountId,
    amount: round2_(amount),
    date: payload.date,
    notes: String(payload.notes || "").trim(),
    createdBy: user.id,
    createdAt: nowIso_(),
    deletedAt: "",
  };

  // LockService é disparado implicitamente por insertRecord_ e updateRecordById_
  insertRecord_(SHEET_NAMES.TRANSFERS, transfer);

  // Efeito atômico no saldo de ambas as contas (docs/BUSINESS_RULES.md)
  adjustAccountBalance_(fromAccountId, -round2_(amount));
  adjustAccountBalance_(toAccountId, round2_(amount));

  return successResponse_(sanitizeTransfer_(transfer));
}

function handleTransferList(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  
  var transfers = findRecords_(SHEET_NAMES.TRANSFERS, function (t) {
    return t.workspaceId === request.workspaceId && !t.deletedAt;
  });

  var accounts = findRecords_(SHEET_NAMES.ACCOUNTS, function (a) {
    return a.workspaceId === request.workspaceId;
  });
  var accountMap = {};
  accounts.forEach(function (a) {
    accountMap[a.id] = a.name;
  });

  var result = transfers.map(function (t) {
    var record = sanitizeTransfer_(t);
    record.fromAccountName = accountMap[t.fromAccountId] || "Conta Não Encontrada";
    record.toAccountName = accountMap[t.toAccountId] || "Conta Não Encontrada";
    return record;
  });

  result.sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });

  return successResponse_(result);
}

/**
 * Exclui uma transferência (soft delete) e reverte o impacto nos saldos.
 */
function handleTransferDelete(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["transferId"]);

  var found = findRecordRowById_(SHEET_NAMES.TRANSFERS, payload.transferId);
  if (!found || found.record.workspaceId !== request.workspaceId || found.record.deletedAt) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Transferência não encontrada.");
  }

  var transfer = found.record;
  var amount = Number(transfer.amount) || 0;

  // Marca como deletada
  updateRecordById_(SHEET_NAMES.TRANSFERS, transfer.id, { deletedAt: nowIso_() });

  // Reverte efeito no saldo de ambas as contas
  adjustAccountBalance_(transfer.fromAccountId, round2_(amount));
  adjustAccountBalance_(transfer.toAccountId, -round2_(amount));

  return successResponse_({ success: true });
}
