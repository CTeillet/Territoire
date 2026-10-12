import { PublicAccess } from "@/models/person-access";

/** Appels de la page personnelle (/m/[token]) : sans compte, le jeton du lien sert d'autorisation. */

/** Message d'erreur de l'API (champ error) ou message par défaut selon le statut HTTP. */
export async function publicErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  if (res.status === 404)
    return "Ce lien n'est pas ou plus valide. Demandez un nouveau lien à votre responsable.";
  if (res.status === 429)
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Le service est momentanément indisponible. Réessayez plus tard.";
}

const baseUrl = (token: string) =>
  `/api/public/acces/${encodeURIComponent(token)}`;

/** Requête renvoyant la vue à jour ; lève une erreur au message affichable. */
async function send(
  url: string,
  init: RequestInit,
  offline: string
): Promise<PublicAccess> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new Error(offline);
  }
  if (!res.ok) throw new Error(await publicErrorMessage(res));
  return (await res.json()) as PublicAccess;
}

export const requestNewTerritory = (
  token: string,
  request: { cityId: string | null; comment: string | null }
) =>
  send(
    `${baseUrl(token)}/demandes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    "Pas de connexion réseau : la demande n'a pas été envoyée."
  );

export const cancelTerritoryRequest = (token: string, requestId: string) =>
  send(
    `${baseUrl(token)}/demandes/${encodeURIComponent(requestId)}/annulation`,
    { method: "POST" },
    "Pas de connexion réseau : la demande n'a pas été annulée."
  );
