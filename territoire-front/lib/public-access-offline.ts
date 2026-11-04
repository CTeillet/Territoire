import { PublicAccess } from "@/models/person-access";

/**
 * Page personnelle (/m/[token]) sans réseau : la dernière vue reçue est gardée sur l'appareil (localStorage),
 * et le service worker garde la page et ses fichiers (public/sw.js). Seules les données de la personne, que
 * son lien lui donne déjà, sont gardées, et seulement sur son appareil.
 */

const STORAGE_PREFIX = "tms-mes-territoires:";
/** Au-delà, la vue gardée est trop ancienne pour être utile (territoires rendus, échéances passées...). */
const MAX_AGE_DAYS = 60;
/** En-tête posé par le service worker sur sa réponse quand le réseau manque (cf. public/sw.js). */
export const OFFLINE_HEADER = "X-Hors-Ligne";
/** Message envoyé au service worker pour qu'il garde la page et ses fichiers. */
export const KEEP_FOR_OFFLINE_MESSAGE = "GARDER_HORS_LIGNE";

export type OfflineView = { data: PublicAccess; savedAt: string };

const keyOf = (token: string) => `${STORAGE_PREFIX}${token}`;

export function saveOfflineView(
  token: string,
  data: PublicAccess,
  now = new Date()
): void {
  try {
    localStorage.setItem(
      keyOf(token),
      JSON.stringify({ data, savedAt: now.toISOString() })
    );
  } catch {
    // Stockage plein ou refusé (navigation privée) : la page marche, sans hors-ligne
  }
}

export function readOfflineView(
  token: string,
  now = new Date()
): OfflineView | null {
  try {
    const raw = localStorage.getItem(keyOf(token));
    if (!raw) return null;
    const view = JSON.parse(raw) as Partial<OfflineView>;
    const savedAt = new Date(view.savedAt ?? "");
    if (!view.data || Number.isNaN(savedAt.getTime())) return null;
    if (now.getTime() - savedAt.getTime() > MAX_AGE_DAYS * 86_400_000) {
      clearOfflineView(token);
      return null;
    }
    return view as OfflineView;
  } catch {
    return null;
  }
}

/** Lien révoqué ou invalide : rien ne doit rester consultable. */
export function clearOfflineView(token: string): void {
  try {
    localStorage.removeItem(keyOf(token));
  } catch {
    // Rien à nettoyer
  }
}

/** Réponse du service worker faute de réseau (et non une vraie erreur du serveur). */
export const isOfflineResponse = (res: Response) =>
  res.status === 503 && res.headers.get(OFFLINE_HEADER) === "1";

/** Les demandes rapprochées (page puis chaque carte chargée à part) partent en une seule. */
const KEEP_DELAY_MS = 500;
let keepTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Demande au service worker de garder la page et les fichiers qu'elle a chargés, pour qu'elle s'ouvre sans
 * réseau dès la prochaine fois (même si le service worker vient d'être installé et n'a rien vu passer).
 * À rappeler quand un morceau chargé plus tard s'affiche (ex. la carte) : ses fichiers sont alors connus.
 */
export function keepPageForOffline(): void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  clearTimeout(keepTimer);
  keepTimer = setTimeout(sendKeepForOffline, KEEP_DELAY_MS);
}

function sendKeepForOffline(): void {
  const files = performance
    .getEntriesByType("resource")
    .map((entry) => new URL(entry.name, location.href))
    .filter(
      (url) =>
        url.origin === location.origin &&
        url.pathname.startsWith("/_next/static/")
    )
    .map((url) => url.pathname + url.search);
  navigator.serviceWorker.ready
    .then((registration) =>
      registration.active?.postMessage({
        type: KEEP_FOR_OFFLINE_MESSAGE,
        urls: [location.pathname, ...new Set(files)],
      })
    )
    .catch(() => {
      // Sans service worker, la page marche simplement sans hors-ligne
    });
}
