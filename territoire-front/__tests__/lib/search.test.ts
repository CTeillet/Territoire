import { describe, expect, it } from "vitest";
import {
  filterBySearch,
  nameRelevance,
  normalizeSearchText,
  NO_MATCH,
  searchTokens,
} from "@/lib/search";
import { territorySearchRanks } from "@/lib/territory-search";
import { Territory } from "@/models/territory";

describe("normalizeSearchText", () => {
  it.each([
    ["R-12", "r12"],
    ["r 12", "r12"],
    ["Évry-Courcouronnes", "evrycourcouronnes"],
    ["L’Haÿ-les-Roses", "lhaylesroses"],
    ["jean.dupont@exemple.fr", "jeandupontexemplefr"],
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("%s → %s", (text, expected) => {
    expect(normalizeSearchText(text)).toBe(expected);
  });
});

describe("searchTokens", () => {
  it("découpe sur les espaces et ignore les mots sans lettre ni chiffre", () => {
    expect(searchTokens("  Jean   - Dupont ")).toEqual(["jean", "dupont"]);
    expect(searchTokens("   ")).toEqual([]);
  });
});

describe("filterBySearch", () => {
  type Item = { name: string; city?: string; note?: string | null };
  const items: Item[] = [
    { name: "R-120", city: "Rennes" },
    { name: "R-12", city: "Rennes" },
    { name: "C-05", city: "Rennes", note: "Digicode 1234" },
    { name: "Centre", city: "Évry" },
  ];
  const fields = (item: Item) => [item.name, item.city, item.note];
  const names = (query: string) =>
    filterBySearch(items, query, fields).map((item) => item.name);

  it("retient tout pour une recherche vide", () => {
    expect(names("")).toEqual(["R-120", "R-12", "C-05", "Centre"]);
    expect(names("  -  ")).toHaveLength(4);
  });

  it("ignore majuscules, accents, tirets et espaces, en gardant l'ordre reçu", () => {
    expect(names("r12")).toEqual(["R-120", "R-12"]);
    expect(names("R 12")).toEqual(["R-120", "R-12"]);
    expect(names("EVRY")).toEqual(["Centre"]);
  });

  it("préfère la recherche entière aux mots pris séparément dans plusieurs champs", () => {
    // « r » (Rennes) et « 12 » (note de C-05) : C-05 n'est retenu que mot par mot
    expect(names("r 12")).not.toContain("C-05");
  });

  it("cherche mot par mot, dans n'importe quel ordre, quand la recherche entière ne donne rien", () => {
    const persons = [
      { first: "Jean", last: "Dupont" },
      { first: "Marie", last: "Durand" },
    ];
    const found = (query: string) =>
      filterBySearch(persons, query, (p) => [p.first, p.last]).map(
        (p) => p.first
      );
    expect(found("dupont jean")).toEqual(["Jean"]);
    expect(found("jean du")).toEqual(["Jean"]);
    expect(found("jean durand")).toEqual([]);
  });

  it("ne trouve rien quand aucun champ ne correspond", () => {
    expect(names("zzz")).toEqual([]);
  });
});

describe("nameRelevance", () => {
  it.each([
    ["R-12", "r12", 0],
    ["R-12", "R 12", 0],
    ["R-12", "12", 1],
    ["A-01", "1", 1],
    ["R-12", "r", 1],
    ["R-12", "r1", 2],
    ["Rennes-Centre", "ren", 2],
    ["R-120", "12", 3],
    ["V-112", "12", 3],
    ["C-05", "digicode", 4],
    ["R-12", "", 0],
  ])("%s pour « %s » : %i", (name, query, expected) => {
    expect(nameRelevance(name, query)).toBe(expected);
  });
});

describe("territorySearchRanks", () => {
  const territory = (overrides: Partial<Territory>) =>
    ({
      id: overrides.name,
      name: "",
      status: "AVAILABLE",
      assignedTo: "N/A",
      note: null,
      ...overrides,
    }) as unknown as Territory;

  it("cherche dans le nom, la ville (texte ou objet), la personne et la note", () => {
    const territories = [
      territory({ name: "R-12", city: "Rennes" as never }),
      territory({ name: "B-1", city: { name: "Bruz" } as never }),
      territory({ name: "A-01", assignedTo: "Élodie Martin" }),
      territory({ name: "C-05", note: "Digicode au portail" }),
    ];
    const found = (query: string) =>
      territorySearchRanks(territories, query)
        .map((rank, i) => (rank === NO_MATCH ? null : territories[i].name))
        .filter(Boolean);

    expect(found("rennes")).toEqual(["R-12"]);
    expect(found("bruz")).toEqual(["B-1"]);
    expect(found("elodie")).toEqual(["A-01"]);
    expect(found("portail")).toEqual(["C-05"]);
  });

  it("n'a pas de personne pour un territoire non attribué (« N/A »)", () => {
    const ranks = territorySearchRanks([territory({ name: "X-1" })], "n/a");
    expect(ranks).toEqual([NO_MATCH]);
  });

  it("classe par pertinence du nom", () => {
    const territories = [
      territory({ name: "R-120" }),
      territory({ name: "R-12" }),
    ];
    expect(territorySearchRanks(territories, "r12")).toEqual([2, 0]);
  });
});
