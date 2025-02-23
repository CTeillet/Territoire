"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchTerritories, addTerritory } from "@/store/slices/territory-slice";
import TerritoryMap from "@/components/territory/territory-map";
import { DataTable } from "@/components/territory/territory-data-table";
import { territoryDataColumns } from "@/components/territory/territory-data-columns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

const TerritoryPage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    // Empêche le SSR pour éviter l'erreur d'hydration
    const [isClient, setIsClient] = useState(false);


    useEffect(() => {
        setIsClient(true); // On attend le chargement côté client
    }, []);

    useEffect(() => {
        if (isClient && !isAuthenticated) {
            router.push("/login");
        }
    }, [isClient, isAuthenticated, router]);

    // Toujours exécuter les hooks Redux avant tout conditionnement
    const { territoriesGeojson, loading } = useSelector((state: RootState) => state.territories);

    // État local pour la gestion du dialogue de création
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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
            await dispatch(addTerritory({ name: territoryName })).unwrap();
            setIsDialogOpen(false);
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
                    {/* Affichage de la carte avec les territoires en GeoJSON */}
                    {territoriesGeojson && <TerritoryMap geoJsonData={territoriesGeojson}/>}

                    {/* Tableau des territoires */}
                    {territoriesGeojson && <DataTable columns={territoryDataColumns} data={territoriesGeojson.features.map(f => f.properties)} />}

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
                        >
                            <Plus />
                        </button>
                    </div>
                </>
            )}

            {/* Boîte de dialogue pour la création d'un territoire */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer un nouveau territoire</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <label className="block text-sm font-medium">Nom du territoire</label>
                        <Input
                            type="text"
                            value={territoryName}
                            onChange={(e) => setTerritoryName(e.target.value)}
                            placeholder="Ex: Territory 6"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleCreateTerritory} className="bg-green-500 hover:bg-green-600 text-white" disabled={isCreating}>
                            {isCreating ? "Création..." : "Créer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TerritoryPage;
