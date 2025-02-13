import {TerritoryCollection} from "@/models/territory";
import React from "react";
import {TerritoryCollectionProps} from "@/models/territory-props";
import TerritoryRow from "@/components/territory/territory-row";

const TerritoryTable:React.FC<TerritoryCollectionProps> = ({ geoJsonData }: { geoJsonData: TerritoryCollection }) => {
    return (
        <table className="w-full border-collapse border border-gray-300">
            <thead>
            <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Nom</th>
                <th className="border border-gray-300 p-2">Ville</th>
                <th className="border border-gray-300 p-2">Statut</th>
                <th className="border border-gray-300 p-2">Actions</th>
            </tr>
            </thead>
            <tbody>
            {geoJsonData.features.map((feature) => (
                <TerritoryRow key={feature.properties.id} feature={feature} />
            ))}
            </tbody>
        </table>
    );
};

export default TerritoryTable;
