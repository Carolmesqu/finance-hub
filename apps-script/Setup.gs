/**
 * Inicialização do banco de dados (Google Sheets).
 *
 * Execute a função initializeDatabase() manualmente, uma única vez, pelo
 * editor do Apps Script (selecione a função no dropdown ao lado de "Executar"
 * e clique em Executar). É idempotente: pode rodar novamente sem duplicar
 * abas ou perder dados existentes (apenas garante que cabeçalhos existam).
 *
 * A partir da Sprint 3 (Dashboard), já criamos aqui as abas de Accounts,
 * Cards, Categories, Transactions, Installments, Transfers e Settings —
 * mesmo antes de existirem telas de cadastro para todas elas (chegam nas
 * Sprints 4 a 7) — porque o Dashboard precisa consultá-las (ainda que
 * vazias) para calcular o resumo. `Logs` será adicionada quando as ações que
 * a alimentam forem implementadas.
 */

/**
 * Retorna as definições de abas do banco de dados. É uma FUNÇÃO (não uma
 * constante de nível superior) de propósito: o Apps Script carrega os
 * arquivos .gs na ordem em que aparecem na lista lateral do editor, e um
 * array de nível superior que referenciasse SHEET_NAMES diretamente
 * falharia com "ReferenceError" caso Setup.gs seja carregado antes de
 * Config.gs — e, pior, pode interromper a carga de TODO o projeto,
 * deixando até constantes de outros arquivos indefinidas. Montando o array
 * dentro de uma função, ele só é avaliado quando initializeDatabase() (ou
 * removeDefaultBlankSheet_) realmente rodam — quando todos os arquivos já
 * terminaram de carregar.
 */
function getSheetDefinitions_() {
  return [
    {
      name: SHEET_NAMES.USERS,
      headers: ["id", "name", "email", "photoURL", "provider", "defaultWorkspaceId", "theme", "createdAt", "lastLoginAt"],
    },
    {
      name: SHEET_NAMES.WORKSPACES,
      headers: ["id", "name", "ownerId", "currency", "photoURL", "createdAt", "updatedAt", "archivedAt"],
    },
    {
      name: SHEET_NAMES.MEMBERS,
      headers: ["id", "workspaceId", "userId", "role", "status", "invitedBy", "joinedAt", "removedAt"],
    },
    {
      name: SHEET_NAMES.INVITES,
      headers: ["id", "workspaceId", "email", "role", "token", "status", "invitedBy", "createdAt", "expiresAt", "acceptedAt"],
    },
    {
      name: SHEET_NAMES.ACCOUNTS,
      headers: ["id", "workspaceId", "name", "type", "institution", "balance", "color", "icon", "includeInTotal", "archivedAt", "createdAt", "updatedAt"],
    },
    {
      name: SHEET_NAMES.CARDS,
      headers: ["id", "workspaceId", "name", "limit", "closingDay", "dueDay", "brand", "institution", "color", "billingAccountId", "archivedAt", "createdAt", "updatedAt"],
    },
    {
      name: SHEET_NAMES.CATEGORIES,
      headers: ["id", "workspaceId", "name", "type", "color", "icon", "parentId", "isDefault", "archivedAt", "createdAt"],
    },
    {
      name: SHEET_NAMES.TRANSACTIONS,
      headers: [
        "id",
        "workspaceId",
        "type",
        "description",
        "amount",
        "date",
        "categoryId",
        "accountId",
        "cardId",
        "paymentMethod",
        "paymentPeriod",
        "isRecurring",
        "recurrenceGroupId",
        "installmentPlanId",
        "installmentNumber",
        "installmentTotal",
        "notes",
        "attachmentURL",
        "createdBy",
        "updatedBy",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ],
    },
    {
      name: SHEET_NAMES.INSTALLMENTS,
      headers: [
        "id",
        "workspaceId",
        "description",
        "totalAmount",
        "installmentsCount",
        "installmentAmount",
        "startDate",
        "categoryId",
        "cardId",
        "accountId",
        "createdBy",
        "status",
        "createdAt",
        "updatedAt",
      ],
    },
    {
      name: SHEET_NAMES.TRANSFERS,
      headers: ["id", "workspaceId", "fromAccountId", "toAccountId", "amount", "date", "notes", "createdBy", "createdAt", "deletedAt"],
    },
    {
      name: SHEET_NAMES.SETTINGS,
      headers: ["id", "workspaceId", "fortnightSplitDay", "monthStartDay", "theme", "notificationsEnabled", "defaultAccountId", "createdAt", "updatedAt"],
    },
  ];
}

/**
 * Execute manualmente UMA VEZ pelo editor do Apps Script (dropdown de
 * funções → "backfillWorkspaceDefaults" → Executar).
 *
 * Necessário porque `createDefaultSettings_`/`createDefaultCategories_`
 * (Workspace.gs) só rodam automaticamente em Workspaces criados A PARTIR da
 * Sprint 4 — Workspaces criados antes disso (ex.: nos testes da Sprint 2/3)
 * nunca receberam Settings/Categories. Idempotente: pula qualquer Workspace
 * que já tenha os registros, então pode ser executado quantas vezes for
 * preciso sem duplicar nada.
 */
function backfillWorkspaceDefaults() {
  var workspaces = findRecords_(SHEET_NAMES.WORKSPACES, function (workspace) {
    return !workspace.archivedAt;
  });

  var settingsCreated = 0;
  var categoriesCreated = 0;

  workspaces.forEach(function (workspace) {
    var hasSettings = findOneRecord_(SHEET_NAMES.SETTINGS, function (settings) {
      return settings.workspaceId === workspace.id;
    });
    if (!hasSettings) {
      createDefaultSettings_(workspace.id);
      settingsCreated++;
    }

    var hasCategories = findOneRecord_(SHEET_NAMES.CATEGORIES, function (category) {
      return category.workspaceId === workspace.id;
    });
    if (!hasCategories) {
      createDefaultCategories_(workspace.id);
      categoriesCreated++;
    }
  });

  Logger.log(
    "Backfill concluído: Settings criadas para " +
      settingsCreated +
      " workspace(s); Categorias criadas para " +
      categoriesCreated +
      " workspace(s)."
  );
}

/**
 * Colunas que armazenam data pura no formato "YYYY-MM-DD" (sem hora).
 * Precisam ficar como TEXTO simples ("@") na planilha — do contrário, o
 * Google Sheets converte automaticamente essas strings em um valor de Data
 * nativo (mesmo quando gravadas via Apps Script), quebrando qualquer
 * comparação por texto feita no backend (ex.: o filtro de mês em
 * Dashboard.gs, `String(tx.date).slice(0, 7)`). Ver docs/database.md —
 * convenção "date vs datetime". Campos de datetime (createdAt/updatedAt,
 * gerados por nowIso_()) não entram aqui: o formato ISO completo com
 * hora e "Z" não é auto-convertido pelo Sheets.
 */
function getDateOnlyColumnsBySheet_() {
  var map = {};
  map[SHEET_NAMES.TRANSACTIONS] = ["date"];
  map[SHEET_NAMES.INSTALLMENTS] = ["startDate"];
  map[SHEET_NAMES.TRANSFERS] = ["date"];
  return map;
}

function initializeDatabase() {
  var spreadsheet = getSpreadsheet_();
  var sheetDefinitions = getSheetDefinitions_();
  var dateOnlyColumnsBySheet = getDateOnlyColumnsBySheet_();

  sheetDefinitions.forEach(function (definition) {
    var sheet = spreadsheet.getSheetByName(definition.name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(definition.name);
    }
    sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]);
    sheet.setFrozenRows(1);

    var dateOnlyFields = dateOnlyColumnsBySheet[definition.name] || [];
    dateOnlyFields.forEach(function (fieldName) {
      var columnIndex = definition.headers.indexOf(fieldName) + 1;
      if (columnIndex > 0) {
        sheet.getRange(1, columnIndex, sheet.getMaxRows(), 1).setNumberFormat("@");
      }
    });
  });

  removeDefaultBlankSheet_(spreadsheet);

  Logger.log(
    "Banco de dados inicializado com sucesso: " +
      sheetDefinitions
        .map(function (definition) {
          return definition.name;
        })
        .join(", ")
  );
}

function removeDefaultBlankSheet_(spreadsheet) {
  var defaultNames = ["Sheet1", "Página1"];
  var definedNames = getSheetDefinitions_().map(function (definition) {
    return definition.name;
  });

  defaultNames.forEach(function (name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (sheet && definedNames.indexOf(name) === -1 && spreadsheet.getSheets().length > 1) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

/**
 * Execute manualmente UMA VEZ pelo editor do Apps Script (dropdown de
 * funções → "fixExistingDateValues" → Executar) para corrigir linhas de
 * `Transactions`/`Installments`/`Transfers` já gravadas ANTES da correção de
 * formato em `initializeDatabase()` — nelas, o Google Sheets pode ter
 * convertido o texto "YYYY-MM-DD" em um valor de Data nativo. Idempotente:
 * linhas já corrigidas (já em texto) são ignoradas.
 */
function fixExistingDateValues() {
  var spreadsheet = getSpreadsheet_();
  var dateOnlyColumnsBySheet = getDateOnlyColumnsBySheet_();
  var fixedCount = 0;

  Object.keys(dateOnlyColumnsBySheet).forEach(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;

    var headers = getHeaders_(sheet);

    dateOnlyColumnsBySheet[sheetName].forEach(function (fieldName) {
      var columnIndex = headers.indexOf(fieldName) + 1;
      if (columnIndex === 0) return;

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;

      var range = sheet.getRange(2, columnIndex, lastRow - 1, 1);
      var values = range.getValues();

      var fixedValues = values.map(function (row) {
        var value = row[0];
        if (value instanceof Date) {
          fixedCount++;
          return [formatDateOnly_(value)];
        }
        return [value];
      });

      // Define o formato como texto ANTES de regravar, senão o Sheets
      // converteria a string de volta para Data ao escrever.
      range.setNumberFormat("@");
      range.setValues(fixedValues);
    });
  });

  Logger.log("Correção concluída: " + fixedCount + " célula(s) de data convertida(s) de volta para texto.");
}
