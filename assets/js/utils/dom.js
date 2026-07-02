/**
 * Utilitário central de criação de elementos DOM.
 *
 * Motivo: nunca usamos innerHTML com strings dinâmicas (evita XSS — OWASP A03:2021
 * Injection). Todo componente/página constrói a árvore DOM via createElement(),
 * garantindo que texto de usuário sempre passe por textContent.
 */

export function createElement(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  const { className, attrs, on, dataset, text } = options;

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = text;
  }

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== null && value !== undefined && value !== false) {
        element.setAttribute(key, value);
      }
    }
  }

  if (dataset) {
    for (const [key, value] of Object.entries(dataset)) {
      element.dataset[key] = value;
    }
  }

  if (on) {
    for (const [eventName, handler] of Object.entries(on)) {
      element.addEventListener(eventName, handler);
    }
  }

  appendChildren(element, children);

  return element;
}

export function appendChildren(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clearElement(element) {
  element.replaceChildren();
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}
