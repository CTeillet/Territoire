import { Badge } from "@/components/ui/badge";

import { CalendarIcon, MapPinIcon, CheckCircleIcon } from "lucide-react";
import {getBadgeColor} from "@/components/territory/territory-data-columns";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status"; // Icônes

interface TerritoryHeaderProps {
    name: string;
    city: string;
    status: TerritoryStatus;
    lastModifiedDate: Date | null;
}

const TerritoryHeader = ({ name, city, status, lastModifiedDate }: TerritoryHeaderProps) => {
    return (
        <div className="mb-4 p-6 max-w-4xl mx-auto bg-gray-100 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-4">
                <CheckCircleIcon className="mr-2 text-blue-500" /> Territoire {name}
            </h1>

            <p className="text-gray-700 flex items-center">
                <MapPinIcon className="mr-2 text-red-500" /> <span className="font-semibold">Ville : </span> {city}
            </p>

            <p className="text-gray-700 flex items-center">
                <span className="font-semibold">🗂 Statut : </span>
                <Badge className={`${getBadgeColor(status)} text-white px-2 py-1 rounded ml-2`}>
                    {STATUS_TRANSLATIONS[status]}
                </Badge>
            </p>

            {lastModifiedDate && (
                <p className="text-gray-500 flex items-center">
                    <CalendarIcon className="mr-2 text-gray-500" /> ⏳ Dernière modification :{" "}
                    {new Date(lastModifiedDate).toLocaleDateString()}
                </p>
            )}
        </div>
    );
};

export default TerritoryHeader;
