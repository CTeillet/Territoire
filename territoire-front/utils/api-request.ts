import { authFetch } from "@/utils/auth-fetch";
import { apiErrorMessage } from "@/utils/api-error";

/** Appel authentifié renvoyant du JSON ; lève une erreur au message affichable (motif de l'API ou `fallback`). */
export async function apiRequest<T>(
  url: string,
  init: RequestInit,
  fallback: string
): Promise<T> {
  const res = await authFetch(url, init);
  if (!res.ok) {
    throw new Error(await apiErrorMessage(res, fallback));
  }
  return (await res.json()) as T;
}
