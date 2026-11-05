import { describe, expect, it } from "vitest";
import {
  Assignment,
  assignmentHolder,
  compareByLatestMovement,
  compareByMostRecent,
} from "@/models/assignment";
import { comparePersons, Person } from "@/models/person";

const assignment = (
  id: string,
  assignmentDate: string,
  returnDate: string | null,
  overrides: Partial<Assignment> = {}
): Assignment =>
  ({
    id,
    territory: { territoryId: id, name: id },
    person: { id: "p1", firstName: "Jean", lastName: "Dupont" },
    assignmentDate,
    dueDate: assignmentDate,
    returnDate,
    ...overrides,
  }) as Assignment;

const ids = (assignments: Assignment[]) => assignments.map((a) => a.id);

describe("assignmentHolder", () => {
  it("nomme la personne, sinon la campagne", () => {
    expect(assignmentHolder(assignment("a", "2026-01-01", null))).toBe(
      "Jean Dupont"
    );
    expect(
      assignmentHolder(
        assignment("a", "2026-01-01", "2026-02-01", {
          person: undefined,
          campaign: { name: "Mémorial" } as never,
        })
      )
    ).toBe("Campagne: Mémorial");
    expect(
      assignmentHolder(
        assignment("a", "2026-01-01", null, { person: undefined })
      )
    ).toBe("N/A");
  });
});

describe("compareByMostRecent", () => {
  it("place l'attribution en cours d'abord, puis les terminées de la plus récente à la plus ancienne", () => {
    const sorted = [
      assignment("2023", "2023-12-14", "2024-06-14"),
      assignment("en-cours", "2026-10-25", null),
      assignment("campagne", "2025-03-22", "2025-04-12", {
        person: undefined,
        campaign: { name: "Mémorial 2025" } as never,
      }),
      assignment("2025", "2025-08-29", "2026-04-22"),
    ].sort(compareByMostRecent);

    expect(ids(sorted)).toEqual(["en-cours", "2025", "campagne", "2023"]);
  });

  it("garde en tête une attribution en cours plus ancienne qu'une campagne", () => {
    const sorted = [
      assignment("campagne", "2026-03-01", "2026-04-01", {
        person: undefined,
        campaign: { name: "Mémorial 2026" } as never,
      }),
      assignment("en-cours", "2025-10-25", null),
    ].sort(compareByMostRecent);

    expect(ids(sorted)).toEqual(["en-cours", "campagne"]);
  });

  it("départage par date de retour puis par nom de territoire", () => {
    const sorted = [
      assignment("T10", "2026-01-01", null),
      assignment("tôt", "2026-01-01", "2026-02-01"),
      assignment("T2", "2026-01-01", null),
      assignment("tard", "2026-01-01", "2026-03-01"),
    ].sort(compareByMostRecent);

    expect(ids(sorted)).toEqual(["T2", "T10", "tard", "tôt"]);
  });
});

describe("compareByLatestMovement", () => {
  it("trie du dernier mouvement au plus ancien : un retour compte à sa date de retour", () => {
    const sorted = [
      assignment("attribué-avant", "2026-11-01", null),
      assignment("rendu-hier", "2026-04-22", "2026-11-04"),
      assignment("attribué-hier", "2026-11-04", null),
      assignment("rendu-avant", "2026-04-22", "2026-10-30"),
    ].sort(compareByLatestMovement);

    expect(ids(sorted)).toEqual([
      "attribué-hier",
      "rendu-hier",
      "attribué-avant",
      "rendu-avant",
    ]);
  });

  it("regroupe les mouvements d'un même jour par personne, puis par territoire", () => {
    const merline = { id: "p2", firstName: "Merline", lastName: "Janvier" };
    const emilie = { id: "p3", firstName: "EMILIE", lastName: "HERMANN" };
    const sorted = [
      assignment("157", "2026-11-04", null, { person: merline }),
      assignment("S117", "2026-11-04", null, { person: emilie }),
      assignment("108", "2026-11-04", null, { person: merline }),
      assignment("JP12", "2026-11-04", null, { person: emilie }),
    ].sort(compareByLatestMovement);

    expect(ids(sorted)).toEqual(["JP12", "S117", "108", "157"]);
  });
});

describe("comparePersons", () => {
  it("trie par nom puis par prénom, sans casse ni accents", () => {
    const person = (firstName: string, lastName: string): Person => ({
      id: `${firstName}-${lastName}`,
      firstName,
      lastName,
    });
    const sorted = [
      person("Paul", "Martin"),
      person("Élodie", "ZOLA"),
      person("anne", "martin"),
      person("Jean", "Écrivain"),
    ].sort(comparePersons);

    expect(sorted.map((p) => p.id)).toEqual([
      "Jean-Écrivain",
      "anne-martin",
      "Paul-Martin",
      "Élodie-ZOLA",
    ]);
  });
});
