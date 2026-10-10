const CACHE_NAME = "pwa-cache-20261010120446";

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

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // For API requests, use a network-only strategy
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({ error: "Network error" }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Do not cache HTML navigation requests or Next.js build chunks in Service Worker cache
    // Let Next.js and browser HTTP cache handle pages and dynamic assets to avoid version mismatch
    if (
        event.request.mode === "navigate" ||
        url.pathname.startsWith("/_next/") ||
        url.origin !== location.origin ||
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
});
