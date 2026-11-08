import { Person } from "@/models/person";
import { WhatsAppStatus, WhatsAppTestResult } from "@/models/whatsapp-test";
import { apiRequest as request } from "@/utils/api-request";

export const fetchPersonsForWhatsApp = () =>
  request<Person[]>(
    "/api/personnes",
    {},
    "Impossible de charger les personnes"
  );

export const sendWhatsAppTest = (personId: string, message: string) =>
  request<WhatsAppTestResult>(
    "/api/whatsapp/test",
    { method: "POST", body: JSON.stringify({ personId, message }) },
    "Échec du test d'envoi"
  );

/** Dernier succès et dernier échec des envois WhatsApp (ADMIN, SUPERVISEUR, GESTIONNAIRE). */
export const fetchWhatsAppStatus = () =>
  request<WhatsAppStatus>(
    "/api/whatsapp/etat",
    {},
    "Impossible de lire l'état des envois WhatsApp"
  );
