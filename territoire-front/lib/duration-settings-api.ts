import { DurationSettings } from "@/models/duration-settings";
import { apiRequest as request } from "@/utils/api-request";

export const fetchDurationSettings = () =>
  request<DurationSettings>(
    "/api/settings/durees",
    {},
    "Impossible de charger les durées d'attribution"
  );

export const saveDurationSettings = (durations: DurationSettings) =>
  request<DurationSettings>(
    "/api/settings/durees",
    { method: "PUT", body: JSON.stringify(durations) },
    "Impossible d'enregistrer les durées"
  );
