/* WordAround service worker — hand-rolled, no Workbox.

   Goal: make the app installable and let the shell open offline. It is NOT a
   full offline app: sets, AI feedback and transcription all need the network,
   and we never pretend otherwise (see the offline fallback copy).

   Caching rules, chosen so a bad cache can never pin users to a stale build:
   - navigations  → network-first, fall back to the cached shell, then /offline.html
   - /assets/*    → cache-first (Vite content-hashes these; they are immutable)
   - same-origin static (icons, manifest, fonts) → stale-while-revalidate
   - everything cross-origin (Firebase, the AI Worker, Unsplash) → not touched
*/

const VERSION = 'v3';
const SHELL_CACHE = `wa-shell-${VERSION}`;
const ASSET_CACHE = `wa-assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';

/* Kept deliberately tiny: index.html is what the SPA needs to boot, and the
   hashed JS/CSS get cached on first use. Precaching more risks shipping a
   stale list. */
const SHELL_URLS = ['/', OFFLINE_URL, '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      /* One missing file must not block activation. */
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('wa-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* Lets the page trigger an immediate update instead of waiting for a restart. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

const isAsset = (url) => url.pathname.startsWith('/assets/');

/* `ignoreVary` matters: responses stored with a `Vary` header (Cloudflare adds
   `Vary: Accept-Encoding`) will NOT match a differently-encoded request, so a
   plain `cache.match(request)` silently misses and the offline fallback never
   fires. Verified against a real build before fixing. */
const matchCache = (cache, request) => cache.match(request, { ignoreVary: true });

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(ASSET_CACHE);
  /* Search ALL caches, not just the asset one: favicon/manifest are precached
     into the shell cache at install time and would otherwise miss here. */
  const cached =
    (await caches.match(request, { ignoreVary: true })) ?? (await matchCache(cache, request));
  const network = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  /* Serve the cached copy immediately when we have one; otherwise wait for the
     network (which resolves to `undefined` on failure → let it 504 below). */
  if (cached) return cached;
  return (await network) ?? Response.error();
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  /* Never interfere with Firebase, the AI Worker, Unsplash, LanguageTool… */
  if (url.origin !== self.location.origin) return;

  /* SPA navigations: always try the network so a new deploy wins immediately. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await matchCache(cache, '/')) ??
            (await matchCache(cache, OFFLINE_URL)) ??
            Response.error()
          );
        }),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await matchCache(cache, request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) void cache.put(request, response.clone());
          return response;
        } catch (e) {
          /* Offline and not cached — surface a network error, never a throw
             that leaves the page with an unhandled rejection. */
          return Response.error();
        }
      }),
    );
    return;
  }

  /* Icons, manifest, fonts. */
  if (/\.(?:png|svg|webmanifest|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
