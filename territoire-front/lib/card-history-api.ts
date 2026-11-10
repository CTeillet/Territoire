import { apiRequest } from "@/utils/api-request";
import { apiErrorMessage } from "@/utils/api-error";
import { authFetch } from "@/utils/auth-fetch";

/** Carte précédente d'un territoire (cf. TerritoryMapVersionDto), sans son image. */
export interface CardVersion {
  id: string;
  fileName: string | null;
  contentType: string | null;
  /** Moment où elle a été remplacée. */
  replacedAt: string;
}

const historyUrl = (territoryId: string) =>
  `/api/territoires/${territoryId}/cartes-precedentes`;

export const fetchCardHistory = (territoryId: string) =>
  apiRequest<CardVersion[]>(
    historyUrl(territoryId),
    {},
    "Impossible de charger les cartes précédentes"
  );

/** Image d'une carte précédente, en adresse locale (blob:) à libérer avec URL.revokeObjectURL. */
export async function fetchCardVersionImage(
  territoryId: string,
  versionId: string
): Promise<string> {
  const res = await authFetch(`${historyUrl(territoryId)}/${versionId}`);
  if (!res.ok) {
    throw new Error(
      await apiErrorMessage(res, "Impossible d'afficher cette carte")
    );
  }
  return URL.createObjectURL(await res.blob());
}

/** Remet cette carte ; la carte actuelle rejoint les cartes précédentes. */
export async function restoreCardVersion(
  territoryId: string,
  versionId: string
): Promise<void> {
  const res = await authFetch(
    `${historyUrl(territoryId)}/${versionId}/restauration`,
    { method: "POST" }
  );
  if (!res.ok) {
    throw new Error(
      await apiErrorMessage(res, "Impossible de remettre cette carte")
    );
  }
}
