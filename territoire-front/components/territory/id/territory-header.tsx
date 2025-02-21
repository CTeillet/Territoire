import { Badge } from "@/components/ui/badge";
import {CalendarIcon, CheckCircleIcon, CheckIcon, EditIcon, MapPinIcon, TrashIcon, XIcon} from "lucide-react";
import { getBadgeColor } from "@/components/territory/territory-data-columns";
import { STATUS_TRANSLATIONS, TerritoryStatus } from "@/models/territory-status";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {useDispatch} from "react-redux";
import {AppDispatch} from "@/store/store";
import {deleteTerritory, updateTerritory} from "@/store/slices/territory-slice";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {useRouter} from "next/navigation";

interface TerritoryHeaderProps {
    territoryId: string;
    name: string;
    city: string;
    status: TerritoryStatus;
    lastModifiedDate: string | null;
    note?: string | null;
}

const TerritoryHeader = ({ name, city, status, lastModifiedDate, note, territoryId }: TerritoryHeaderProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // États pour l'édition
    const [tempName, setTempName] = useState(name);
    const [tempCity, setTempCity] = useState(city);
    const [tempNote, setTempNote] = useState(note ?? "");
    const [isEditing, setIsEditing] = useState(false);

    // Sauvegarde des modifications
    const handleSave = () => {
        dispatch(updateTerritory({ id: territoryId, name: tempName, city: tempCity, note: tempNote }));
        setIsEditing(false);
    };

    const handleDelete = () => {
        dispatch(deleteTerritory(territoryId)).then((action) => {
            if (deleteTerritory.fulfilled.match(action)) {
                router.push("/territoires"); // ✅ Redirige après suppression réussie
            }
        });
    };

    return (
        <div className="mb-4 p-6 max-w-4xl mx-auto bg-gray-100 rounded-lg shadow-lg">
            {/* Nom et édition */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                    <CheckCircleIcon className="mr-2 text-blue-500" />
                    {isEditing ? (
                        <Input value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full" />
                    ) : (
                        <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
                    )}
                </div>

                {/* Boutons d'édition et validation */}
                <div className="flex items-center space-x-2">
                    {isEditing ? (
                        <>
                            <button className="bg-green-500 p-2 rounded-full hover:bg-green-600 transition" onClick={handleSave}>
                                <CheckIcon className="w-5 h-5 text-white" />
                            </button>
                            <button className="bg-red-500 p-2 rounded-full hover:bg-red-600 transition" onClick={() => setIsEditing(false)}>
                                <XIcon className="w-5 h-5 text-white" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="bg-gray-300 p-2 rounded-full hover:bg-gray-400 transition" onClick={() => setIsEditing(true)}>
                                <EditIcon className="w-5 h-5 text-gray-800" />
                            </button>
                            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <button className="bg-red-500 p-2 rounded-full hover:bg-red-600 transition">
                                        <TrashIcon className="w-5 h-5 text-white" />
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Supprimer ce territoire ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Cette action est irréversible. Le territoire sera définitivement supprimé.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-red-500 hover:bg-red-600 text-white"
                                        >
                                            Supprimer
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            </div>

            {/* Ville modifiable */}
            <div className="text-gray-700 flex items-center mb-2">
                <MapPinIcon className="mr-2 text-red-500 flex-shrink-0" />
                <span className="font-semibold mr-2 flex-shrink-0">Ville :</span>
                <div className="flex-grow min-w-0">
                    {isEditing ? (
                        <Input value={tempCity} onChange={(e) => setTempCity(e.target.value)} className="w-full" />
                    ) : (
                        <span className="truncate">{city}</span>
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
                    <CalendarIcon className="mr-2 text-gray-500" /> ⏳ Dernière modification : {lastModifiedDate}
                </p>
            )}

            {/* Note modifiable */}
            <div className="mt-6 p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                <h3 className="text-lg font-semibold">Note :</h3>
                {isEditing ? (
                    <Input value={tempNote} onChange={(e) => setTempNote(e.target.value)} className="w-full" />
                ) : (
                    <p className="text-gray-700">{note || "Aucune note"}</p>
                )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex space-x-2 justify-start">
                <TerritoryDataActionButtons id={territoryId} showDetails={false} status={status} />
            </div>
        </div>
    );
};

export default TerritoryHeader;
