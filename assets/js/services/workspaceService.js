/**
 * workspaceService — única camada que fala com o módulo "workspace" da API
 * (docs/API.md). Páginas nunca chamam callApi()/fetch diretamente.
 */

import { callApi } from "./apiClient.js";

export function listWorkspaces() {
  return callApi("workspace.list", {}, { requireWorkspace: false });
}

export function createWorkspace({ name, currency, photoURL }) {
  return callApi("workspace.create", { name, currency, photoURL }, { requireWorkspace: false });
}

export function updateWorkspace({ name, currency, photoURL }) {
  return callApi("workspace.update", { name, currency, photoURL });
}

export function listMyInvites() {
  return callApi("workspace.listMyInvites", {}, { requireWorkspace: false });
}

export function acceptInvite(token) {
  return callApi("workspace.acceptInvite", { token }, { requireWorkspace: false });
}

export function declineInvite(token) {
  return callApi("workspace.declineInvite", { token }, { requireWorkspace: false });
}

export function listMembers() {
  return callApi("workspace.listMembers");
}

export function inviteMember({ email, role }) {
  return callApi("workspace.inviteMember", { email, role });
}

export function revokeInvite(inviteId) {
  return callApi("workspace.revokeInvite", { inviteId });
}

export function updateMemberRole({ memberId, role }) {
  return callApi("workspace.updateMemberRole", { memberId, role });
}

export function removeMember(memberId) {
  return callApi("workspace.removeMember", { memberId });
}
