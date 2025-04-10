"use client";

import { useEffect } from "react";
import { toast } from "sonner";

function ServiceWorker() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        let refreshing = false;

        navigator.serviceWorker.register("/sw.js").then((registration) => {
            console.log("✅ Service Worker enregistré", registration);

            if (registration.waiting) {
                registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }

            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed") {
                            console.log("🆕 Nouveau SW installé (state=installed)");
                            newWorker.postMessage({ type: "SKIP_WAITING" });
                        }
                    });
                }
            });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;

            toast("Nouvelle version disponible", {
                description: "Cliquez pour recharger l'application.",
                action: {
                    label: "Recharger",
                    onClick: () => {
                        window.location.reload();
                    },
                },
            });
        });
    }, []);

    return null;
}

export default ServiceWorker;
