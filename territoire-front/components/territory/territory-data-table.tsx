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
import React, { useEffect, useState } from "react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  dataTableFeatures,
  DataTableFeatures,
} from "@/components/ui/data-table-features";
import * as XLSX from "xlsx";
import { Territory } from "@/models/territory";
import { Button } from "@/components/ui/button";
import { FileDown, FilterX } from "lucide-react";
import { COLUMNS_ID_TRANSLATIONS } from "@/components/territory/territory-data-columns";
import { STATUS_TRANSLATIONS } from "@/models/territory-status";
import { TYPE_TRANSLATIONS } from "@/models/territory-type";
import { useIsMobile } from "@/hooks/use-mobile";

interface DataTableProps {
  columns: ColumnDef<DataTableFeatures, Territory, unknown>[];
  data: Territory[];
  tableId?: string; // Identifiant unique pour la table
}

export function DataTable<TValue>({ columns, data, tableId }: DataTableProps) {
  const isMobile = useIsMobile();
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
    data,
    columns,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      setSorting(updater);
      resetPageIndex();
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      resetPageIndex();
    },
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    state: {
      columnVisibility,
      sorting,
      columnFilters,
      pagination,
    },
  });

  // La page courante peut ne plus exister si des lignes sortent du filtre (ex. territoire assigné) :
  // on se replace alors sur la dernière page (sauf tableau vide, ex. données pas encore chargées)
  const pageCount = table.getPageCount();
  if (pageCount > 0 && pagination.pageIndex >= pageCount) {
    setPagination({ ...pagination, pageIndex: pageCount - 1 });
  }

  const exportToExcel = () => {
    const filteredData: Record<string, TValue>[] = table
      .getFilteredRowModel()
      .rows.map((row) => {
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

    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feuille 1");
    XLSX.writeFile(wb, "table_data.xlsx");
  };

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4 gap-2">
        {table.state.columnFilters.length > 0 && (
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
        <div className="overflow-x-auto">
          <Table className="w-full border-collapse">
            {/* En-tête de la table */}
            <TableHeader className="bg-gray-100 border-b-2 border-gray-300">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3 text-center text-gray-700 font-semibold uppercase tracking-wider"
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
                        className="px-4 py-3 text-center text-gray-700 border-b"
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
 * (tri et filtre) sont regroupés au-dessus des fiches ; la première colonne sert de titre, les actions
 * passent en bas de la fiche et les valeurs vides sont omises.
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

  return (
    <div className="space-y-3">
      {/* Une seule ligne qui défile horizontalement : les fiches restent visibles sous les en-têtes */}
      <div className="flex items-center gap-4 overflow-x-auto rounded-lg bg-gray-100 px-4 py-1 text-gray-700">
        <span className="shrink-0 text-sm font-medium">Trier / filtrer :</span>
        {headers.map((header) => (
          <div key={header.id} className="shrink-0">
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
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
