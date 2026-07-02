/**
 * Configuração do Firebase.
 *
 * IMPORTANTE: os valores abaixo NÃO são segredos — a configuração web do Firebase
 * é pública por design (a segurança real vem das Regras de Segurança do projeto e
 * dos domínios autorizados no Google Cloud/Firebase Console). Ainda assim, os
 * valores de exemplo devem ser substituídos pelos do SEU projeto Firebase antes de
 * rodar a aplicação (ver instruções em "como executar e testar").
 *
 * SDK carregado via CDN (ESM) — sem bundler, conforme arquitetura (JS puro, sem
 * frameworks/build step). Fixamos a versão para evitar quebras inesperadas.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5DtYjmQkcvyceM6AtdmtU578U202DFuM",
  authDomain: "financehub-44f7c.firebaseapp.com",
  projectId: "financehub-44f7c",
  storageBucket: "financehub-44f7c.firebasestorage.app",
  messagingSenderId: "87368401849",
  appId: "1:87368401849:web:6a65d7e921c35ace3d6c68",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
