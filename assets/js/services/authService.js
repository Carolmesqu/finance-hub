/**
 * authService — única camada que fala com o Firebase Authentication.
 *
 * Páginas e componentes nunca importam o SDK do Firebase diretamente; sempre
 * passam por este service (mesma regra de Services do PROJECT.md, aplicada
 * também à autenticação).
 */

import { firebaseAuth } from "../firebase/firebaseConfig.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const AUTH_ERROR_MESSAGES = {
  "auth/popup-closed-by-user": "O login foi cancelado antes de ser concluído.",
  "auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups para continuar.",
  "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente.",
  "auth/cancelled-popup-request": "Já existe uma tentativa de login em andamento.",
  "auth/user-disabled": "Esta conta foi desativada. Entre em contato com o suporte.",
};

function mapFirebaseUser(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? "",
    email: firebaseUser.email ?? "",
    photoURL: firebaseUser.photoURL ?? "",
  };
}

export function getAuthErrorMessage(error) {
  return AUTH_ERROR_MESSAGES[error?.code] ?? "Não foi possível entrar. Tente novamente em instantes.";
}

/**
 * Login exclusivo via Google (PROJECT.md § Autenticação).
 * A persistência é definida explicitamente como "local" para que a sessão
 * sobreviva ao fechamento do navegador e seja restaurada automaticamente.
 */
export async function loginWithGoogle() {
  await setPersistence(firebaseAuth, browserLocalPersistence);
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  return mapFirebaseUser(credential.user);
}

export async function logout() {
  await signOut(firebaseAuth);
}

/**
 * Observa mudanças de sessão (login, logout, restauração automática ao
 * recarregar a página). Deve ser chamado uma única vez, no bootstrap.
 */
export function observeAuthState(callback) {
  return onAuthStateChanged(firebaseAuth, (firebaseUser) => {
    callback(mapFirebaseUser(firebaseUser));
  });
}

export function getCurrentUser() {
  return mapFirebaseUser(firebaseAuth.currentUser);
}

/**
 * Retorna o ID Token do Firebase da sessão atual (renovado automaticamente
 * pelo SDK quando necessário). Usado pelo apiClient em toda chamada ao
 * backend — nunca cacheamos o token manualmente para evitar enviar um token
 * expirado.
 */
export async function getIdToken() {
  if (!firebaseAuth.currentUser) {
    return null;
  }
  return firebaseAuth.currentUser.getIdToken();
}
