import { useCallback, useEffect, useRef, useState } from "react";

export type UserPosition = { lat: number; lng: number; accuracy: number };

// Codes de GeolocationPositionError
const ERRORS: Record<number, string> = {
  1: "Localisation refusée : autorise-la dans les réglages du navigateur pour voir ta position.",
  2: "Position introuvable pour le moment.",
  3: "La localisation prend trop de temps, réessaie.",
};

/**
 * Suit la position de l'appareil tant que le suivi est actif. La position reste dans le navigateur :
 * elle n'est jamais envoyée au serveur. Le suivi ne démarre que sur une action de l'utilisateur
 * (le navigateur demande alors l'autorisation).
 */
export function useUserPosition() {
  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setActive(false);
    setPosition(null);
  }, []);

  const start = useCallback(() => {
    if (!supported || watchId.current !== null) return;
    setError(null);
    setActive(true);
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setPosition({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
        });
        setError(null);
      },
      (e) => {
        setError(ERRORS[e.code] ?? "Impossible de te localiser.");
        // Sans autorisation, le navigateur n'enverra plus rien : inutile de rester en suivi
        if (e.code === 1) clearWatch();
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
  }, [supported, clearWatch]);

  const stop = useCallback(() => {
    clearWatch();
    setError(null);
  }, [clearWatch]);

  // Arrête le GPS en quittant la page
  useEffect(
    () => () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    },
    []
  );

  return { supported, active, position, error, start, stop };
}
