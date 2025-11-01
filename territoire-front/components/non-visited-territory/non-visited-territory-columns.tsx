"use client";

import {ColumnDef} from "@tanstack/react-table"
import {Territory} from "@/models/territory";
import {STATUS_TRANSLATIONS} from "@/models/territory-status";
import {TYPE_TRANSLATIONS} from "@/models/territory-type";
import {Badge} from "@/components/ui/badge";
import React from "react";
import {DataTableColumnHeader} from "@/components/territory/territory-data-header";
import {
    TerritoryDataActionButtons
} from "@/components/shared/territory-data-action-buttons";
import {getBadgeColor} from "@/components/utils";

// Column translations
export const COLUMNS_ID_TRANSLATIONS = {
    actions: "Actions",
    id: "Identifiant",
    name: "Territoire",
    city: "Ville",
    status: "Statut",
    type: "Type",
    lastVisitedOn: "Parcouru pour la dernière fois le"
}

// Hardcoded columns for non-visited territories page
export const nonVisitedTerritoryColumns: ColumnDef<Territory, unknown>[] = [
    {
        id: "id",
        accessorKey: "id",
        header: COLUMNS_ID_TRANSLATIONS.id,
    },
    {
        id: "name",
        accessorKey: "name",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title={COLUMNS_ID_TRANSLATIONS.name}/>)
        },
        enableColumnFilter: true,
    },
    {
        id: "city",
        accessorKey: "city",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title={COLUMNS_ID_TRANSLATIONS.city}/>)
        },
        enableColumnFilter: true,
    },
    {
        id: "status",
        accessorKey: "status",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title={COLUMNS_ID_TRANSLATIONS.status}/>)
        },
        cell: ({row}) => {
            return (
                <div className="flex justify-center">
                    <Badge className={`${getBadgeColor(row.getValue("status"))} text-white px-2 py-1 rounded w-full `}>
                        {STATUS_TRANSLATIONS[row.getValue("status") as keyof typeof STATUS_TRANSLATIONS]}
                    </Badge>
                </div>
            )
        },
        enableColumnFilter: true,
        filterFn: (row, columnId, filterValue) => {
            return filterValue === "" || row.getValue(columnId) === filterValue;
        },
    },
    {
        id: "type",
        accessorKey: "type",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title={COLUMNS_ID_TRANSLATIONS.type}/>)
        },
        cell: ({row}) => {
            return (
                <div className="flex justify-center">
                    {row.getValue("type") ? TYPE_TRANSLATIONS[row.getValue("type") as keyof typeof TYPE_TRANSLATIONS] : "-"}
                </div>
            )
        },
        enableColumnFilter: true,
        filterFn: (row, columnId, filterValue) => {
            return filterValue === "" || row.getValue(columnId) === filterValue;
        },
    },
    {
        id: "lastVisitedOn",
        accessorKey: "lastVisitedOn",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title={COLUMNS_ID_TRANSLATIONS.lastVisitedOn}/>)
        },
    },
    {
        id: "actions",
        accessorKey: "actions",
        header: "Actions",
        cell: ({row}) => {
            return <TerritoryDataActionButtons 
                territoryId={row.getValue("id")} 
                status={row.original.status}
                territoryMapId={row.original.territoryMapId}
            />
        },
    },
]
