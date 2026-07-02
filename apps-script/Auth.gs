/**
 * Autenticação: validação do Firebase ID Token e sincronização de Users.
 * Ver docs/API.md § Módulo auth e docs/BUSINESS_RULES.md.
 *
 * O Apps Script não possui um verificador nativo de assinatura RS256/JWK, por
 * isso a validação do ID Token é delegada ao próprio Google, chamando o
 * endpoint oficial "accounts:lookup" da Identity Toolkit REST API — o mesmo
 * usado pelo Firebase Admin SDK por trás dos panos. Se o token for inválido
 * ou expirado, o Google responde com erro e tratamos como não autenticado.
 */

function verifyFirebaseIdToken_(idToken) {
  if (!idToken) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_TOKEN, "Token de autenticação ausente.");
  }

  var url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + getFirebaseWebApiKey_();
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true,
  });

  var body = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200 || !body.users || body.users.length === 0) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_TOKEN, "Token inválido ou expirado.");
  }

  var firebaseUser = body.users[0];
  var isGoogleProvider = (firebaseUser.providerUserInfo || []).some(function (provider) {
    return provider.providerId === "google.com";
  });

  if (!isGoogleProvider) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_TOKEN, "Provedor de autenticação não suportado.");
  }

  return {
    id: firebaseUser.localId,
    name: firebaseUser.displayName || "",
    email: firebaseUser.email || "",
    photoURL: firebaseUser.photoUrl || "",
  };
}

function upsertUser_(firebaseUser) {
  var existing = findRecordRowById_(SHEET_NAMES.USERS, firebaseUser.id);

  if (existing) {
    return updateRecordById_(SHEET_NAMES.USERS, firebaseUser.id, {
      name: firebaseUser.name,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      lastLoginAt: nowIso_(),
    });
  }

  var record = {
    id: firebaseUser.id,
    name: firebaseUser.name,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
    provider: "google",
    defaultWorkspaceId: "",
    theme: "system",
    createdAt: nowIso_(),
    lastLoginAt: nowIso_(),
  };
  return insertRecord_(SHEET_NAMES.USERS, record);
}

/**
 * Autentica a requisição (chamado no início de todo handler que não seja
 * auth.verify) e retorna o registro de Users já sincronizado.
 */
function authenticateRequest_(request) {
  var firebaseUser = verifyFirebaseIdToken_(request.idToken);
  var found = findRecordRowById_(SHEET_NAMES.USERS, firebaseUser.id);
  if (!found) {
    return upsertUser_(firebaseUser);
  }
  return found.record;
}

function sanitizeUser_(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photoURL: user.photoURL,
    defaultWorkspaceId: user.defaultWorkspaceId,
    theme: user.theme,
  };
}

function handleAuthVerify(request) {
  var firebaseUser = verifyFirebaseIdToken_(request.idToken);
  var user = upsertUser_(firebaseUser);
  var workspaces = listWorkspacesForUser_(user.id);
  return successResponse_({ user: sanitizeUser_(user), workspaces: workspaces });
}

function handleAuthLogout(request, user) {
  return successResponse_({ success: true });
}
