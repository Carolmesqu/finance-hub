/**
 * Camada de acesso ao Google Sheets (banco de dados).
 *
 * Convenções (ver docs/database.md): a primeira linha de cada aba é o
 * cabeçalho; toda aba possui uma coluna "id". Implementação lê a aba inteira
 * em memória por requisição — aceitável na escala de um Workspace pessoal/
 * pequenas equipes (ver observação sobre índices em docs/database.md).
 */

var requestCache_ = {};

function invalidateCache_(sheetName) {
  if (requestCache_[sheetName]) {
    delete requestCache_[sheetName];
  }
}

function clearCache_() {
  requestCache_ = {};
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getSheet_(sheetName) {
  var sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      "Aba '" + sheetName + "' não encontrada. Rode initializeDatabase() no editor do Apps Script."
    );
  }
  return sheet;
}

function getHeaders_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function rowToRecord_(sheetName, headers, row) {
  var record = {};
  var dateOnlyColumns = getDateOnlyColumnsBySheet_()[sheetName] || [];

  headers.forEach(function (header, index) {
    var value = row[index] !== undefined ? row[index] : "";
    if (value instanceof Date) {
      if (dateOnlyColumns.indexOf(header) !== -1) {
        value = formatDateOnly_(value);
      } else {
        value = value.toISOString();
      }
    }
    record[header] = value;
  });
  return record;
}

function recordToRow_(headers, record) {
  return headers.map(function (header) {
    return record[header] !== undefined ? record[header] : "";
  });
}

function getAllRecords_(sheetName) {
  if (requestCache_[sheetName]) {
    return requestCache_[sheetName];
  }

  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var headers = getHeaders_(sheet);
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  
  var records = values.map(function (row) {
    return rowToRecord_(sheetName, headers, row);
  });

  requestCache_[sheetName] = records;
  return records;
}

function findRecordRowById_(sheetName, id) {
  var records = getAllRecords_(sheetName);
  for (var i = 0; i < records.length; i++) {
    if (records[i].id === id) {
      var sheet = getSheet_(sheetName);
      var headers = getHeaders_(sheet);
      return {
        sheet: sheet,
        headers: headers,
        rowIndex: i + 2,
        record: records[i]
      };
    }
  }
  return null;
}

function insertRecord_(sheetName, record) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Aguarda até 10 segundos
    
    var sheet = getSheet_(sheetName);
    var headers = getHeaders_(sheet);
    sheet.appendRow(recordToRow_(headers, record));
    
    invalidateCache_(sheetName);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function updateRecordById_(sheetName, id, patch) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Aguarda até 10 segundos
    
    var found = findRecordRowById_(sheetName, id);
    if (!found) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Registro não encontrado em '" + sheetName + "'.");
    }
    var updated = Object.assign({}, found.record, patch);
    found.sheet.getRange(found.rowIndex, 1, 1, found.headers.length).setValues([recordToRow_(found.headers, updated)]);
    
    invalidateCache_(sheetName);
    return updated;
  } finally {
    lock.releaseLock();
  }
}

function findRecords_(sheetName, predicate) {
  return getAllRecords_(sheetName).filter(predicate);
}

function findOneRecord_(sheetName, predicate) {
  var records = findRecords_(sheetName, predicate);
  return records.length > 0 ? records[0] : null;
}
