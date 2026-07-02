/**
 * Handlers do módulo "category" (docs/API.md § Módulo category).
 *
 * Sprint 4 entrega apenas leitura (`category.list`), suficiente para o
 * seletor de categoria do formulário de Receitas usar as categorias padrão
 * já semeadas na criação do Workspace (Workspace.gs). Criação/edição/
 * arquivamento de categorias personalizadas chega quando a tela de
 * Categorias for implementada.
 */

function sanitizeCategory_(category) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color || "",
    icon: category.icon || "",
    parentId: category.parentId || "",
    isDefault: !!category.isDefault,
  };
}

function handleCategoryList(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);
  var type = request.payload ? request.payload.type : null;

  var categories = findRecords_(SHEET_NAMES.CATEGORIES, function (category) {
    if (category.workspaceId !== request.workspaceId || category.archivedAt) return false;
    if (type && category.type !== type) return false;
    return true;
  });

  return successResponse_(categories.map(sanitizeCategory_));
}

/** Usado por Transaction.gs para validar `categoryId` recebido no payload. */
function assertCategoryValid_(workspaceId, categoryId, type) {
  var found = findRecordRowById_(SHEET_NAMES.CATEGORIES, categoryId);
  if (!found || found.record.workspaceId !== workspaceId || found.record.archivedAt) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Categoria inválida.", "categoryId");
  }
  if (found.record.type !== type) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "A categoria selecionada não é compatível com este tipo de lançamento.",
      "categoryId"
    );
  }
}
