"use client";

import {useEffect, useState} from "react";
import "leaflet/dist/leaflet.css";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@/store/store";
import {addTerritory, fetchTerritories} from "@/store/slices/territory-slice";
import TerritoryMap from "@/components/territory/territory-map";
import {DataTable} from "@/components/territory/territory-data-table";
import {territoryDataColumns} from "@/components/territory/territory-data-columns";
import {Input} from "@/components/ui/input";
import {Plus} from "lucide-react";
import {useAuth} from "@/hooks/use-auth";
import {useRouter} from "next/navigation";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const TerritoryPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const {isAuthenticated} = useAuth();
    const router = useRouter();

    // Empêche le SSR pour éviter l'erreur d'hydration
    const [isClient, setIsClient] = useState(false);
    const user = useSelector((state: RootState) => state.auth.user);


    useEffect(() => {
        setIsClient(true); // On attend le chargement côté client
    }, []);

    useEffect(() => {
        if (isClient && !isAuthenticated) {
            router.push("/login");
        }
    }, [isClient, isAuthenticated, router]);

    // Toujours exécuter les hooks Redux avant tout conditionnement
    const {territoriesGeojson, loading} = useSelector((state: RootState) => state.territories);

    // État local pour la gestion du dialogue de création
    const [territoryName, setTerritoryName] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Chargement initial des territoires
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchTerritories());
        }
    }, [dispatch, isAuthenticated]);

    // Ajout d'un territoire
    const handleCreateTerritory = async () => {
        if (!territoryName.trim() || isCreating) return;

        setIsCreating(true);
        try {
            await dispatch(addTerritory({name: territoryName})).unwrap();
            setTerritoryName("");
            dispatch(fetchTerritories()); // Recharge la liste après ajout
        } catch (error) {
            console.error("Erreur lors de la création du territoire :", error);
        } finally {
            setIsCreating(false);
        }
    };

    // Empêche l'affichage tant que le client n'est pas chargé (évite hydration error)
    if (!isClient) return null;

    return (
        <div className="flex flex-col gap-4 p-4">
            <h1 className="text-xl font-bold">Territoires</h1>

            {loading ? (
                <p>Chargement des territoires...</p>
            ) : (
                <>
                    {territoriesGeojson && <TerritoryMap geoJsonData={territoriesGeojson}/>}
                    {territoriesGeojson && <DataTable columns={territoryDataColumns}
                                                      data={territoriesGeojson.features.map(f => f.properties)}/>}

                    {(user?.role === "ADMIN" || user?.role === "SUPERVISEUR") && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div className="flex justify-end mt-4">
                                    <button
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                                    >
                                        <Plus/>
                                    </button>
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Créer un nouveau territoire</AlertDialogTitle>
                                </AlertDialogHeader>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium">Nom du territoire</label>
                                    <Input
                                        type="text"
                                        value={territoryName}
                                        onChange={(e) => setTerritoryName(e.target.value)}
                                        placeholder="Ex: Territory 6"
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={handleCreateTerritory}>
                                        Créer
                                    </AlertDialogAction >
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </>
            )}
        </div>
    );
};

export default TerritoryPage;
