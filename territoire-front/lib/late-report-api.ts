import { LateReportSendResult, LateReportSettings } from "@/models/late-report";
import { apiRequest as request } from "@/utils/api-request";

export const fetchLateReportSettings = () =>
  request<LateReportSettings>(
    "/api/settings/recapitulatif-retards",
    {},
    "Impossible de charger le récapitulatif des retards"
  );

export const saveLateReportRecipients = (recipients: string[]) =>
  request<LateReportSettings>(
    "/api/settings/recapitulatif-retards",
    { method: "PUT", body: JSON.stringify({ recipients }) },
    "Impossible d'enregistrer les destinataires"
  );

export const sendLateReportNow = () =>
  request<LateReportSendResult>(
    "/api/settings/recapitulatif-retards/envoi",
    { method: "POST" },
    "Échec de l'envoi du récapitulatif"
  );
