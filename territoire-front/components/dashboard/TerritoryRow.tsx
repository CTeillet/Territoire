import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Territory} from "@/models/territory";

const getBadgeColor = (status: string) => {
    switch (status) {
        case "disponible":
            return "bg-green-500";
        case "attribué":
            return "bg-blue-500";
        case "en retard":
            return "bg-red-500";
        default:
            return "bg-gray-500";
    }
};

export const TerritoryRow: React.FC<Territory>  = (territory: Territory ) => (
    <TableRow>
        <TableCell>{territory.name}</TableCell>
        <TableCell>
            <Badge className={`${getBadgeColor(territory.status)} text-white px-2 py-1 rounded`}>{territory.status}</Badge>
        </TableCell>
        <TableCell>{territory.lastModifiedDate?.toDateString() || "N/A"}</TableCell>
        <TableCell>
            <Button>Voir</Button>
        </TableCell>
    </TableRow>
);
