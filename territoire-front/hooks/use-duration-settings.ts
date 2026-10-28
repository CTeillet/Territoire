import { useEffect, useState } from "react";
import {
  DEFAULT_DURATION_SETTINGS,
  DurationSettings,
} from "@/models/duration-settings";
import { fetchDurationSettings } from "@/lib/duration-settings-api";

/** Durées réglées dans les paramètres ; valeurs par défaut le temps du chargement ou si l'appel échoue. */
export function useDurationSettings(): DurationSettings {
  const [settings, setSettings] = useState(DEFAULT_DURATION_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetchDurationSettings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .catch(() => {
        // Les valeurs par défaut restent utilisées
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
