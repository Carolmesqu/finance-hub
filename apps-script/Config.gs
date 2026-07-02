/**
 * Configurações centrais do backend.
 *
 * Valores sensíveis (ID da planilha, Web API Key do Firebase) ficam em
 * Script Properties (menu Extensões > Propriedades do script no editor do
 * Apps Script), nunca hardcoded aqui — permite trocar de ambiente
 * (homologação/produção) sem alterar código.
 */

var SHEET_NAMES = {
  USERS: "Users",
  WORKSPACES: "Workspaces",
  MEMBERS: "Members",
  INVITES: "Invites",
  ACCOUNTS: "Accounts",
  CARDS: "Cards",
  CATEGORIES: "Categories",
  TRANSACTIONS: "Transactions",
  INSTALLMENTS: "Installments",
  TRANSFERS: "Transfers",
  SETTINGS: "Settings",
};

var ROLES = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
};

var ALL_ROLES = [ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER];

var TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
};

var ALL_TRANSACTION_TYPES = [TRANSACTION_TYPES.INCOME, TRANSACTION_TYPES.EXPENSE];

var PAYMENT_PERIODS = {
  START_OF_MONTH: "start_of_month",
  FORTNIGHT: "fortnight",
};

var ALL_PAYMENT_PERIODS = [PAYMENT_PERIODS.START_OF_MONTH, PAYMENT_PERIODS.FORTNIGHT];

var PAYMENT_METHODS = {
  PIX: "pix",
  CASH: "cash",
  DEBIT: "debit",
  CREDIT: "credit",
  BOLETO: "boleto",
};

var ALL_PAYMENT_METHODS = [
  PAYMENT_METHODS.PIX,
  PAYMENT_METHODS.CASH,
  PAYMENT_METHODS.DEBIT,
  PAYMENT_METHODS.CREDIT,
  PAYMENT_METHODS.BOLETO,
];

var ACCOUNT_TYPES = {
  CHECKING: "checking",
  SAVINGS: "savings",
  WALLET: "wallet",
  CASH: "cash",
  OTHER: "other",
};

var ALL_ACCOUNT_TYPES = [
  ACCOUNT_TYPES.CHECKING,
  ACCOUNT_TYPES.SAVINGS,
  ACCOUNT_TYPES.WALLET,
  ACCOUNT_TYPES.CASH,
  ACCOUNT_TYPES.OTHER,
];

var ERROR_CODES = {
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",
  FORBIDDEN: "FORBIDDEN",
  WORKSPACE_NOT_FOUND: "WORKSPACE_NOT_FOUND",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

function getSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "SPREADSHEET_ID não configurado em Script Properties.");
  }
  return id;
}

function getFirebaseWebApiKey_() {
  var key = PropertiesService.getScriptProperties().getProperty("FIREBASE_WEB_API_KEY");
  if (!key) {
    throw new AppError(ERROR_CODES.INTERNAL_ERROR, "FIREBASE_WEB_API_KEY não configurada em Script Properties.");
  }
  return key;
}
