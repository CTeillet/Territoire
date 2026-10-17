import {
  AvailableTerritory,
  TerritoryRequest,
} from "@/models/territory-request";
import { Assignment } from "@/models/assignment";
import { apiRequest } from "@/utils/api-request";

const BASE_URL = "/api/demandes-territoire";

/** Événement émis après une action sur une demande, pour rafraîchir le compteur du menu. */
export const TERRITORY_REQUESTS_CHANGED = "territory-requests-changed";

export const notifyTerritoryRequestsChanged = () =>
  window.dispatchEvent(new Event(TERRITORY_REQUESTS_CHANGED));

export const fetchTerritoryRequests = (withHistory: boolean) =>
  apiRequest<TerritoryRequest[]>(
    `${BASE_URL}${withHistory ? "?historique=true" : ""}`,
    {},
    "Impossible de charger les demandes"
  );

export const fetchPendingTerritoryRequestCount = () =>
  apiRequest<number>(
    `${BASE_URL}/en-attente/nombre`,
    {},
    "Impossible de compter les demandes"
  );

export const fetchAvailableTerritories = (requestId: string) =>
  apiRequest<AvailableTerritory[]>(
    `${BASE_URL}/${requestId}/territoires-disponibles`,
    {},
    "Impossible de charger les territoires disponibles"
  );

export const closeTerritoryRequest = (requestId: string) =>
  apiRequest<TerritoryRequest>(
    `${BASE_URL}/${requestId}/cloture`,
    { method: "POST" },
    "Impossible de clôturer la demande"
  );

/** Attribution classique : la demande en attente de la personne est clôturée automatiquement. */
export const assignTerritoryToPerson = (
  territoryId: string,
  personId: string
) =>
  apiRequest<Assignment>(
    `/api/territoires/${territoryId}/attribuer/${personId}`,
    { method: "POST" },
    "Impossible d'attribuer le territoire"
  );
