import { Territory } from "@/models/territory";
import {
  filterBySearch,
  nameRelevance,
  NO_MATCH,
  SearchFields,
} from "@/lib/search";

/** Valeur absente telle que l'envoie le back (ex. territoire non attribué). */
const NOT_SET = "N/A";

// Dans le GeoJSON de la liste, « city » est le nom de la ville ; ailleurs, la ville elle-même
const cityName = (city: Territory["city"] | string | null | undefined) =>
  typeof city === "string" ? city : city?.name;

/** La recherche porte sur le nom, la ville, la personne qui a le territoire et la note. */
const territorySearchFields = (territory: Territory): SearchFields => [
  territory.name,
  cityName(territory.city),
  territory.assignedTo === NOT_SET ? null : territory.assignedTo,
  territory.note,
];

/**
 * Pertinence de chaque territoire pour la recherche (cf. {@link nameRelevance}), dans l'ordre reçu :
 * {@link NO_MATCH} pour un territoire qui ne correspond pas.
 */
export function territorySearchRanks(
  territories: readonly Territory[],
  query: string
): number[] {
  const found = new Set(
    filterBySearch(territories, query, territorySearchFields)
  );
  return territories.map((territory) =>
    found.has(territory) ? nameRelevance(territory.name, query) : NO_MATCH
  );
}
