import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable } from "@/components/territory/territory-data-table";
import { territoryDataColumns } from "@/components/territory/territory-data-columns";
import { Territory } from "@/models/territory";
import { TerritoryStatus } from "@/models/territory-status";

// La colonne "actions" dépend du store et du routeur : elle n'est pas utile ici
const columns = territoryDataColumns.filter((c) => c.id !== "actions");

// Dans le GeoJSON renvoyé par le back, "city" est le nom de la ville (texte)
const territory = (name: string, status: TerritoryStatus = "AVAILABLE") =>
  ({
    id: name,
    name,
    city: name.startsWith("B") ? "Bordeaux" : "Rennes",
    status,
    type: "HOUSE",
    lastVisitedOn: "2026-01-01",
    assignedOn: "",
    waitedFor: "",
    assignedTo: "",
  }) as unknown as Territory;

// R-1 à R-12 puis B-1 : 13 territoires, donc 2 pages de 10
const data = [
  ...Array.from({ length: 12 }, (_, i) =>
    territory(`R-${i + 1}`, i === 2 ? "LATE" : "AVAILABLE")
  ),
  territory("B-1"),
];

const renderTable = (
  stored: { filters?: unknown[]; sorting?: unknown[] } = {}
) => {
  if (stored.filters) {
    localStorage.setItem("tableFilters-test", JSON.stringify(stored.filters));
  }
  if (stored.sorting) {
    localStorage.setItem("tableSorting-test", JSON.stringify(stored.sorting));
  }
  render(<DataTable columns={columns} data={data} tableId="test" />);
};

// Noms des territoires affichés, dans l'ordre (première cellule de chaque ligne du corps)
const shownNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("DataTable des territoires", () => {
  beforeEach(() => localStorage.clear());

  it("pagine par 10 lignes et passe à la page suivante", async () => {
    renderTable();
    expect(shownNames()).toHaveLength(10);
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Page suivante" })
    );
    expect(screen.getByText("Page 2 sur 2")).toBeInTheDocument();
    expect(shownNames()).toEqual(["R-11", "R-12", "B-1"]);
  });

  it("filtre une colonne texte sans tenir compte de la casse", () => {
    renderTable({ filters: [{ id: "name", value: "r-1" }] });
    expect(shownNames()).toEqual(["R-1", "R-10", "R-11", "R-12"]);
  });

  it("filtre la ville", () => {
    renderTable({ filters: [{ id: "city", value: "bord" }] });
    expect(shownNames()).toEqual(["B-1"]);
  });

  it("filtre le statut sur la valeur exacte", () => {
    renderTable({ filters: [{ id: "status", value: "LATE" }] });
    expect(shownNames()).toEqual(["R-3"]);
  });

  it("trie les noms dans l'ordre alphanumérique", () => {
    renderTable({
      filters: [{ id: "city", value: "Rennes" }],
      sorting: [{ id: "name", desc: true }],
    });
    expect(shownNames()).toEqual([
      "R-12",
      "R-11",
      "R-10",
      "R-9",
      "R-8",
      "R-7",
      "R-6",
      "R-5",
      "R-4",
      "R-3",
    ]);
  });

  it("réinitialise les filtres", async () => {
    renderTable({ filters: [{ id: "name", value: "B-" }] });
    expect(shownNames()).toEqual(["B-1"]);

    await userEvent.click(
      screen.getByRole("button", { name: "Réinitialiser les filtres" })
    );
    expect(shownNames()).toHaveLength(10);
    expect(
      screen.queryByRole("button", { name: "Réinitialiser les filtres" })
    ).not.toBeInTheDocument();
  });
});
