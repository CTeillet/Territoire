import { createAsyncThunk } from "@reduxjs/toolkit";
import { authFetch } from "@/utils/auth-fetch";
import { apiErrorMessage } from "@/utils/api-error";

/**
 * Appels à l'API depuis un thunk Redux (`createAsyncThunk`) : en cas d'échec, le thunk est rejeté avec un message
 * affichable (`rejectWithValue`), le motif renvoyé par l'API ou à défaut `fallback`. Une coupure réseau ou une
 * réponse illisible donnent `fallback` aussi : l'écran n'affiche jamais « undefined » ni un message technique.
 *
 * Usage : `(id: string, { rejectWithValue }) => thunkApi(rejectWithValue).json<Territory>(url, "Erreur …")`.
 */

type Reject<R> = (message: string) => R;

/**
 * `createAsyncThunk` dont le rejet est un message affichable : `action.payload` (et l'erreur levée par `unwrap()`) est
 * une chaîne. Les slices l'utilisent avec {@link thunkApi}.
 */
export const createApiThunk = createAsyncThunk.withTypes<{
  rejectValue: string;
}>();

/** Sans options, l'appel reste `authFetch(url)` : une simple lecture. */
const send = (url: string, init?: RequestInit) =>
  init ? authFetch(url, init) : authFetch(url);

/**
 * Appels liés au `rejectWithValue` du thunk. Le type de rejet est ainsi déduit, et seul celui de la réponse est à
 * donner (`json<Territory>`) : TypeScript ne déduit pas un paramètre de type quand on en précise un autre.
 */
export function thunkApi<R>(rejectWithValue: Reject<R>) {
  return {
    /** Réponse JSON de l'API, ou le thunk rejeté avec le motif de l'erreur. */
    json: <T>(url: string, fallback: string, init?: RequestInit) =>
      requestJson<T, R>(rejectWithValue, url, fallback, init),
    /**
     * Requête sans réponse à lire (suppression, 204...) : `undefined` si elle a réussi, sinon le thunk rejeté. Le thunk
     * renvoie ensuite ce dont ses reducers ont besoin : `return failure ?? territoryId`.
     */
    noContent: (url: string, fallback: string, init?: RequestInit) =>
      requestNoContent<R>(rejectWithValue, url, fallback, init),
  };
}

async function requestJson<T, R>(
  rejectWithValue: Reject<R>,
  url: string,
  fallback: string,
  init?: RequestInit
): Promise<T | R> {
  let response: Response;
  try {
    response = await send(url, init);
  } catch {
    return rejectWithValue(fallback);
  }
  if (!response.ok) {
    return rejectWithValue(await apiErrorMessage(response, fallback));
  }
  try {
    return (await response.json()) as T;
  } catch {
    return rejectWithValue(fallback);
  }
}

async function requestNoContent<R>(
  rejectWithValue: Reject<R>,
  url: string,
  fallback: string,
  init?: RequestInit
): Promise<R | undefined> {
  let response: Response;
  try {
    response = await send(url, init);
  } catch {
    return rejectWithValue(fallback);
  }
  if (!response.ok) {
    return rejectWithValue(await apiErrorMessage(response, fallback));
  }
  return undefined;
}

/** Corps JSON d'une requête, avec son en-tête. */
export function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Adresse avec les paramètres renseignés seulement (dates de début et de fin facultatives des statistiques…). */
export function withQuery(
  url: string,
  params: Record<string, string | number | undefined | null> = {}
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}
