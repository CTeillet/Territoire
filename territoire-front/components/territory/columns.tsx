import {ColumnDef} from "@tanstack/react-table"
import {Territory} from "@/models/territory";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {Badge} from "@/components/ui/badge";
import React from "react";
import {Button} from "@/components/ui/button";
import {Eye, FileInput, FileOutput} from "lucide-react";
import Link from "next/link";
import {DataTableColumnHeader} from "@/components/territory/territory-data-header";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";


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
            return (
                <TooltipProvider>
                    <div className={"flex justify-center space-x-2"}>
                        {/* Bouton Voir */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={`/territoires/${row.getValue("id")}`}>
                                    <Button className="bg-gray-500 hover:bg-gray-600 text-white">
                                        <Eye />
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>Voir les détails</TooltipContent>
                        </Tooltip>

                        {/* Bouton Importer (Bleu) */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                                    <FileInput />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retour du territoire dans le stock</TooltipContent>
                        </Tooltip>

                        {/* Bouton Exporter (Vert) */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="bg-green-500 hover:bg-green-600 text-white">
                                    <FileOutput />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Assignation du territoire</TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            )
        }
    },
]

const getBadgeColor = (status: TerritoryStatus) => {
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
