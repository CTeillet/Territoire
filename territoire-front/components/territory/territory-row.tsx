import {TerritoryFeature} from "@/models/territory";
import {TerritoryFeatureProps} from "@/models/territory-props";
import React from "react";
import Link from "next/link";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {Badge} from "@/components/ui/badge";


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

const TerritoryRow: React.FC<TerritoryFeatureProps> = ({ feature }: { feature: TerritoryFeature }) => {
    return (
        <tr className="text-center">
            <td className="border border-gray-300 p-2">{feature.properties.name}</td>
            <td className="border border-gray-300 p-2">{feature.properties.city}</td>
            <td className="border border-gray-300 p-2">
                <Badge className={`${getBadgeColor(feature.properties.status)} text-white px-2 py-1 rounded`}>
                    {STATUS_TRANSLATIONS[feature.properties.status]}
                </Badge>
            </td>
            <td className="border border-gray-300 p-2">
                <Link href={`/territoires/${feature.properties.id}`} className="text-blue-500">
                    Voir
                </Link>
            </td>
        </tr>
    );
};

export default TerritoryRow;
