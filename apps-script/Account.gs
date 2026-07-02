/**
 * Handlers do módulo "account" (docs/API.md § Módulo account).
 * Regras de permissão seguem a Matriz de Permissões em docs/BUSINESS_RULES.md
 * (Contas: leitura para todos os papéis; escrita somente admin/editor).
 */

function sanitizeAccount_(account) {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    institution: account.institution || "",
    balance: Number(account.balance) || 0,
    color: account.color || "",
    icon: account.icon || "",
    includeInTotal: account.includeInTotal !== false,
    archivedAt: account.archivedAt || "",
    createdAt: account.createdAt,
  };
}

function handleAccountList(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  var includeArchived = !!(request.payload && request.payload.includeArchived);

  var accounts = findRecords_(SHEET_NAMES.ACCOUNTS, function (account) {
    if (account.workspaceId !== request.workspaceId) return false;
    if (!includeArchived && account.archivedAt) return false;
    return true;
  });

  return successResponse_(accounts.map(sanitizeAccount_));
}

function handleAccountCreate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["name", "type"]);

  if (ALL_ACCOUNT_TYPES.indexOf(payload.type) === -1) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Tipo de conta inválido.", "type");
  }

  var account = {
    id: generateId_(),
    workspaceId: request.workspaceId,
    name: payload.name.trim(),
    type: payload.type,
    institution: payload.institution || "",
    balance: round2_(Number(payload.balance) || 0),
    color: payload.color || "",
    icon: payload.icon || "",
    includeInTotal: payload.includeInTotal !== false,
    archivedAt: "",
    createdAt: nowIso_(),
    updatedAt: "",
  };

  insertRecord_(SHEET_NAMES.ACCOUNTS, account);
  return successResponse_(sanitizeAccount_(account));
}

function handleAccountUpdate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["accountId"]);

  var found = findRecordRowById_(SHEET_NAMES.ACCOUNTS, payload.accountId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Conta não encontrada.");
  }

  var patch = { updatedAt: nowIso_() };
  if (payload.name !== undefined) patch.name = String(payload.name).trim();
  if (payload.type !== undefined) {
    if (ALL_ACCOUNT_TYPES.indexOf(payload.type) === -1) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Tipo de conta inválido.", "type");
    }
    patch.type = payload.type;
  }
  if (payload.institution !== undefined) patch.institution = payload.institution;
  if (payload.color !== undefined) patch.color = payload.color;
  if (payload.icon !== undefined) patch.icon = payload.icon;
  if (payload.includeInTotal !== undefined) patch.includeInTotal = !!payload.includeInTotal;
  // "balance" nunca é aceito aqui de propósito (docs/API.md § account.update)
  // — é sempre derivado das operações (ver docs/BUSINESS_RULES.md).

  var updated = updateRecordById_(SHEET_NAMES.ACCOUNTS, payload.accountId, patch);
  return successResponse_(sanitizeAccount_(updated));
}

function handleAccountArchive(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN, ROLES.EDITOR]);

  var payload = request.payload || {};
  requireFields_(payload, ["accountId"]);

  var found = findRecordRowById_(SHEET_NAMES.ACCOUNTS, payload.accountId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Conta não encontrada.");
  }

  var hasTransactions = findOneRecord_(SHEET_NAMES.TRANSACTIONS, function (tx) {
    return tx.accountId === payload.accountId && !tx.deletedAt;
  });
  var hasTransfers = findOneRecord_(SHEET_NAMES.TRANSFERS, function (transfer) {
    return (transfer.fromAccountId === payload.accountId || transfer.toAccountId === payload.accountId) && !transfer.deletedAt;
  });

  if ((hasTransactions || hasTransfers) && !payload.force) {
    throw new AppError(ERROR_CODES.CONFLICT, "Esta conta possui lançamentos vinculados. Envie a confirmação para arquivar mesmo assim.");
  }

  updateRecordById_(SHEET_NAMES.ACCOUNTS, payload.accountId, { archivedAt: nowIso_() });
  return successResponse_({ success: true });
}

/** Usado por Transaction.gs para validar `accountId` recebido no payload. */
function assertAccountValid_(workspaceId, accountId) {
  var found = findRecordRowById_(SHEET_NAMES.ACCOUNTS, accountId);
  if (!found || found.record.workspaceId !== workspaceId || found.record.archivedAt) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Conta inválida.", "accountId");
  }
}
