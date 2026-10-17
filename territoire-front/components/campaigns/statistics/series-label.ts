/** Libellé des séries « used » / « available » des graphiques de campagne ; les autres noms sont inchangés. */
export function seriesLabel<T>(
  name: T,
  translations: Record<string, string>
): T | string {
  return name === "used" || name === "available"
    ? translations[String(name)]
    : name;
}
