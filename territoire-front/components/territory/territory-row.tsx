import {TerritoryFeature} from "@/models/territory";
import {TerritoryFeatureProps} from "@/models/territory-props";
import React from "react";
import Link from "next/link";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {Badge} from "@/components/ui/badge";
import {TableCell, TableRow} from "@/components/ui/table";
import {Eye} from "lucide-react";
import {Button} from "@/components/ui/button";


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

const TerritoryRow: React.FC<TerritoryFeatureProps> = ({feature}: { feature: TerritoryFeature }) => {
    return (
        <TableRow className="border-b border-gray-300">
            <TableCell className="text-center">
                {feature.properties.name}
            </TableCell>
            <TableCell className="text-center">
                {feature.properties.city}
            </TableCell>
            <TableCell className="text-center">
                <Badge className={`${getBadgeColor(feature.properties.status)} text-white px-2 py-1 rounded`}>
                    {STATUS_TRANSLATIONS[feature.properties.status]}
                </Badge>
            </TableCell>
            <TableCell className="text-center">
                <Link href={`/territoires/${feature.properties.id}`}>
                    <Button><Eye/></Button>
                </Link>

            </TableCell>
        </TableRow>
    );
};

export default TerritoryRow;
