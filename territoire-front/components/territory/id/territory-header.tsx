import { Badge } from "@/components/ui/badge";

import { CalendarIcon, MapPinIcon, CheckCircleIcon } from "lucide-react";
import {getBadgeColor, PERSONS_MOCK} from "@/components/territory/territory-data-columns";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {TerritoryDataActionButtons} from "@/components/territory/territory-data-action-buttons";
import {useEffect, useState} from "react";
import {Person} from "@/models/person"; // Icônes

interface TerritoryHeaderProps {
    name: string;
    city: string;
    status: TerritoryStatus;
    lastModifiedDate: Date | null;
    note?: string | null;
}

const TerritoryHeader = ({ name, city, status, lastModifiedDate, note }: TerritoryHeaderProps) => {
    const [persons, setPersons] = useState<Person[]>([]);

    useEffect(() => {
        const fetchPersons = () => {
            setTimeout(() => {
                setPersons(PERSONS_MOCK);
            });
        };

        fetchPersons();
    }, []);

    return (
        <div className="mb-4 p-6 max-w-4xl mx-auto bg-gray-100 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-5">
                <CheckCircleIcon className="mr-2 text-blue-500" /> {name}
            </h1>

            <p className="text-gray-700 flex items-center mb-2">
                <MapPinIcon className="mr-2 text-red-500" /> <span className="font-semibold mr-2">Ville : </span> {city}
            </p>

            <p className="text-gray-700 flex items-center mb-2">
                <span className="font-semibold">🗂 Statut :</span>
                <Badge className={`${getBadgeColor(status)} text-white px-2 py-1 rounded ml-2`}>
                    {STATUS_TRANSLATIONS[status]}
                </Badge>
            </p>

            {lastModifiedDate && (
                <p className="text-gray-500 flex items-center mb-1">
                    <CalendarIcon className="mr-2 text-gray-500" /> ⏳ Dernière modification :{" "}
                    {new Date(lastModifiedDate).toLocaleDateString()}
                </p>
            )}

            <div className={"mt-6"}>
                {note && note.trim() !== "" && (
                    <div className="mt-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                        <h3 className="text-lg font-semibold">Note :</h3>
                        <p className="text-gray-800">{note}</p>
                    </div>
                )}
            </div>

            <div className={"mt-6"}>
                <TerritoryDataActionButtons people={persons}/>
            </div>
        </div>
    );
};

export default TerritoryHeader;
