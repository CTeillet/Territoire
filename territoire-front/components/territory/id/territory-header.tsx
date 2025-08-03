import { Badge } from "@/components/ui/badge";
import {CalendarIcon, CheckCircleIcon, CheckIcon, EditIcon, MapPinIcon, TrashIcon, XIcon} from "lucide-react";
import { STATUS_TRANSLATIONS, TerritoryStatus } from "@/models/territory-status";
import { TYPE_TRANSLATIONS, TerritoryType } from "@/models/territory-type";
import { TerritoryDataActionButtons } from "@/components/shared/territory-data-action-buttons";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@/store/store";
import {deleteTerritory, updateTerritory} from "@/store/slices/territory-slice";
import {fetchCities} from "@/store/slices/city-slice";
import {UpdateTerritoryDto} from "@/models/update-territory-dto";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {useRouter} from "next/navigation";
import {getBadgeColor} from "@/components/utils";

interface TerritoryHeaderProps {
    territoryId: string;
    name: string;
    city: string;
    status: TerritoryStatus;
    type?: TerritoryType;
    lastModifiedDate: string | null;
    note?: string | null;
    territoryMapId?: string;
}

const TerritoryHeader = ({ name, city, status, type, lastModifiedDate, note, territoryId, territoryMapId }: TerritoryHeaderProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const user = useSelector((state: RootState) => state.auth.user);
    const cities = useSelector((state: RootState) => state.cities.cities);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // États pour l'édition
    const [tempName, setTempName] = useState(name);
    const [tempNote, setTempNote] = useState(note ?? "");
    const [tempCityId, setTempCityId] = useState<string | undefined>(undefined);
    const [tempType, setTempType] = useState<TerritoryType | undefined>(type);
    const [isEditing, setIsEditing] = useState(false);

    // Charger les villes au montage du composant
    useEffect(() => {
        dispatch(fetchCities());
    }, [dispatch]);

    // Sauvegarde des modifications
    const handleSave = () => {
        const dto: UpdateTerritoryDto = {
            name: tempName,
            note: tempNote,
            cityId: tempCityId,
            type: tempType
        };
        dispatch(updateTerritory({ 
            id: territoryId, 
            dto
        }));
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
                {
                    user?.role === "ADMIN" || user?.role === "SUPERVISEUR" ? (
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
                    ) : <></>
                }

            </div>

            {/* Ville modifiable */}
            <div className="text-gray-700 flex items-center mb-2">
                <MapPinIcon className="mr-2 text-red-500 flex-shrink-0" />
                <span className="font-semibold mr-2 flex-shrink-0">Ville :</span>
                <div className="flex-grow min-w-0">
                    {isEditing ? (
                        <Select onValueChange={setTempCityId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={city} />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map((cityItem) => (
                                    <SelectItem key={cityItem.id} value={cityItem.id}>
                                        {cityItem.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

            {/* Type */}
            <div className="text-gray-700 flex items-center mb-2">
                <span className="font-semibold">🏠 Type :</span>
                {isEditing ? (
                    <Select value={tempType} onValueChange={(value) => setTempType(value as TerritoryType)}>
                        <SelectTrigger className="w-40 ml-2">
                            <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="BUILDING">Immeuble</SelectItem>
                            <SelectItem value="HOUSE">Pavillon</SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <span className="ml-2">
                        {type ? TYPE_TRANSLATIONS[type] : "-"}
                    </span>
                )}
            </div>

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
                <TerritoryDataActionButtons territoryId={territoryId} showDetails={false} status={status} territoryMapId={territoryMapId} />
            </div>
        </div>
    );
};

export default TerritoryHeader;
