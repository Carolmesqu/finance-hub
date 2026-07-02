const CACHE_NAME = "financehub-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/main.css",
  "./assets/css/reset.css",
  "./assets/css/tokens.css",
  "./assets/css/animations.css",
  "./assets/js/main.js",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png"
];

// Instalação do Service Worker - Cacheia o App Shell básico
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação - Limpa caches antigos de versões passadas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepção de requisições (Fetch)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições de origem externa (Firebase, Google Apps Script API)
  // que precisam de conexão viva em tempo real.
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Ignora endpoints de backend dinâmicos (caso hospedados na mesma origem)
  if (url.pathname.includes("/api/") || url.pathname.includes("/exec")) {
    return;
  }

  // Estratégia Stale-While-Revalidate para recursos estáticos locais (CSS, JS, Imagens, Fontes)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Fallback para index.html se estiver offline em navegações principais
          if (event.request.mode === "navigate") {
            return cache.match("./index.html");
          }
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
