/**
 * Recherche tolérante, commune aux listes de l'application : sans casse, sans accents, sans ponctuation ni
 * espaces. « r12 », « R 12 » et « r-12 » trouvent « R-12 » ; « evry » trouve « Évry ».
 */

const DIACRITICS = /[̀-ͯ]/g;
const NOT_ALPHANUMERIC = /[^\p{L}\p{N}]/gu;
const SEGMENTS = /\p{L}+|\p{N}+/gu;
const DIGITS_ONLY = /^\p{N}+$/u;

/** Pertinence d'un élément qui ne correspond pas à la recherche (cf. {@link nameRelevance}). */
export const NO_MATCH = Number.POSITIVE_INFINITY;

const withoutAccents = (text: string) =>
  text.normalize("NFD").replace(DIACRITICS, "").toLowerCase();

/** Texte réduit à ses lettres et chiffres, en minuscules et sans accents. */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return withoutAccents(text).replace(NOT_ALPHANUMERIC, "");
}

/** Mots de la recherche, normalisés ; un « mot » sans lettre ni chiffre (ex. « - ») est ignoré. */
export function searchTokens(query: string): string[] {
  return query.split(/\s+/).map(normalizeSearchText).filter(Boolean);
}

/** Champs dans lesquels chercher un élément (les valeurs vides sont ignorées). */
export type SearchFields = ReadonlyArray<string | null | undefined>;

/**
 * Éléments qui correspondent à la recherche, dans leur ordre. Ceux qui contiennent la recherche entière dans un
 * champ (« r-12 » dans « R-12 ») sont seuls retenus s'il y en a ; sinon, ceux qui en contiennent chaque mot,
 * chacun dans l'un des champs (« dupont jean » pour Jean, Dupont). Ainsi « R 12 » donne R-12, et pas un
 * territoire de Rennes dont la note contient « 12 ». Une recherche vide retient tout.
 */
export function filterBySearch<T>(
  items: readonly T[],
  query: string,
  fieldsOf: (item: T) => SearchFields
): T[] {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [...items];
  const whole = tokens.join("");
  const entries = items.map((item) => ({
    item,
    values: fieldsOf(item).map(normalizeSearchText).filter(Boolean),
  }));
  const wholeMatches = entries.filter(({ values }) =>
    values.some((value) => value.includes(whole))
  );
  const matches =
    wholeMatches.length > 0 || tokens.length === 1
      ? wholeMatches
      : entries.filter(({ values }) =>
          tokens.every((token) => values.some((value) => value.includes(token)))
        );
  return matches.map(({ item }) => item);
}

/**
 * Pertinence d'un nom pour la recherche, de la meilleure (0) à la moins bonne (4) :
 * 0. nom identique (« r12 » pour « R-12 ») ;
 * 1. l'un des morceaux du nom, lettres ou nombre (« 12 » pour « R-12 », « 1 » pour « A-01 ») ;
 * 2. début du nom (« r1 » pour « R-12 ») ;
 * 3. nom qui contient la recherche (« 12 » pour « R-120 ») ;
 * 4. aucune de ces correspondances (la recherche porte sur un autre champ, ou mot par mot).
 */
export function nameRelevance(name: string, query: string): number {
  const searched = searchTokens(query).join("");
  const normalized = normalizeSearchText(name);
  if (!searched) return 0;
  if (normalized === searched) return 0;
  const segments = withoutAccents(name).match(SEGMENTS) ?? [];
  const sameNumber = (segment: string) =>
    DIGITS_ONLY.test(segment) &&
    DIGITS_ONLY.test(searched) &&
    Number(segment) === Number(searched);
  if (segments.some((segment) => segment === searched || sameNumber(segment))) {
    return 1;
  }
  if (normalized.startsWith(searched)) return 2;
  if (normalized.includes(searched)) return 3;
  return 4;
}
