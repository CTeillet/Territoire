"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  DataTableFeatures,
  isOneOf,
} from "@/components/ui/data-table-features";
import { Territory } from "@/models/territory";
import { TYPE_TRANSLATIONS } from "@/models/territory-type";
import React from "react";
import { DataTableColumnHeader } from "@/components/territory/territory-data-header";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import { TerritoryNameLink } from "@/components/territory/territory-name-link";
import { LostBadge } from "@/components/territory/lost-badge";
import { TerritoryStatusBadge } from "@/components/territory/territory-status-badge";

export const COLUMNS_ID_TRANSLATIONS = {
  actions: "Actions",
  id: "Identifiant",
  name: "Territoire",
  city: "Ville",
  status: "Statut",
  type: "Type",
  lastVisitedOn: "Parcouru pour la dernière fois le",
  assignedTo: "Assigné à",
  assignedOn: "Assigné le",
  waitedFor: "Attendu pour le",
};

export const territoryDataColumns: ColumnDef<
  DataTableFeatures,
  Territory,
  unknown
>[] = [
  {
    id: "id",
    accessorKey: "id",
    header: COLUMNS_ID_TRANSLATIONS.id,
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.name}
        />
      );
    },
    cell: ({ row }) => (
      <TerritoryNameLink id={row.original.id} name={row.original.name} />
    ),
    enableColumnFilter: true,
  },
  {
    id: "city",
    accessorKey: "city",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.city}
        />
      );
    },
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue) => {
      return filterValue === "" || row.getValue(columnId) === filterValue;
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.status}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col items-center gap-1">
          <TerritoryStatusBadge status={row.original.status} />
          {row.original.lost && <LostBadge />}
        </div>
      );
    },
    enableColumnFilter: true,
    // Plusieurs statuts à la fois (cf. DataTableColumnHeader)
    filterFn: (row, columnId, filterValue) =>
      isOneOf(row.getValue(columnId), filterValue),
  },
  {
    id: "type",
    accessorKey: "type",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.type}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex justify-center">
          {row.getValue("type")
            ? TYPE_TRANSLATIONS[
                row.getValue("type") as keyof typeof TYPE_TRANSLATIONS
              ]
            : "-"}
        </div>
      );
    },
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue) => {
      return filterValue === "" || row.getValue(columnId) === filterValue;
    },
  },
  {
    id: "lastVisitedOn",
    accessorKey: "lastVisitedOn",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.lastVisitedOn}
        />
      );
    },
  },
  {
    id: "assignedTo",
    accessorKey: "assignedTo",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.assignedTo}
        />
      );
    },
  },
  {
    id: "assignedOn",
    accessorKey: "assignedOn",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.assignedOn}
        />
      );
    },
  },
  {
    id: "waitedFor",
    accessorKey: "waitedFor",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          className={"text-center"}
          column={column}
          title={COLUMNS_ID_TRANSLATIONS.waitedFor}
        />
      );
    },
  },
  {
    id: "actions",
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      return (
        <TerritoryDataActionButtons
          territoryId={row.getValue("id")}
          status={row.original.status}
          territoryMapId={row.original.territoryMapId}
          lost={row.original.lost}
        />
      );
    },
  },
];

// Colonnes de l'attribution en cours : sans objet pour un territoire qui n'est pas attribué
const ASSIGNMENT_COLUMNS = new Set(["assignedTo", "assignedOn", "waitedFor"]);

/** Territoires non parcourus (disponibles ou en attente) : les mêmes colonnes, sans celles de l'attribution. */
export const nonVisitedTerritoryColumns = territoryDataColumns.filter(
  (column) => !ASSIGNMENT_COLUMNS.has(column.id ?? "")
);
