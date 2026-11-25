import { describe, expect, it } from "vitest";
import {
  compareLastVisits,
  formatDay,
  formatLongDay,
  lastVisitDate,
  timeSince,
} from "@/lib/dates";
import { currentSchoolYear } from "@/lib/school-year";

const today = new Date("2026-11-25T12:00:00");

describe("Dernier parcours", () => {
  it("ne retient que les dates, pas « nouveau » ni « N/A »", () => {
    expect(lastVisitDate("2025-03-12")).toBe("2025-03-12");
    expect(lastVisitDate("2025-03-12T10:00:00")).toBe("2025-03-12");
    expect(lastVisitDate("nouveau")).toBeNull();
    expect(lastVisitDate("N/A")).toBeNull();
    expect(lastVisitDate("")).toBeNull();
    expect(lastVisitDate(undefined)).toBeNull();
  });

  it("classe les jamais parcourus d'abord, puis du plus ancien au plus récent", () => {
    expect(
      ["2026-10-01", "nouveau", "2020-01-01", "N/A", "2024-05-01"].sort(
        compareLastVisits
      )
    ).toEqual(["nouveau", "N/A", "2020-01-01", "2024-05-01", "2026-10-01"]);
  });
});

describe("Dates affichées", () => {
  it("écrit le jour comme la fenêtre d'attribution, et « 1er » en toutes lettres", () => {
    expect(formatDay("2025-03-12")).toBe("12 mars 2025");
    expect(formatLongDay("2025-09-01")).toBe("1er septembre 2025");
    expect(formatLongDay("2026-08-31")).toBe("31 août 2026");
  });

  it("dit le temps écoulé en jours, en mois puis en années", () => {
    expect(timeSince("2026-11-25", today)).toBe("aujourd'hui");
    expect(timeSince("2026-11-24", today)).toBe("hier");
    expect(timeSince("2026-11-13", today)).toBe("il y a 12 jours");
    expect(timeSince("2026-10-20", today)).toBe("il y a 1 mois");
    expect(timeSince("2025-03-12", today)).toBe("il y a 20 mois");
    expect(timeSince("2024-11-26", today)).toBe("il y a 23 mois");
    expect(timeSince("2024-11-25", today)).toBe("il y a 2 ans");
    expect(timeSince("2020-01-01", today)).toBe("il y a 6 ans");
  });
});

describe("Période scolaire en cours", () => {
  it("va du 1er septembre au 31 août, comme côté serveur", () => {
    expect(currentSchoolYear(today)).toEqual({
      startYear: 2026,
      endYear: 2027,
      label: "2026 - 2027",
      startDate: "2026-09-01",
      endDate: "2027-08-31",
      current: true,
    });
    // Avant septembre : l'année commencée l'an dernier
    expect(currentSchoolYear(new Date("2026-08-31T12:00:00")).startDate).toBe(
      "2025-09-01"
    );
    expect(currentSchoolYear(new Date("2026-09-01T08:00:00")).startDate).toBe(
      "2026-09-01"
    );
  });
});
