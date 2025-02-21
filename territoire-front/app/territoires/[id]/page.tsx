"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchTerritoryById } from "@/store/slices/territory-slice";
import TerritoryHeader from "@/components/territory/id/territory-header";
import AssignmentsList from "@/components/territory/id/assignments-list";
import AddressNotToDoList from "@/components/territory/id/address-not-to-do-list";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Chargement dynamique de la carte (évite les erreurs SSR)
const TerritoryIdMap = dynamic(
    () => import("@/components/territory/id/territory-id-map"),
    { ssr: false }
);

const TerritoryPage = () => {
    const { id } = useParams();
    const dispatch = useDispatch<AppDispatch>();
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    // Toujours exécuter les hooks avant toute condition
    const { selectedTerritory, loading } = useSelector(
        (state: RootState) => state.territories
    );

    // Redirection si non authentifié
    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    // Chargement du territoire
    useEffect(() => {
        if (id) {
            dispatch(fetchTerritoryById(id as string));
        }
    }, [dispatch, id]);

    // Affichage temporaire pour éviter un écran blanc avant redirection
    if (!isAuthenticated) {
        return <p>Redirection en cours...</p>;
    }

    // Affichage du chargement si le territoire est en train de se récupérer
    if (loading || !selectedTerritory) {
        return <p>Chargement du territoire...</p>;
    }

    return (
        <div className="p-6">
            {/* Bouton pour revenir à la liste des territoires */}
            <Link href="/territoires">
                <Button variant="outline" className="flex items-center gap-2 mb-5">
                    <ChevronLeft className="w-5 h-5" />
                    Retour
                </Button>
            </Link>

            {/* Header du territoire */}
            <TerritoryHeader
                name={selectedTerritory.name}
                city={selectedTerritory.city}
                status={selectedTerritory.status}
                lastModifiedDate={selectedTerritory.lastModifiedDate}
                note={selectedTerritory.note}
                territoryId={selectedTerritory.id}
            />

            {/* Carte du territoire */}
            <TerritoryIdMap territory={selectedTerritory} />

            {/* Liste des adresses à ne pas visiter */}
            {selectedTerritory.addressNotToDo &&
                selectedTerritory.addressNotToDo.length > 0 && (
                    <AddressNotToDoList addresses={selectedTerritory.addressNotToDo} />
                )}

            {/* Liste des attributions */}
            <AssignmentsList assignments={selectedTerritory.assignments || []} />
        </div>
    );
};

export default TerritoryPage;
