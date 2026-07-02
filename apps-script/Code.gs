/**
 * Ponto de entrada do Web App do Google Apps Script.
 *
 * Toda comunicação Frontend ↔ Backend passa por doPost, seguindo o contrato
 * de envelope definido em docs/API.md: { action, idToken, workspaceId, payload }.
 *
 * O frontend envia o corpo com Content-Type "text/plain" de propósito (ver
 * assets/js/services/apiClient.js): isso faz o navegador tratar a requisição
 * como "simples" para fins de CORS, evitando o preflight OPTIONS que o Apps
 * Script não sabe responder. O corpo continua sendo um JSON válido — apenas
 * o cabeçalho HTTP é diferente do usual "application/json".
 */

/**
 * Retorna o mapa de ações → handlers. É uma FUNÇÃO (não uma constante de
 * nível superior) de propósito: o Apps Script carrega os arquivos .gs na
 * ordem em que aparecem na lista lateral do editor, e um objeto de nível
 * superior que referenciasse handleAuthVerify/handleWorkspace* diretamente
 * falharia com "ReferenceError" caso Code.gs seja carregado antes de
 * Auth.gs/Workspace.gs. Montando o mapa dentro de uma função, ele só é
 * avaliado dentro de doPost — quando todos os arquivos já terminaram de
 * carregar — eliminando essa dependência de ordem.
 */
function getActionHandlers_() {
  return {
    "auth.verify": { handler: handleAuthVerify, requiresAuth: false },
    "auth.logout": { handler: handleAuthLogout, requiresAuth: true },

    "workspace.list": { handler: handleWorkspaceList, requiresAuth: true },
    "workspace.create": { handler: handleWorkspaceCreate, requiresAuth: true },
    "workspace.update": { handler: handleWorkspaceUpdate, requiresAuth: true },
    "workspace.listMembers": { handler: handleWorkspaceListMembers, requiresAuth: true },
    "workspace.inviteMember": { handler: handleWorkspaceInviteMember, requiresAuth: true },
    "workspace.listMyInvites": { handler: handleWorkspaceListMyInvites, requiresAuth: true },
    "workspace.acceptInvite": { handler: handleWorkspaceAcceptInvite, requiresAuth: true },
    "workspace.declineInvite": { handler: handleWorkspaceDeclineInvite, requiresAuth: true },
    "workspace.revokeInvite": { handler: handleWorkspaceRevokeInvite, requiresAuth: true },
    "workspace.updateMemberRole": { handler: handleWorkspaceUpdateMemberRole, requiresAuth: true },
    "workspace.removeMember": { handler: handleWorkspaceRemoveMember, requiresAuth: true },

    "dashboard.getSummary": { handler: handleDashboardGetSummary, requiresAuth: true },

    "account.list": { handler: handleAccountList, requiresAuth: true },
    "account.create": { handler: handleAccountCreate, requiresAuth: true },
    "account.update": { handler: handleAccountUpdate, requiresAuth: true },
    "account.archive": { handler: handleAccountArchive, requiresAuth: true },

    "category.list": { handler: handleCategoryList, requiresAuth: true },

    "card.list": { handler: handleCardList, requiresAuth: true },
    "card.create": { handler: handleCardCreate, requiresAuth: true },
    "card.update": { handler: handleCardUpdate, requiresAuth: true },
    "card.archive": { handler: handleCardArchive, requiresAuth: true },
    "card.getSummary": { handler: handleCardGetSummary, requiresAuth: true },

    "transaction.list": { handler: handleTransactionList, requiresAuth: true },
    "transaction.get": { handler: handleTransactionGet, requiresAuth: true },
    "transaction.create": { handler: handleTransactionCreate, requiresAuth: true },
    "transaction.update": { handler: handleTransactionUpdate, requiresAuth: true },
    "transaction.delete": { handler: handleTransactionDelete, requiresAuth: true },

    "installment.create": { handler: handleInstallmentCreate, requiresAuth: true },
    "installment.get": { handler: handleInstallmentGet, requiresAuth: true },
    "installment.cancel": { handler: handleInstallmentCancel, requiresAuth: true },
    "report.generate": { handler: handleReportGenerate, requiresAuth: true },

    "transfer.list": { handler: handleTransferList, requiresAuth: true },
    "transfer.create": { handler: handleTransferCreate, requiresAuth: true },
    "transfer.delete": { handler: handleTransferDelete, requiresAuth: true },
  };
}

function doPost(e) {
  var response;

  try {
    var request = parseRequest_(e);
    var entry = getActionHandlers_()[request.action];

    if (!entry) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Ação '" + request.action + "' não existe.");
    }

    var user = entry.requiresAuth ? authenticateRequest_(request) : null;
    response = entry.handler(request, user);
  } catch (error) {
    var errorDetails = error && error.stack ? error.stack : String(error);
    Logger.log(errorDetails);
    // Guarda o erro numa Propriedade do Script para poder ser inspecionado
    // rodando debugLastError_() manualmente pelo editor — a tela de
    // "Execuções" nem sempre exibe o stack trace de chamadas via Web App.
    PropertiesService.getScriptProperties().setProperty("LAST_ERROR", errorDetails);
    response = errorResponse_(error);
  }

  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Corpo da requisição vazio.");
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (parseError) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "JSON inválido.");
  }

  if (!body.action) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Campo 'action' é obrigatório.", "action");
  }

  return {
    action: body.action,
    idToken: body.idToken || "",
    workspaceId: body.workspaceId || "",
    payload: body.payload || {},
  };
}

/**
 * Função de depuração: rode manualmente pelo editor (selecione
 * "debugLastError_" no dropdown de funções e clique em Executar) para ver,
 * no log de execução, o stack trace completo do último erro capturado por
 * doPost. Útil quando a tela "Execuções" não abre os detalhes.
 */
function debugLastError_() {
  var lastError = PropertiesService.getScriptProperties().getProperty("LAST_ERROR");
  Logger.log(lastError || "Nenhum erro registrado ainda.");
}

/**
 * Permite verificar rapidamente, pelo navegador, se o deployment está no ar
 * (GET não expõe nenhum dado sensível).
 */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, data: { status: "FinanceHub API online" }, error: null })
  ).setMimeType(ContentService.MimeType.JSON);
}
