const CACHE_NAME = "pwa-cache-v82";

self.addEventListener("install", (event) => {
    self.skipWaiting();
    console.log('[SW] install' + CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                "/", // Permet le offline
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

    // For non-API requests, continue with network-first strategy
    if (
        url.origin !== location.origin ||
        url.pathname.endsWith(".json") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".jpg") ||
        url.pathname.endsWith(".jpeg") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".mp4")
    ) {
        return;
    }

    // Stratégie network-first
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If there's no cached response, return a fallback
                    return new Response("Offline", { status: 503, headers: { 'Content-Type': 'text/plain' } });
                });
            })
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
