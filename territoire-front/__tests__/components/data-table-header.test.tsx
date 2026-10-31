import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "@/components/ui/data-table-features";
import { DataTableColumnHeader } from "@/components/territory/territory-data-header";

const fakeColumn = (
  id: string,
  sorted: false | "asc" | "desc" = false,
  filter?: string,
  values: string[] = []
) =>
  ({
    id,
    table: {
      getCoreRowModel: () => ({
        rows: values.map((value) => ({ getValue: () => value })),
      }),
    },
    getFilterValue: () => filter,
    setFilterValue: vi.fn(),
    getIsSorted: () => sorted,
    toggleSorting: vi.fn(),
  }) as unknown as Column<
    DataTableFeatures,
    Record<string, unknown>,
    unknown
  > & {
    setFilterValue: ReturnType<typeof vi.fn>;
    toggleSorting: ReturnType<typeof vi.fn>;
  };

const open = async (column: ReturnType<typeof fakeColumn>, title = "Nom") => {
  render(<DataTableColumnHeader column={column} title={title} />);
  await userEvent.click(screen.getByRole("button", { name: title }));
  return screen.findByRole("menu");
};

describe("DataTableColumnHeader", () => {
  it.each([
    ["asc", "lucide-arrow-up"],
    ["desc", "lucide-arrow-down"],
    [false, "lucide-chevrons-up-down"],
  ] as const)("indique le tri courant (%s)", (sorted, icon) => {
    const { container } = render(
      <DataTableColumnHeader column={fakeColumn("name", sorted)} title="Nom" />
    );
    expect(container.querySelector(`button svg.${icon}`)).not.toBeNull();
  });

  it("trie par ordre ascendant ou descendant", async () => {
    const column = fakeColumn("name");
    await open(column);
    await userEvent.click(screen.getByRole("menuitem", { name: "Ascendant" }));
    expect(column.toggleSorting).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByRole("button", { name: "Nom" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Descendant" })
    );
    expect(column.toggleSorting).toHaveBeenCalledWith(true);
  });

  it("filtre les colonnes texte et retire le filtre quand le champ est vidé", async () => {
    const column = fakeColumn("name", false, "R-1");
    await open(column);
    const input = screen.getByPlaceholderText("Filtrer Nom");
    expect(input).toHaveValue("R-1");

    fireEvent.change(input, { target: { value: "R-12" } });
    expect(column.setFilterValue).toHaveBeenLastCalledWith("R-12");
    fireEvent.change(input, { target: { value: "" } });
    expect(column.setFilterValue).toHaveBeenLastCalledWith(undefined);
  });

  it.each([
    ["name", () => screen.getByPlaceholderText("Filtrer Nom")],
    ["status", () => screen.getByRole("combobox")],
    ["type", () => screen.getByRole("combobox")],
    ["city", () => screen.getByRole("combobox")],
  ])(
    "garde le menu ouvert pendant la saisie dans le filtre (%s)",
    async (id, field) => {
      await open(fakeColumn(id));

      // Ni la frappe (typeahead du menu) ni le clic ne doivent remonter jusqu'au menu
      const keyDown = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      const stopKey = vi.spyOn(keyDown, "stopPropagation");
      field().dispatchEvent(keyDown);
      const pointerDown = new MouseEvent("pointerdown", { bubbles: true });
      const stopPointer = vi.spyOn(pointerDown, "stopPropagation");
      field().dispatchEvent(pointerDown);

      expect(stopKey).toHaveBeenCalled();
      expect(stopPointer).toHaveBeenCalled();
      expect(screen.getByRole("menu")).toBeInTheDocument();
    }
  );

  it("propose les statuts et les types de territoire", async () => {
    const status = fakeColumn("status");
    await open(status, "Statut");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Tous",
      "Disponible",
      "Attribué",
      "En retard",
      "En attente",
    ]);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "LATE" },
    });
    expect(status.setFilterValue).toHaveBeenCalledWith("LATE");
  });

  it("propose les villes du tableau, triées et sans doublon", async () => {
    const city = fakeColumn("city", false, undefined, [
      "Rennes",
      "Cesson",
      "Rennes",
      "",
      "Bruz",
    ]);
    await open(city, "Ville");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Toutes",
      "Bruz",
      "Cesson",
      "Rennes",
    ]);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Cesson" },
    });
    expect(city.setFilterValue).toHaveBeenCalledWith("Cesson");
  });

  it("garde la ville filtrée dans la liste même absente du tableau", async () => {
    await open(fakeColumn("city", false, "Bruz", ["Rennes"]), "Ville");
    expect(screen.getByRole("combobox")).toHaveValue("Bruz");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Toutes",
      "Bruz",
      "Rennes",
    ]);
  });
});
