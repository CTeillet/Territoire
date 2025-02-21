"use client";

import {ColumnDef} from "@tanstack/react-table"
import {Territory} from "@/models/territory";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {Badge} from "@/components/ui/badge";
import React from "react";
import {DataTableColumnHeader} from "@/components/territory/territory-data-header";
import {
    TerritoryDataActionButtons
} from "@/components/shared/territory-data-action-buttons";
export const territoryDataColumns: ColumnDef<Territory>[] = [
    {
        id: "id",
        accessorKey: "id",
        header: "ID",
    },
    {
        id: "name",
        accessorKey: "name",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title="Name"/>)
        },
        enableColumnFilter: true,
    }, {
        id: "city",
        accessorKey: "city",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title="Ville"/>)
        },
        enableColumnFilter: true,
    },
    {
        id: "status",
        accessorKey: "status",
        header: ({column}) => {
            return (<DataTableColumnHeader className={"text-center"} column={column} title="Statut"/>)
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
        id: "actions",
        accessorKey: "actions",
        header: "Actions",
        cell: ({row}) => {
            return <TerritoryDataActionButtons territoryId={row.getValue("id")} status={row.original.status}/>
        },

    },
]

export const getBadgeColor = (status: TerritoryStatus) => {
    switch (status) {
        case "AVAILABLE":
            return "bg-purple-500";  // 🟣 Violet
        case "ASSIGNED":
            return "bg-orange-500";  // 🟠 Orange
        case "LATE":
            return "bg-pink-500";    // 🔴 Rose
        case "PENDING":
            return "bg-amber-700";   // 🟤 Brun
        default:
            return "bg-gray-500";    // ⚫ Gris
    }
};
