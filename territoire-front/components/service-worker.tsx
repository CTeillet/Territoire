"use client"; // Indique que c'est un Client Component

import { useEffect } from "react";

function ServiceWorker() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => console.log("Service Worker enregistré ✅", registration))
                .catch((err) => console.error("Service Worker échec d'enregistrement ❌", err));
        }
    }, []);

    return null; // Ce composant ne rend rien, il s'exécute juste
}

export default ServiceWorker;
