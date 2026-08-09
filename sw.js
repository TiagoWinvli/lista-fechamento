// Service Worker do app "Fechamento — Calçados".
// Guarda os arquivos principais no cache do navegador pra o app abrir
// rápido e continuar funcionando mesmo sem internet (os dados dos
// sapatos continuam vindo do IndexedDB, que já funciona offline).

const CACHE_NAME = 'fechamento-calcados-v1';

// Arquivos essenciais pra o app abrir (o "esqueleto" do app).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Ao instalar, baixa e guarda o esqueleto do app no cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // se algum arquivo falhar (ex: sem internet no 1º acesso), não trava a instalação
  );
  self.skipWaiting();
});

// Ao ativar, apaga versões antigas do cache (de deploys anteriores).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: responde com o cache na hora (app abre rápido / funciona
// offline) e, em paralelo, busca na rede pra atualizar o cache — assim
// da próxima vez que abrir, já pega a versão mais nova.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
