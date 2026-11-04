import { Territory } from "@/models/territory";
import { TerritoryType } from "@/models/territory-type";
import { Assignment } from "@/models/assignment";

/** En deçà, un territoire que la personne a déjà eu passe après les autres. */
export const RECENTLY_HAD_MONTHS = 24;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

export type TerritorySuggestion = {
  territory: Territory;
  /** Dernier parcours (date ISO), `null` si le territoire n'a jamais été rendu. */
  lastVisitedOn: string | null;
  /** Début de la dernière attribution de ce territoire à la personne, si c'est récent. */
  recentlyHadOn: string | null;
};

// Dans le GeoJSON de la liste, « city » est le nom de la ville ; ailleurs, la ville elle-même
export const territoryCityName = (territory: Territory): string | undefined => {
  const city = territory.city as Territory["city"] | string | null | undefined;
  return typeof city === "string" ? city : city?.name;
};

const compareNames = (a: string, b: string) =>
  a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });

/**
 * Territoires à proposer à une personne, du plus au moins indiqué : seulement les disponibles (de la ville et
 * du type demandés), ceux qu'elle a eus ces {@link RECENTLY_HAD_MONTHS} derniers mois en dernier, puis les
 * jamais parcourus et les moins récemment parcourus d'abord.
 */
export function suggestTerritories(
  territories: readonly Territory[],
  {
    cityName,
    type,
    history = [],
    today = new Date(),
  }: {
    cityName?: string | null;
    type?: TerritoryType | null;
    /** Attributions de la personne (cf. GET /api/personnes/{id}/territoires). */
    history?: readonly Assignment[];
    today?: Date;
  } = {}
): TerritorySuggestion[] {
  const since = new Date(today);
  since.setMonth(since.getMonth() - RECENTLY_HAD_MONTHS);
  const recentSince = since.toISOString().slice(0, 10);

  const lastHad = new Map<string, string>();
  for (const assignment of history) {
    const id = assignment.territory?.territoryId;
    const date = assignment.assignmentDate;
    if (!id || !date || date < recentSince) continue;
    if (!lastHad.has(id) || lastHad.get(id)! < date) lastHad.set(id, date);
  }

  return territories
    .filter(
      (territory) =>
        territory.status === "AVAILABLE" &&
        (!cityName || territoryCityName(territory) === cityName) &&
        (!type || territory.type === type)
    )
    .map((territory) => ({
      territory,
      lastVisitedOn: ISO_DATE.test(territory.lastVisitedOn ?? "")
        ? territory.lastVisitedOn.slice(0, 10)
        : null,
      recentlyHadOn: lastHad.get(territory.id) ?? null,
    }))
    .sort(
      (a, b) =>
        Number(a.recentlyHadOn !== null) - Number(b.recentlyHadOn !== null) ||
        Number(a.lastVisitedOn !== null) - Number(b.lastVisitedOn !== null) ||
        (a.lastVisitedOn ?? "").localeCompare(b.lastVisitedOn ?? "") ||
        compareNames(a.territory.name, b.territory.name)
    );
}
