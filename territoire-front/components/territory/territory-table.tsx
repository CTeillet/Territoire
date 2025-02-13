import {TerritoryCollection} from "@/models/territory";
import React from "react";
import {TerritoryCollectionProps} from "@/models/territory-props";
import TerritoryRow from "@/components/territory/territory-row";
import {Table, TableBody, TableCaption, TableCell, TableHeader, TableRow} from "@/components/ui/table";

const TerritoryTable: React.FC<TerritoryCollectionProps> = ({geoJsonData}: { geoJsonData: TerritoryCollection }) => {
    return (
        <Table className="w-full text-center border border-gray-300 rounded-sm">
            <TableCaption></TableCaption>

            <TableHeader className="bg-gray-100">
                <TableRow className="border-b border-gray-300">
                    <TableCell className="text-center font-bold">Nom</TableCell>
                    <TableCell className="text-center font-bold">Ville</TableCell>
                    <TableCell className="text-center font-bold">Statut</TableCell>
                    <TableCell className="text-center font-bold">Actions</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200">
                {geoJsonData.features.map((feature) => (
                    <TerritoryRow key={feature.properties.id} feature={feature}/>
                ))}
            </TableBody>
        </Table>
    );
};

export default TerritoryTable;
