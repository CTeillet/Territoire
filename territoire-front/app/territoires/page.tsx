"use client";

import {useEffect, useState} from "react";
import "leaflet/dist/leaflet.css";
import {useDispatch, useSelector} from "react-redux";
import {AppDispatch, RootState} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import TerritoryMap from "@/components/territory/territory-map";
import {DataTable} from "@/components/territory/territory-data-table";
import {territoryDataColumns} from "@/components/territory/territory-data-columns";
import {useAuth} from "@/hooks/use-auth";
import {useRouter} from "next/navigation";
import CreateTerritoryModal from "@/components/territory/create-territory-modal";

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

    // Chargement initial des territoires
    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchTerritories());
        }
    }, [dispatch, isAuthenticated]);


    // Empêche l'affichage tant que le client n'est pas chargé (évite hydration error)
    if (!isClient) return null;

    return (
        <div className="flex flex-col gap-4 p-6">
            <h1 className="text-xl font-bold">Territoires</h1>

            {loading ? (
                <p>Chargement des territoires...</p>
            ) : (
                <>
                    {territoriesGeojson && <TerritoryMap geoJsonData={territoriesGeojson}/>}
                    {territoriesGeojson && <DataTable columns={territoryDataColumns}
                                                      data={territoriesGeojson.features.map(f => f.properties)}/>}

                    {(user?.role === "ADMIN" || user?.role === "SUPERVISEUR") && (
                        <CreateTerritoryModal/>
                    )}
                </>
            )}
        </div>
    );
};

export default TerritoryPage;
