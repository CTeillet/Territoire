import {ColumnDef} from "@tanstack/react-table"
import {Territory} from "@/models/territory";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {Badge} from "@/components/ui/badge";
import React from "react";
import {Button} from "@/components/ui/button";
import {Eye} from "lucide-react";
import Link from "next/link";
import {DataTableColumnHeader} from "@/components/territory/territory-data-header";


export const columns: ColumnDef<Territory>[] = [
    {
        id: "id",
        accessorKey: "id",
        header: "ID",
    },
    {
        id: "name",
        accessorKey: "name",
        header: ({column}) => {
            return (<DataTableColumnHeader column={column} title="Name"/>)
        },
        enableColumnFilter: true,
    }, {
        id: "city",
        accessorKey: "city",
        header: ({column}) => {
            return (<DataTableColumnHeader column={column} title="Ville"/>)
        },
        enableColumnFilter: true,
    },
    {
        id: "status",
        accessorKey: "status",
        header: ({column}) => {
            return (<DataTableColumnHeader column={column} title="Statut"/>)
        },
        cell: ({row}) => {
            return <Badge className={`${getBadgeColor(row.getValue("status"))} text-white px-2 py-1 rounded`}>
                {STATUS_TRANSLATIONS[row.getValue("status") as keyof typeof STATUS_TRANSLATIONS]}
            </Badge>
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
            return <Link href={`/territoires/${row.getValue("id")}`}>
                <Button><Eye/></Button>
            </Link>
        }
    },
]

const getBadgeColor = (status: TerritoryStatus) => {
    switch (status) {
        case "AVAILABLE":
            return "bg-green-500";
        case "ASSIGNED":
            return "bg-blue-500";
        case "LATE":
            return "bg-red-500";
        case "PENDING":
            return "bg-yellow-500";
        default:
            return "bg-gray-500";

    }
};
