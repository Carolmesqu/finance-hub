import { createElement } from "../utils/dom.js";
import { createButton, setButtonLoading } from "../components/Button.js";
import { createGoogleIcon } from "../components/icons/googleIcon.js";
import { showToast } from "../components/Toast.js";
import { loginWithGoogle, getAuthErrorMessage } from "../services/authService.js";
import { setUser } from "../state/store.js";
import { navigate } from "../router/router.js";

/**
 * Tela de Login (docs/screens.md § Login).
 * Único ponto de entrada não autenticado da aplicação.
 */
export function renderLoginPage() {
  const loginButton = createButton({
    label: "Entrar com Google",
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    icon: createGoogleIcon(),
    onClick: handleLogin,
  });

  const page = createElement("main", { className: "login-page" }, [
    createElement("section", { className: "login-page__card" }, [
      createElement("div", { className: "login-page__brand" }, [
        createElement("h1", { className: "login-page__title", text: "FinanceHub" }),
        createElement("p", {
          className: "login-page__subtitle",
          text: "Controle financeiro colaborativo, do seu jeito.",
        }),
      ]),
      createElement("div", { className: "login-page__actions" }, [loginButton]),
    ]),
  ]);

  async function handleLogin() {
    setButtonLoading(loginButton, true);
    try {
      const user = await loginWithGoogle();
      // Atualização explícita do estado (além do observer global em main.js)
      // evita corrida entre a resolução desta Promise e o callback assíncrono
      // do onAuthStateChanged, garantindo que a guarda de rota já veja o
      // usuário autenticado no momento do navigate().
      setUser(user);
      navigate("/");
    } catch (error) {
      showToast({ message: getAuthErrorMessage(error), type: "error" });
      setButtonLoading(loginButton, false);
    }
  }

  return page;
}
