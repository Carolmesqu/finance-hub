/**
 * Handlers do módulo "workspace" (docs/API.md § Módulo workspace).
 * Regras de permissão seguem a Matriz de Permissões em docs/BUSINESS_RULES.md.
 */

function listWorkspacesForUser_(userId) {
  var memberships = findRecords_(SHEET_NAMES.MEMBERS, function (member) {
    return member.userId === userId && member.status === "active";
  });

  return memberships
    .map(function (member) {
      var found = findRecordRowById_(SHEET_NAMES.WORKSPACES, member.workspaceId);
      if (!found || found.record.archivedAt) return null;
      return sanitizeWorkspace_(found.record, member.role);
    })
    .filter(function (workspace) {
      return workspace !== null;
    });
}

function sanitizeWorkspace_(workspace, role) {
  return {
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    currency: workspace.currency,
    photoURL: workspace.photoURL,
    createdAt: workspace.createdAt,
    role: role,
  };
}

function sanitizeInvite_(invite) {
  return {
    id: invite.id,
    workspaceId: invite.workspaceId,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    createdAt: invite.createdAt,
  };
}

/**
 * Inclui o token — só deve ser usado ao responder ao PRÓPRIO destinatário do
 * convite (workspace.listMyInvites), nunca em listagens administrativas.
 */
function sanitizeInviteForRecipient_(invite, workspaceName) {
  var base = sanitizeInvite_(invite);
  base.token = invite.token;
  base.workspaceName = workspaceName;
  return base;
}

function getActiveMembership_(userId, workspaceId) {
  return findOneRecord_(SHEET_NAMES.MEMBERS, function (member) {
    return member.userId === userId && member.workspaceId === workspaceId && member.status === "active";
  });
}

function assertWorkspaceAccess_(user, workspaceId) {
  if (!workspaceId) {
    throw new AppError(ERROR_CODES.WORKSPACE_NOT_FOUND, "Nenhum Workspace informado na requisição.");
  }
  var membership = getActiveMembership_(user.id, workspaceId);
  if (!membership) {
    throw new AppError(ERROR_CODES.WORKSPACE_NOT_FOUND, "Workspace não encontrado ou você não é membro.");
  }
  return membership;
}

function assertRole_(membership, allowedRoles) {
  if (allowedRoles.indexOf(membership.role) === -1) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Você não tem permissão para executar esta ação.");
  }
}

function handleWorkspaceList(request, user) {
  return successResponse_(listWorkspacesForUser_(user.id));
}

function handleWorkspaceCreate(request, user) {
  requireFields_(request.payload, ["name"]);
  var name = request.payload.name.trim();
  if (name.length < 2) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "O nome do Workspace deve ter ao menos 2 caracteres.", "name");
  }

  var workspace = {
    id: generateId_(),
    name: name,
    ownerId: user.id,
    currency: request.payload.currency || "BRL",
    photoURL: request.payload.photoURL || "",
    createdAt: nowIso_(),
    updatedAt: "",
    archivedAt: "",
  };
  insertRecord_(SHEET_NAMES.WORKSPACES, workspace);

  insertRecord_(SHEET_NAMES.MEMBERS, {
    id: generateId_(),
    workspaceId: workspace.id,
    userId: user.id,
    role: ROLES.ADMIN,
    status: "active",
    invitedBy: "",
    joinedAt: nowIso_(),
    removedAt: "",
  });

  createDefaultSettings_(workspace.id);
  createDefaultCategories_(workspace.id);

  return successResponse_(sanitizeWorkspace_(workspace, ROLES.ADMIN));
}

/**
 * Cria o registro 1:1 de Settings com os valores default (docs/database.md
 * § Settings). Chamado apenas na criação do Workspace — nunca duplicar.
 */
function createDefaultSettings_(workspaceId) {
  insertRecord_(SHEET_NAMES.SETTINGS, {
    id: generateId_(),
    workspaceId: workspaceId,
    fortnightSplitDay: 15,
    monthStartDay: 1,
    theme: "system",
    notificationsEnabled: true,
    defaultAccountId: "",
    createdAt: nowIso_(),
    updatedAt: "",
  });
}

/**
 * Popula as categorias padrão de um novo Workspace (docs/database.md §
 * Categories, docs/PROJECT.md). `isDefault: true` impede que sejam
 * arquivadas (regra validada em category.archive, a implementar).
 */
function createDefaultCategories_(workspaceId) {
  var defaults = [
    { name: "Mercado", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Combustível", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Farmácia", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Educação", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Casa", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Internet", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Lazer", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Streaming", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Viagem", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Investimentos", type: TRANSACTION_TYPES.EXPENSE },
    { name: "Salário", type: TRANSACTION_TYPES.INCOME },
    { name: "Extras", type: TRANSACTION_TYPES.INCOME },
    { name: "Freelancer", type: TRANSACTION_TYPES.INCOME },
  ];

  defaults.forEach(function (category) {
    insertRecord_(SHEET_NAMES.CATEGORIES, {
      id: generateId_(),
      workspaceId: workspaceId,
      name: category.name,
      type: category.type,
      color: "",
      icon: "",
      parentId: "",
      isDefault: true,
      archivedAt: "",
      createdAt: nowIso_(),
    });
  });
}

function handleWorkspaceUpdate(request, user) {
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN]);

  var patch = { updatedAt: nowIso_() };
  if (request.payload.name) patch.name = request.payload.name.trim();
  if (request.payload.currency) patch.currency = request.payload.currency;
  if (request.payload.photoURL !== undefined) patch.photoURL = request.payload.photoURL;

  var updated = updateRecordById_(SHEET_NAMES.WORKSPACES, request.workspaceId, patch);
  return successResponse_(sanitizeWorkspace_(updated, membership.role));
}

function handleWorkspaceListMembers(request, user) {
  assertWorkspaceAccess_(user, request.workspaceId);

  var members = findRecords_(SHEET_NAMES.MEMBERS, function (member) {
    return member.workspaceId === request.workspaceId && member.status === "active";
  }).map(function (member) {
    var found = findRecordRowById_(SHEET_NAMES.USERS, member.userId);
    return {
      id: member.id,
      userId: member.userId,
      name: found ? found.record.name : "",
      email: found ? found.record.email : "",
      photoURL: found ? found.record.photoURL : "",
      role: member.role,
      joinedAt: member.joinedAt,
    };
  });

  var invites = findRecords_(SHEET_NAMES.INVITES, function (invite) {
    return invite.workspaceId === request.workspaceId && invite.status === "pending";
  }).map(sanitizeInvite_);

  return successResponse_({ members: members, invites: invites });
}

function handleWorkspaceInviteMember(request, user) {
  requireFields_(request.payload, ["email", "role"]);
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN]);

  var email = request.payload.email.trim().toLowerCase();
  if (!isValidEmail_(email)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "E-mail inválido.", "email");
  }
  if (!isValidRole_(request.payload.role)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Papel inválido.", "role");
  }

  var existingInvite = findOneRecord_(SHEET_NAMES.INVITES, function (invite) {
    return invite.workspaceId === request.workspaceId && invite.email === email && invite.status === "pending";
  });
  if (existingInvite) {
    throw new AppError(ERROR_CODES.CONFLICT, "Já existe um convite pendente para este e-mail.");
  }

  var existingUser = findOneRecord_(SHEET_NAMES.USERS, function (record) {
    return record.email === email;
  });
  if (existingUser && getActiveMembership_(existingUser.id, request.workspaceId)) {
    throw new AppError(ERROR_CODES.CONFLICT, "Este usuário já é membro do Workspace.");
  }

  var invite = {
    id: generateId_(),
    workspaceId: request.workspaceId,
    email: email,
    role: request.payload.role,
    token: generateToken_(),
    status: "pending",
    invitedBy: user.id,
    createdAt: nowIso_(),
    expiresAt: "",
    acceptedAt: "",
  };
  insertRecord_(SHEET_NAMES.INVITES, invite);

  return successResponse_(sanitizeInvite_(invite));
}

function handleWorkspaceListMyInvites(request, user) {
  var invites = findRecords_(SHEET_NAMES.INVITES, function (invite) {
    return invite.email === user.email && invite.status === "pending";
  }).map(function (invite) {
    var workspaceFound = findRecordRowById_(SHEET_NAMES.WORKSPACES, invite.workspaceId);
    return sanitizeInviteForRecipient_(invite, workspaceFound ? workspaceFound.record.name : "");
  });

  return successResponse_(invites);
}

function findPendingInviteByToken_(token) {
  return findOneRecord_(SHEET_NAMES.INVITES, function (invite) {
    return invite.token === token && invite.status === "pending";
  });
}

function handleWorkspaceAcceptInvite(request, user) {
  requireFields_(request.payload, ["token"]);
  var invite = findPendingInviteByToken_(request.payload.token);

  if (!invite) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Convite não encontrado ou já utilizado.");
  }
  if (invite.email !== user.email) {
    throw new AppError(ERROR_CODES.CONFLICT, "Este convite pertence a outro e-mail.");
  }

  updateRecordById_(SHEET_NAMES.INVITES, invite.id, { status: "accepted", acceptedAt: nowIso_() });

  insertRecord_(SHEET_NAMES.MEMBERS, {
    id: generateId_(),
    workspaceId: invite.workspaceId,
    userId: user.id,
    role: invite.role,
    status: "active",
    invitedBy: invite.invitedBy,
    joinedAt: nowIso_(),
    removedAt: "",
  });

  var workspaceFound = findRecordRowById_(SHEET_NAMES.WORKSPACES, invite.workspaceId);
  return successResponse_(sanitizeWorkspace_(workspaceFound.record, invite.role));
}

function handleWorkspaceDeclineInvite(request, user) {
  requireFields_(request.payload, ["token"]);
  var invite = findPendingInviteByToken_(request.payload.token);

  if (!invite) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Convite não encontrado ou já utilizado.");
  }
  if (invite.email !== user.email) {
    throw new AppError(ERROR_CODES.CONFLICT, "Este convite pertence a outro e-mail.");
  }

  updateRecordById_(SHEET_NAMES.INVITES, invite.id, { status: "revoked" });
  return successResponse_({ success: true });
}

function handleWorkspaceRevokeInvite(request, user) {
  requireFields_(request.payload, ["inviteId"]);
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN]);

  var found = findRecordRowById_(SHEET_NAMES.INVITES, request.payload.inviteId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Convite não encontrado.");
  }

  updateRecordById_(SHEET_NAMES.INVITES, request.payload.inviteId, { status: "revoked" });
  return successResponse_({ success: true });
}

function handleWorkspaceUpdateMemberRole(request, user) {
  requireFields_(request.payload, ["memberId", "role"]);
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN]);

  if (!isValidRole_(request.payload.role)) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Papel inválido.", "role");
  }

  var found = findRecordRowById_(SHEET_NAMES.MEMBERS, request.payload.memberId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Membro não encontrado.");
  }

  if (found.record.role === ROLES.ADMIN && request.payload.role !== ROLES.ADMIN) {
    var remainingAdmins = findRecords_(SHEET_NAMES.MEMBERS, function (member) {
      return (
        member.workspaceId === request.workspaceId &&
        member.role === ROLES.ADMIN &&
        member.status === "active" &&
        member.id !== found.record.id
      );
    });
    if (remainingAdmins.length === 0) {
      throw new AppError(ERROR_CODES.CONFLICT, "O Workspace precisa de ao menos um administrador.");
    }
  }

  var updated = updateRecordById_(SHEET_NAMES.MEMBERS, request.payload.memberId, { role: request.payload.role });
  return successResponse_(updated);
}

function handleWorkspaceRemoveMember(request, user) {
  requireFields_(request.payload, ["memberId"]);
  var membership = assertWorkspaceAccess_(user, request.workspaceId);
  assertRole_(membership, [ROLES.ADMIN]);

  var found = findRecordRowById_(SHEET_NAMES.MEMBERS, request.payload.memberId);
  if (!found || found.record.workspaceId !== request.workspaceId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Membro não encontrado.");
  }

  var workspaceFound = findRecordRowById_(SHEET_NAMES.WORKSPACES, request.workspaceId);
  if (workspaceFound.record.ownerId === found.record.userId) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "O dono do Workspace não pode ser removido.");
  }

  updateRecordById_(SHEET_NAMES.MEMBERS, request.payload.memberId, { status: "removed", removedAt: nowIso_() });
  return successResponse_({ success: true });
}
