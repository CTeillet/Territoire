import { describe, expect, it } from "vitest";
import { suggestTerritories } from "@/lib/territory-suggestion";
import { Territory } from "@/models/territory";
import { Assignment } from "@/models/assignment";
import { TerritoryType } from "@/models/territory-type";

const territory = (
  id: string,
  overrides: Record<string, unknown> = {}
): Territory =>
  ({
    id,
    name: id,
    status: "AVAILABLE",
    city: "Rennes",
    type: TerritoryType.HOUSE,
    lastVisitedOn: "2026-01-01",
    ...overrides,
  }) as unknown as Territory;

const had = (territoryId: string, assignmentDate: string): Assignment =>
  ({
    id: `${territoryId}-${assignmentDate}`,
    territory: { territoryId, name: territoryId },
    assignmentDate,
    dueDate: assignmentDate,
    returnDate: assignmentDate,
  }) as unknown as Assignment;

const today = new Date("2026-11-04T12:00:00");
const names = (list: ReturnType<typeof suggestTerritories>) =>
  list.map((s) => s.territory.name);

describe("suggestTerritories", () => {
  const territories = [
    territory("R-10", { lastVisitedOn: "2026-03-01" }),
    territory("R-2", { lastVisitedOn: "nouveau" }),
    territory("R-1", { lastVisitedOn: "2025-09-15" }),
    territory("R-3", { status: "ASSIGNED", lastVisitedOn: "2020-01-01" }),
    territory("B-1", {
      city: "Bruz",
      type: TerritoryType.BUILDING,
      lastVisitedOn: "N/A",
    }),
  ];

  it("ne propose que les disponibles, jamais parcourus d'abord, puis les moins récemment parcourus", () => {
    const list = suggestTerritories(territories, { today });
    expect(names(list)).toEqual(["B-1", "R-2", "R-1", "R-10"]);
    expect(list[0].lastVisitedOn).toBeNull();
    expect(list[2].lastVisitedOn).toBe("2025-09-15");
  });

  it("filtre par ville et par type", () => {
    expect(
      names(suggestTerritories(territories, { cityName: "Rennes", today }))
    ).toEqual(["R-2", "R-1", "R-10"]);
    expect(
      names(
        suggestTerritories(territories, {
          type: TerritoryType.BUILDING,
          today,
        })
      )
    ).toEqual(["B-1"]);
  });

  it("place en dernier ce que la personne a eu ces deux dernières années, pas avant", () => {
    const list = suggestTerritories(territories, {
      today,
      history: [
        had("R-1", "2025-05-01"),
        had("R-1", "2024-01-01"),
        had("R-2", "2023-06-01"),
      ],
    });

    // R-2, eu il y a plus de deux ans, n'est pas pénalisé
    expect(names(list)).toEqual(["B-1", "R-2", "R-10", "R-1"]);
    expect(list.at(-1)!.recentlyHadOn).toBe("2025-05-01");
    expect(list[1].recentlyHadOn).toBeNull();
  });

  it("ne propose rien sans territoire disponible", () => {
    expect(
      suggestTerritories([territory("X", { status: "LATE" })], { today })
    ).toEqual([]);
  });
});
