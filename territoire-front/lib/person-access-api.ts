import { AccessSettings, PersonAccessStatus } from "@/models/person-access";
import { apiRequest as request } from "@/utils/api-request";

export const fetchAllAccesses = () =>
  request<PersonAccessStatus[]>(
    "/api/acces",
    {},
    "Impossible de charger les accès"
  );

export const fetchPersonAccess = (personId: string) =>
  request<PersonAccessStatus>(
    `/api/personnes/${personId}/acces`,
    {},
    "Impossible de charger l'accès"
  );

export const sendPersonAccess = (personId: string) =>
  request<PersonAccessStatus>(
    `/api/personnes/${personId}/acces/envoyer`,
    { method: "POST" },
    "Échec de l'envoi du lien"
  );

export const regeneratePersonAccess = (personId: string) =>
  request<PersonAccessStatus>(
    `/api/personnes/${personId}/acces/regenerer`,
    { method: "POST" },
    "Impossible de générer le lien"
  );

export const revokePersonAccess = (personId: string) =>
  request<PersonAccessStatus>(
    `/api/personnes/${personId}/acces/revoquer`,
    { method: "POST" },
    "Impossible de révoquer le lien"
  );

export const updatePersonAccessExpiration = (
  personId: string,
  expiresAt: string | null
) =>
  request<PersonAccessStatus>(
    `/api/personnes/${personId}/acces/expiration`,
    { method: "PUT", body: JSON.stringify({ expiresAt }) },
    "Impossible de modifier l'expiration"
  );

export const fetchAccessSettings = () =>
  request<AccessSettings>(
    "/api/settings/acces-numerique",
    {},
    "Impossible de charger les réglages"
  );

export const saveAccessSettings = (settings: AccessSettings) =>
  request<AccessSettings>(
    "/api/settings/acces-numerique",
    { method: "PUT", body: JSON.stringify(settings) },
    "Impossible d'enregistrer les réglages"
  );

/** Rôles autorisés à gérer (régénérer, révoquer, expirer) les liens. */
export const canManageAccess = (role?: string | null) =>
  role === "ADMIN" || role === "SUPERVISEUR";

/** Rôles autorisés à consulter et envoyer les liens. */
export const canSendAccess = (role?: string | null) =>
  canManageAccess(role) || role === "GESTIONNAIRE";
