"use client";

import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnVisibilityState,
  flexRender,
  PaginationState,
  ReactTable,
  SortingState,
  useTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React, { useEffect, useId, useMemo, useState } from "react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  dataTableFeatures,
  DataTableFeatures,
} from "@/components/ui/data-table-features";
import { format } from "date-fns";
import { toast } from "sonner";
import { Territory } from "@/models/territory";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  FileDown,
  FilterX,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COLUMNS_ID_TRANSLATIONS } from "@/components/territory/territory-data-columns";
import { STATUS_TRANSLATIONS } from "@/models/territory-status";
import { TYPE_TRANSLATIONS } from "@/models/territory-type";
import { useIsMobile } from "@/hooks/use-mobile";
import { NO_MATCH } from "@/lib/search";
import { territorySearchRanks } from "@/lib/territory-search";

interface DataTableProps {
  columns: ColumnDef<DataTableFeatures, Territory, unknown>[];
  data: Territory[];
  tableId?: string; // Identifiant unique pour la table
  /** Recherche (nom, ville, personne, note) : les lignes trouvées, les plus pertinentes d'abord. */
  searchQuery?: string;
  /**
   * Lignes à montrer, dans cet ordre (ex. territoires d'une adresse) ; prime sur `searchQuery`.
   * Une liste vide ne montre rien ; `null` ou absent, pas de restriction.
   */
  restrictToIds?: string[] | null;
  /**
   * Identifiants des lignes retenues par la recherche et les filtres, dans l'ordre du tableau ;
   * `null` sans recherche ni filtre (toutes les lignes). Sert à ne montrer sur la carte que ces territoires.
   */
  onFilteredIdsChange?: (ids: string[] | null) => void;
  /** Début du nom du fichier exporté, complété par la date du jour. */
  exportFileName?: string;
}

/**
 * Colonne masquée de la recherche : elle écarte les lignes qui ne correspondent pas et, en tête du tri,
 * place les plus pertinentes d'abord ; le tri choisi par l'utilisateur départage les autres.
 * Elle n'apparaît ni dans les filtres et le tri mémorisés, ni à l'écran, ni dans l'export.
 */
const SEARCH_COLUMN_ID = "searchRank";

type RankedTerritory = Territory & { searchRank?: number };

const searchRankOf = (territory: Territory) =>
  (territory as RankedTerritory).searchRank ?? 0;

const searchColumn: ColumnDef<DataTableFeatures, Territory, unknown> = {
  id: SEARCH_COLUMN_ID,
  accessorFn: searchRankOf,
  filterFn: (row) => searchRankOf(row.original) !== NO_MATCH,
  sortFn: (rowA, rowB) =>
    searchRankOf(rowA.original) - searchRankOf(rowB.original),
};

const withoutSearch = <T extends { id: string }>(entries: T[]) =>
  entries.filter((entry) => entry.id !== SEARCH_COLUMN_ID);

const territoryCount = (count: number) =>
  `${count} ${count > 1 ? "territoires" : "territoire"}`;

export function DataTable<TValue>({
  columns,
  data,
  tableId,
  searchQuery = "",
  restrictToIds = null,
  onFilteredIdsChange,
  exportFileName = "territoires",
}: DataTableProps) {
  const isMobile = useIsMobile();
  const query = searchQuery.trim();
  const searching = restrictToIds !== null || query !== "";
  // Ce qui est cherché : change quand la recherche ou la liste imposée change
  const searchKey =
    restrictToIds !== null ? `ids:${restrictToIds.join(",")}` : query;
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({
      id: false,
      name: true,
      city: true,
      status: true,
      actions: true,
    });
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window !== "undefined") {
      const storageKey = `tableSorting${tableId ? `-${tableId}` : ""}`;
      const stored = localStorage.getItem(storageKey);
      try {
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (typeof window !== "undefined") {
      const storageKey = `tableFilters${tableId ? `-${tableId}` : ""}`;
      const storedFilters = localStorage.getItem(storageKey);
      return storedFilters ? JSON.parse(storedFilters) : [];
    }
    return [];
  });

  // Page courante gardée le temps de la session : revenir d'un territoire ramène à la même page
  const [pagination, setPagination] = useState<PaginationState>(() => {
    const defaultPagination = { pageIndex: 0, pageSize: 10 };
    if (typeof window !== "undefined") {
      const storageKey = `tablePagination${tableId ? `-${tableId}` : ""}`;
      const stored = sessionStorage.getItem(storageKey);
      try {
        return stored ? JSON.parse(stored) : defaultPagination;
      } catch {
        return defaultPagination;
      }
    }
    return defaultPagination;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `tablePagination${tableId ? `-${tableId}` : ""}`;
      sessionStorage.setItem(storageKey, JSON.stringify(pagination));
    }
  }, [pagination, tableId]);

  // Trier ou filtrer ramène à la première page ; une mise à jour des données (assignation, retour…), non
  const resetPageIndex = () =>
    setPagination((old) => ({ ...old, pageIndex: 0 }));

  // Changer la recherche ramène aussi à la première page (pas au retour sur le tableau, qui garde la sienne)
  const [searchedKey, setSearchedKey] = useState(searchKey);
  if (searchedKey !== searchKey) {
    setSearchedKey(searchKey);
    resetPageIndex();
  }

  // Lignes avec leur pertinence : de nouveaux objets à chaque recherche, que le tableau recalcule entièrement
  const rows = useMemo<Territory[]>(() => {
    if (restrictToIds !== null) {
      const positions = new Map(restrictToIds.map((id, index) => [id, index]));
      return data.map((territory) => ({
        ...territory,
        searchRank: positions.get(territory.id) ?? NO_MATCH,
      }));
    }
    if (!query) return data;
    const ranks = territorySearchRanks(data, query);
    return data.map((territory, index) => ({
      ...territory,
      searchRank: ranks[index],
    }));
  }, [data, query, restrictToIds]);
  const allColumns = useMemo(() => [...columns, searchColumn], [columns]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `tableFilters${tableId ? `-${tableId}` : ""}`;
      localStorage.setItem(storageKey, JSON.stringify(columnFilters));
    }
  }, [columnFilters, tableId]);

  // Persist sorting in localStorage so sort order is restored across reloads
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `tableSorting${tableId ? `-${tableId}` : ""}`;
      localStorage.setItem(storageKey, JSON.stringify(sorting));
    }
  }, [sorting, tableId]);

  const table = useTable({
    features: dataTableFeatures,
    data: rows,
    columns: allColumns,
    onColumnVisibilityChange: setColumnVisibility,
    // La colonne de recherche n'est jamais mémorisée : seule la recherche en cours la remet dans l'état
    onSortingChange: (updater) => {
      setSorting((old) =>
        withoutSearch(typeof updater === "function" ? updater(old) : updater)
      );
      resetPageIndex();
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters((old) =>
        withoutSearch(typeof updater === "function" ? updater(old) : updater)
      );
      resetPageIndex();
    },
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    state: {
      columnVisibility: { ...columnVisibility, [SEARCH_COLUMN_ID]: false },
      sorting: searching
        ? [{ id: SEARCH_COLUMN_ID, desc: false }, ...sorting]
        : sorting,
      columnFilters: searching
        ? [...columnFilters, { id: SEARCH_COLUMN_ID, value: searchKey }]
        : columnFilters,
      pagination,
    },
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const isFiltered = searching || columnFilters.length > 0;
  // Une chaîne plutôt qu'un tableau : l'effet ne se relance que si les lignes retenues changent
  const filteredIdsKey = isFiltered
    ? filteredRows.map((row) => row.original.id).join("\n")
    : null;
  useEffect(() => {
    if (!onFilteredIdsChange) return;
    onFilteredIdsChange(
      filteredIdsKey === null
        ? null
        : filteredIdsKey === ""
          ? []
          : filteredIdsKey.split("\n")
    );
  }, [filteredIdsKey, onFilteredIdsChange]);

  // La page courante peut ne plus exister si des lignes sortent du filtre (ex. territoire assigné) :
  // on se replace alors sur la dernière page (sauf tableau vide, ex. données pas encore chargées)
  const pageCount = table.getPageCount();
  if (pageCount > 0 && pagination.pageIndex >= pageCount) {
    setPagination({ ...pagination, pageIndex: pageCount - 1 });
  }

  const exportToExcel = async () => {
    const filteredData: Record<string, TValue>[] = filteredRows.map((row) => {
      const rowData: Record<string, TValue> = {};
      row.getVisibleCells().forEach((cell) => {
        const columnHeader = cell.column
          .id as keyof typeof COLUMNS_ID_TRANSLATIONS;
        if (columnHeader !== "actions") {
          // Remplacer la clé par sa traduction
          const translatedHeader = COLUMNS_ID_TRANSLATIONS[columnHeader];
          let cellValue: TValue = cell.getValue() as TValue;

          // Traduire la valeur de la colonne "statut"
          if (columnHeader === "status") {
            cellValue = STATUS_TRANSLATIONS[
              cellValue as keyof typeof STATUS_TRANSLATIONS
            ] as unknown as TValue;
          }

          // Traduire la valeur de la colonne "type"
          if (columnHeader === "type" && cellValue) {
            cellValue = TYPE_TRANSLATIONS[
              cellValue as keyof typeof TYPE_TRANSLATIONS
            ] as unknown as TValue;
          }

          rowData[translatedHeader] = cellValue;
        }
      });
      return rowData;
    });

    // Bibliothèque chargée au premier export seulement : elle pèse plus que le reste de la page
    let XLSX: typeof import("xlsx");
    try {
      XLSX = await import("xlsx");
    } catch (error) {
      console.error("Chargement de l'export Excel impossible :", error);
      toast.error("Export impossible : vérifiez votre connexion et réessayez");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feuille 1");
    XLSX.writeFile(
      wb,
      `${exportFileName}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-end mb-4 gap-2">
        <p
          className="mr-auto text-sm text-gray-600"
          aria-live="polite"
          data-testid="territory-count"
        >
          {isFiltered
            ? `${territoryCount(filteredRows.length)} sur ${data.length}`
            : territoryCount(data.length)}
        </p>
        {columnFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <FilterX className="h-4 w-4" />
            <span>Réinitialiser les filtres</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={exportToExcel}
          className="flex items-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          <span>Exporter</span>
        </Button>
      </div>
      {isMobile ? (
        <MobileRows table={table} />
      ) : (
        // Même cadre blanc sur toutes les pages qui affichent ce tableau
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table className="w-full border-collapse">
            {/* En-tête de la table */}
            <TableHeader className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      // Même graisse que les en-têtes triables (boutons) : « Actions » ne détonne plus en capitales
                      className="px-4 py-3 text-center font-medium text-gray-700"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            {/* Corps de la table */}
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="odd:bg-gray-50 hover:bg-gray-100 transition"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-3 text-center text-gray-700"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500"
                  >
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination en bas */}
      <DataTablePagination table={table} />
    </div>
  );
}

// « N/A » : valeur absente telle que l'envoie le back (ex. territoire non assigné)
const isEmptyValue = (value: unknown) =>
  value === null || value === undefined || value === "" || value === "N/A";

/** Libellé d'une colonne dans une fiche : son en-tête s'il est un simple texte, sinon sa traduction. */
const columnLabel = (column: Column<DataTableFeatures, Territory, unknown>) =>
  typeof column.columnDef.header === "string"
    ? column.columnDef.header
    : (COLUMNS_ID_TRANSLATIONS[
        column.id as keyof typeof COLUMNS_ID_TRANSLATIONS
      ] ?? column.id);

/**
 * Téléphone : une fiche par ligne au lieu d'un tableau de plusieurs écrans de large. Les en-têtes triables
 * (tri et filtre) sont regroupés au-dessus des fiches, repliés derrière un bouton qui résume le tri et les
 * filtres actifs ; la première colonne sert de titre, les actions passent en bas de la fiche et les valeurs
 * vides sont omises.
 */
function MobileRows({
  table,
}: {
  table: ReactTable<DataTableFeatures, Territory>;
}) {
  const headers = table
    .getHeaderGroups()
    .flatMap((headerGroup) => headerGroup.headers)
    .filter(
      (header) =>
        !header.isPlaceholder &&
        typeof header.column.columnDef.header === "function"
    );
  const rows = table.getRowModel().rows;
  const optionsId = useId();
  const [showOptions, setShowOptions] = useState(false);

  // La recherche en cours (colonne masquée) n'est ni un tri ni un filtre choisi par l'utilisateur
  const [sort] = withoutSearch(table.state.sorting);
  const sortedColumn = sort
    ? headers.find((header) => header.column.id === sort.id)?.column
    : undefined;
  const filterCount = withoutSearch(table.state.columnFilters).length;
  const summary = [
    sort &&
      sortedColumn &&
      `${columnLabel(sortedColumn)} ${sort.desc ? "↓" : "↑"}`,
    filterCount > 0 &&
      (filterCount > 1 ? `${filterCount} filtres` : "1 filtre"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-gray-100 text-gray-700">
        <button
          type="button"
          aria-expanded={showOptions}
          aria-controls={optionsId}
          onClick={() => setShowOptions((open) => !open)}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-4 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="shrink-0 font-medium">Trier et filtrer</span>
          {summary && (
            <span className="min-w-0 truncate text-gray-500">{summary}</span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "ml-auto h-4 w-4 shrink-0 transition-transform",
              showOptions && "rotate-180"
            )}
          />
        </button>
        {/* Pastilles qui passent à la ligne : rien ne se cache hors de l'écran */}
        {showOptions && (
          <div id={optionsId} className="flex flex-wrap gap-2 px-3 pb-3">
            {headers.map((header) => (
              <div key={header.id} className="rounded-md border bg-white pl-3">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {rows.length ? (
        rows.map((row) => {
          const cells = row.getVisibleCells();
          const actions = cells.find((cell) => cell.column.id === "actions");
          const [title, ...details] = cells.filter(
            (cell) => cell.column.id !== "actions"
          );
          return (
            <div
              key={row.id}
              className="rounded-lg border bg-white p-3 text-gray-700 shadow-sm"
            >
              {title && (
                <h3 className="mb-2 font-semibold text-gray-900">
                  {flexRender(title.column.columnDef.cell, title.getContext())}
                </h3>
              )}
              <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-x-3 gap-y-1.5 text-sm">
                {details
                  .filter(
                    (cell) =>
                      !cell.column.accessorFn || !isEmptyValue(cell.getValue())
                  )
                  .map((cell) => (
                    <React.Fragment key={cell.id}>
                      <dt className="text-gray-500">
                        {columnLabel(cell.column)}
                      </dt>
                      <dd className="min-w-0 justify-self-start break-words">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </dd>
                    </React.Fragment>
                  ))}
              </dl>
              {actions && (
                <div className="mt-3 border-t pt-3">
                  {flexRender(
                    actions.column.columnDef.cell,
                    actions.getContext()
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <p className="py-8 text-center text-gray-500">Aucun résultat.</p>
      )}
    </div>
  );
}
