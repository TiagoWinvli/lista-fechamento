// Service Worker do app "Fechamento — Calçados".
// Guarda os arquivos principais no cache do navegador pra o app abrir
// rápido e continuar funcionando mesmo sem internet (os dados dos
// sapatos continuam vindo do IndexedDB, que já funciona offline).
//
// IMPORTANTE — LEIA ANTES DE PUBLICAR UMA ATUALIZAÇÃO:
// Troque o valor de CACHE_VERSION abaixo (ex: 'v2' -> 'v3') toda vez que
// publicar uma mudança no app. Isso é o que faz o navegador perceber que
// existe uma versão nova do Service Worker, instalar ela, jogar fora o
// cache antigo e recarregar a página sozinho — sem precisar limpar cache
// manualmente no celular. Se você esquecer de mudar esse número, o
// navegador pode continuar servindo a versão antiga do app.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `fechamento-calcados-${CACHE_VERSION}`;

// Arquivos essenciais pra o app abrir (o "esqueleto" do app).
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// Ao instalar, baixa e guarda o esqueleto do app no cache (versão nova).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // se algum arquivo falhar (ex: sem internet no 1º acesso), não trava a instalação
  );
  // Não espera as abas antigas fecharem: instala a nova versão logo.
  self.skipWaiting();
});

// Ao ativar, apaga TODAS as versões antigas do cache (de deploys
// anteriores) e assume o controle das páginas já abertas.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia por tipo de arquivo:
//
// 1) Navegação (abrir/recarregar a página, ex: index.html): tenta a REDE
//    primeiro, ignorando qualquer cache HTTP intermediário, pra garantir
//    que você sempre veja a versão mais nova quando tiver internet. Só
//    usa o que está guardado no cache se estiver offline.
//
// 2) Outros arquivos (ícones, manifest etc.): responde com o cache na
//    hora (mais rápido) e atualiza o cache em segundo plano, pra da
//    próxima vez já vir mais novo — esses arquivos mudam bem raramente,
//    então não faz sentido esperar a rede toda vez.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

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