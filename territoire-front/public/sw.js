const CACHE_NAME = "pwa-cache-v24"; // Changer à chaque mise à jour

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("pwa-cache").then((cache) => {
            return cache.addAll([
                "/",
                "/manifest.json",
                "/images/logo.svg",
            ]);
        })
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.url.includes("/styles.css")) {
        // Empêche le cache sur le CSS
        event.respondWith(fetch(event.request));
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});

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
});
