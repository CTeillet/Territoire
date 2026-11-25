import { SchoolYearPeriod } from "@/models/school-year-period";

/**
 * Période scolaire en cours (du 1er septembre au 31 août), calculée comme le serveur : en attendant la liste des
 * périodes (GET /api/territoires/statistiques/periodes), ou si elle n'a pas pu être chargée.
 */
export function currentSchoolYear(today: Date = new Date()): SchoolYearPeriod {
  const startYear =
    today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    startYear,
    endYear: startYear + 1,
    label: `${startYear} - ${startYear + 1}`,
    startDate: `${startYear}-09-01`,
    endDate: `${startYear + 1}-08-31`,
    current: true,
  };
}
