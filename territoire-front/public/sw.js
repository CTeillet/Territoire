const CACHE_NAME = "pwa-cache-v48";

// Cache uniquement le code (pas les API, pas les POST, pas les images dynamiques)
self.addEventListener("install", (event) => {
    self.skipWaiting();
    console.log('[SW] install v40');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/", // important pour que l'app fonctionne offline
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

self.addEventListener("fetch", (event) => {
    // Ne pas traiter les requêtes non-GET
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // Ne pas mettre en cache les requêtes externes ou API
    if (
        url.origin !== location.origin ||           // requêtes externes
        url.pathname.startsWith("/api/") ||         // appel API
        url.pathname.endsWith(".json") ||           // contenu JSON
        url.pathname.endsWith(".png") ||            // images
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".mp4")
    ) {
        return; // on ignore
    }

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    return cachedResponse;
                });

                return cachedResponse || fetchPromise;
            });
        })
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});