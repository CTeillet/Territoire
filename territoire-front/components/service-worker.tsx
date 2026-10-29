"use client";

import { useEffect } from "react";

function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => {
        console.warn("Service Worker non enregistré", error);
        return undefined;
      })
      .then((registration) => {
        if (!registration) return;

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;

      window.location.reload();
    });
  }, []);

  return null;
}

export default ServiceWorker;
