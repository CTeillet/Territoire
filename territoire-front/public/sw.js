const CACHE_NAME = "pwa-cache-20261011142339";

self.addEventListener("install", (event) => {
    self.skipWaiting();
    console.log('[SW] install ' + CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/manifest.json",
                "/images/logo.svg",
            ]);
        })
    );
});

self.addEventListener("activate", (event) => {
    self.clients.claim();

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
});

// Page personnelle (/m/<jeton>) : consultable sans réseau. La page est gardée à chaque visite (réseau
// d'abord) et ses fichiers quand elle le demande (message GARDER_HORS_LIGNE, cf. lib/public-access-offline.ts).
const PERSONAL_PAGE = /^\/m\/[^/]+\/?$/;
const KEEP_FOR_OFFLINE = "GARDER_HORS_LIGNE";

/** Réponse de l'API sans réseau : la page la reconnaît à l'en-tête X-Hors-Ligne et affiche sa vue gardée. */
function offlineApiResponse() {
    return new Response(JSON.stringify({ error: "Pas de connexion réseau. Réessayez plus tard." }), {
        status: 503,
        headers: { "Content-Type": "application/json", "X-Hors-Ligne": "1" },
    });
}

async function personalPage(event) {
    try {
        const response = await fetch(event.request);
        if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request.url, copy)));
        }
        return response;
    } catch (error) {
        const cached = await caches.match(event.request.url, { ignoreVary: true });
        if (cached) return cached;
        throw error;
    }
}

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    const sameOrigin = url.origin === location.origin;

    // API : toujours le réseau (données à jour, jamais en cache)
    if (sameOrigin && url.pathname.startsWith("/api/")) {
        event.respondWith(fetch(event.request).catch(offlineApiResponse));
        return;
    }

    if (sameOrigin && event.request.mode === "navigate" && PERSONAL_PAGE.test(url.pathname)) {
        event.respondWith(personalPage(event));
        return;
    }

    // Fichiers de Next.js : un nom par version, donc sans risque de mélange. Ceux gardés pour la page
    // personnelle servent sans réseau ; les autres passent par le cache HTTP du navigateur, comme avant.
    if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
        event.respondWith(
            caches.match(event.request, { ignoreVary: true }).then((cached) => cached || fetch(event.request))
        );
        return;
    }

    // Do not cache other HTML navigation requests or Next.js build chunks in Service Worker cache
    // Let Next.js and browser HTTP cache handle pages and dynamic assets to avoid version mismatch
    if (
        event.request.mode === "navigate" ||
        url.pathname.startsWith("/_next/") ||
        !sameOrigin ||
        url.pathname.endsWith(".json")
    ) {
        return;
    }

    // Static assets caching (images, fonts, etc.)
    if (
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".mp4")
    ) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                    }
                    return response;
                });
            })
        );
    }
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
    // Page personnelle et ses fichiers, à garder pour l'ouvrir sans réseau (adresses de cette origine seulement)
    if (event.data && event.data.type === KEEP_FOR_OFFLINE && Array.isArray(event.data.urls)) {
        const urls = event.data.urls.filter((path) => {
            if (typeof path !== "string") return false;
            const target = new URL(path, location.origin);
            return (
                target.origin === location.origin &&
                (PERSONAL_PAGE.test(target.pathname) || target.pathname.startsWith("/_next/static/"))
            );
        });
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) =>
                Promise.all(
                    urls.map((path) =>
                        cache.match(path).then((cached) =>
                            // Un fichier de Next.js ne change pas : déjà gardé, rien à refaire
                            cached && path.startsWith("/_next/static/")
                                ? undefined
                                : fetch(path, { credentials: "same-origin" })
                                    .then((response) => (response.ok ? cache.put(path, response) : undefined))
                                    .catch(() => undefined)
                        )
                    )
                )
            )
        );
    }
});
