"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchTerritoryById } from "@/store/slices/territory-slice";
import TerritoryHeader from "@/components/territory/id/territory-header";
import AssignmentsList from "@/components/territory/id/assignments-list";
import AddressNotToDoList from "@/components/territory/id/address-not-to-do-list";
import dynamic from "next/dynamic";
import { BackLink, PageContainer } from "@/components/shared/page-layout";
import { useAuth } from "@/hooks/use-auth";
import TerritoryMapViewer from "@/components/territory/id/territory-map-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const { selectedTerritory } = useSelector(
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

  // Affichage du chargement si le territoire est en train de se récupérer (fetchTerritoryById le vide). Pas
  // l'indicateur `loading` : partagé avec le chargement de tous les territoires par la carte, il masquerait la fiche
  if (!selectedTerritory) {
    return <p>Chargement du territoire...</p>;
  }

  return (
    <PageContainer>
      {/* Une seule colonne pour tous les blocs de la fiche, carte comprise */}
      <div className="mx-auto max-w-5xl space-y-6">
        <BackLink href="/territoires" label="Retour aux territoires" />

        {/* Header du territoire */}
        <TerritoryHeader
          name={selectedTerritory.name}
          city={selectedTerritory.city.name}
          status={selectedTerritory.status}
          type={selectedTerritory.type}
          lastModifiedDate={selectedTerritory.lastModifiedDate}
          note={selectedTerritory.note}
          territoryId={selectedTerritory.id}
          territoryMapId={selectedTerritory.territoryMapId}
          lost={selectedTerritory.lost}
        />

        {/* Carte du territoire (GeoJSON) */}
        <TerritoryIdMap
          territory={selectedTerritory}
          city={selectedTerritory.city}
        />

        {/* Carte du territoire (Image) */}
        {selectedTerritory.territoryMapId ? (
          <TerritoryMapViewer
            territoryMapId={selectedTerritory.territoryMapId}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Carte du territoire</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="p-8 text-center text-gray-500 border border-gray-200 rounded-md w-full">
                <p>Aucune carte n&apos;a été téléchargée pour ce territoire.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des adresses à ne pas visiter */}
        <AddressNotToDoList />

        {/* Liste des attributions */}
        <AssignmentsList assignments={selectedTerritory.assignments || []} />
      </div>
    </PageContainer>
  );
};

export default TerritoryPage;
