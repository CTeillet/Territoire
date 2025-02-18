import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CheckCircleIcon, CheckIcon, EditIcon, MapPinIcon, XIcon } from "lucide-react";
import { getBadgeColor, PERSONS_MOCK } from "@/components/territory/territory-data-columns";
import { STATUS_TRANSLATIONS, TerritoryStatus } from "@/models/territory-status";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import { useEffect, useState } from "react";
import { Person } from "@/models/person";
import { Input } from "@/components/ui/input";

interface TerritoryHeaderProps {
    territoryId: string;
    name: string;
    city: string;
    status: TerritoryStatus;
    lastModifiedDate: Date | null;
    note?: string | null;
}

const TerritoryHeader = ({ name, city, status, lastModifiedDate, note, territoryId }: TerritoryHeaderProps) => {
    const [persons, setPersons] = useState<Person[]>([]);

    // États principaux (valeurs validées)
    const [editableName, setEditableName] = useState<string>(name);
    const [editableCity, setEditableCity] = useState<string>(city);
    const [editableNote, setEditableNote] = useState<string>(note ?? "");

    // États temporaires pour l'édition
    const [tempName, setTempName] = useState<string>(name);
    const [tempCity, setTempCity] = useState<string>(city);
    const [tempNote, setTempNote] = useState<string>(note ?? "");

    const [isEditing, setIsEditing] = useState<boolean>(false);

    useEffect(() => {
        const fetchPersons = () => {
            setTimeout(() => {
                setPersons(PERSONS_MOCK);
            });
        };

        fetchPersons();
    }, []);

    // Sauvegarde des modifications
    const handleSave = () => {
        setEditableName(tempName);
        setEditableCity(tempCity);
        setEditableNote(tempNote);
        setIsEditing(false);
        //TODO : appeler l'API pour mettre à jour les données
        console.log("Données mises à jour :", { tempName, tempCity, tempNote });
    };

    // Annulation des modifications (on remet les valeurs validées)
    const handleCancel = () => {
        setTempName(editableName);
        setTempCity(editableCity);
        setTempNote(editableNote);
        setIsEditing(false);
    };

    return (
        <div className="mb-4 p-6 max-w-4xl mx-auto bg-gray-100 rounded-lg shadow-lg">
            {/* Ligne contenant le nom et le bouton d'édition */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                    <CheckCircleIcon className="mr-2 text-blue-500" />
                    {isEditing ? (
                        <Input
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="w-full"
                        />
                    ) : (
                        <h1 className="text-3xl font-bold text-gray-900">{editableName}</h1>
                    )}
                </div>

                {/* Boutons d'édition et de validation */}
                <div className="flex items-center space-x-2">
                    {isEditing ? (
                        <>
                            <button
                                className="bg-green-500 p-2 rounded-full hover:bg-green-600 transition"
                                onClick={handleSave}
                            >
                                <CheckIcon className="w-5 h-5 text-white" />
                            </button>
                            <button
                                className="bg-red-500 p-2 rounded-full hover:bg-red-600 transition"
                                onClick={handleCancel}
                            >
                                <XIcon className="w-5 h-5 text-white" />
                            </button>
                        </>
                    ) : (
                        <button
                            className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition"
                            onClick={() => setIsEditing(true)}
                        >
                            <EditIcon className="w-5 h-5 text-gray-800" />
                        </button>
                    )}
                </div>
            </div>

            {/* Ville modifiable */}
            <div className="text-gray-700 flex items-center mb-2">
                <MapPinIcon className="mr-2 text-red-500 flex-shrink-0" />
                <span className="font-semibold mr-2 flex-shrink-0">Ville :</span>
                <div className="flex-grow min-w-0">
                    {isEditing ? (
                        <Input
                            value={tempCity}
                            onChange={(e) => setTempCity(e.target.value)}
                            className="w-full"
                        />
                    ) : (
                        <span className="truncate">{editableCity}</span>
                    )}
                </div>
            </div>

            {/* Statut */}
            <p className="text-gray-700 flex items-center mb-2">
                <span className="font-semibold">🗂 Statut :</span>
                <Badge className={`${getBadgeColor(status)} text-white px-2 py-1 rounded ml-2`}>
                    {STATUS_TRANSLATIONS[status]}
                </Badge>
            </p>

            {/* Dernière modification */}
            {lastModifiedDate && (
                <p className="text-gray-500 flex items-center mb-1">
                    <CalendarIcon className="mr-2 text-gray-500" /> ⏳ Dernière modification :{" "}
                    {new Date(lastModifiedDate).toLocaleDateString()}
                </p>
            )}

            {/* Note modifiable */}
            <div className="mt-6">
                <div className="mt-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                    <h3 className="text-lg font-semibold">Note :</h3>

                    {isEditing ? (
                        <div className="flex items-center space-x-2">
                            <Input
                                value={tempNote}
                                onChange={(e) => setTempNote(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    ) : (
                        <div className="relative">
                            <p className="text-gray-700">{editableNote || "Aucune note"}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6">
                <TerritoryDataActionButtons people={persons} id={territoryId} showDetails={false} status={status}/>
            </div>
        </div>
    );
};

export default TerritoryHeader;
