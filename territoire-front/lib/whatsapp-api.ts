import { Person } from "@/models/person";
import { WhatsAppTestResult } from "@/models/whatsapp-test";
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
