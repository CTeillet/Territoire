import {
  differenceInCalendarDays,
  differenceInMonths,
  format,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Date (AAAA-MM-JJ) du dernier parcours d'un territoire, `null` s'il n'a jamais été rendu : le serveur envoie alors
 * « nouveau » (ou « N/A », ou rien).
 */
export function lastVisitDate(value?: string | null): string | null {
  return value && ISO_DATE.test(value) ? value.slice(0, 10) : null;
}

/** Jamais parcourus d'abord, puis du plus ancien parcours au plus récent. */
export function compareLastVisits(
  a?: string | null,
  b?: string | null
): number {
  return (lastVisitDate(a) ?? "").localeCompare(lastVisitDate(b) ?? "");
}

/** « 12 mars 2025 », « 1 sept. 2025 » (comme la fenêtre d'attribution). */
export function formatDay(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy", { locale: fr });
}

/** « 1er septembre 2025 », « 31 août 2026 ». */
export function formatLongDay(iso: string): string {
  const date = parseISO(iso);
  const day = date.getDate() === 1 ? "1er" : String(date.getDate());
  return `${day} ${format(date, "MMMM yyyy", { locale: fr })}`;
}

/**
 * Temps écoulé depuis une date, à l'unité qui parle pour un territoire : « hier », « il y a 12 jours »,
 * « il y a 8 mois », puis en années à partir de deux ans.
 */
export function timeSince(iso: string, today: Date = new Date()): string {
  const date = parseISO(iso);
  const months = differenceInMonths(today, date);
  if (months >= 24) return `il y a ${Math.floor(months / 12)} ans`;
  if (months >= 1) return `il y a ${months} mois`;
  const days = differenceInCalendarDays(today, date);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}
