import { apiRequest } from "@/utils/api-request";
import { apiErrorMessage } from "@/utils/api-error";
import { authFetch } from "@/utils/auth-fetch";
import { Person } from "@/models/person";

/**
 * Archivage plutôt que suppression (territoires, personnes parties) et anonymisation : l'historique d'attributions
 * n'est jamais perdu.
 */

/** Territoire archivé (cf. ArchivedTerritoryDto). */
export interface ArchivedTerritory {
  id: string;
  name: string;
  cityName: string;
  archivedAt: string;
  /** Nombre d'attributions de son historique. */
  assignments: number;
}

const post = <T>(url: string, fallback: string) =>
  apiRequest<T>(url, { method: "POST" }, fallback);

/** Requête sans réponse à lire (204) : seul le statut compte. */
async function postNoContent(url: string, fallback: string): Promise<void> {
  const res = await authFetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, fallback));
  }
}

export const archiveTerritory = (territoryId: string) =>
  postNoContent(
    `/api/territoires/${territoryId}/archiver`,
    "Impossible d'archiver ce territoire"
  );

export const restoreTerritory = (territoryId: string) =>
  postNoContent(
    `/api/territoires/${territoryId}/restaurer`,
    "Impossible de restaurer ce territoire"
  );

export const fetchArchivedTerritories = () =>
  apiRequest<ArchivedTerritory[]>(
    "/api/territoires/archives",
    {},
    "Impossible de charger les territoires archivés"
  );

export const archivePerson = (personId: string) =>
  post<Person>(
    `/api/personnes/${personId}/archiver`,
    "Impossible d'archiver cette personne"
  );

export const restorePerson = (personId: string) =>
  post<Person>(
    `/api/personnes/${personId}/restaurer`,
    "Impossible de restaurer cette personne"
  );

export const anonymizePerson = (personId: string) =>
  post<Person>(
    `/api/personnes/${personId}/anonymiser`,
    "Impossible d'anonymiser cette personne"
  );

export const fetchArchivedPersons = () =>
  apiRequest<Person[]>(
    "/api/personnes/archives",
    {},
    "Impossible de charger les personnes parties"
  );
