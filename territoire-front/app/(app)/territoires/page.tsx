"use client";

import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchTerritories } from "@/store/slices/territory-slice";
import TerritoryMap from "@/components/territory/territory-map";
import { DataTable } from "@/components/territory/territory-data-table";
import { territoryDataColumns } from "@/components/territory/territory-data-columns";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import CreateTerritoryModal from "@/components/territory/create-territory-modal";
import { TerritorySearchInput } from "@/components/territory/territory-search-input";
import { TerritoryCollection } from "@/models/territory";

// Recherche gardée le temps de la session : revenir d'un territoire la retrouve, comme la page du tableau
const SEARCH_STORAGE_KEY = "tableSearch-territories";

function readStoredSearch(): string {
  try {
    return sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeSearch(value: string) {
  try {
    if (value) sessionStorage.setItem(SEARCH_STORAGE_KEY, value);
    else sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée...) : la recherche n'est simplement pas gardée
  }
}

const TerritoryPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Empêche le SSR pour éviter l'erreur d'hydration
  const [isClient, setIsClient] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const [search, setSearch] = useState(() =>
    typeof window === "undefined" ? "" : readStoredSearch()
  );
  // Territoires retenus par la recherche et les filtres du tableau (null : tous), seuls affichés sur la carte
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);

  useEffect(() => {
    setIsClient(true); // On attend le chargement côté client
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    storeSearch(value);
  };

  useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.push("/login");
    }
  }, [isClient, isAuthenticated, router]);

  // Toujours exécuter les hooks Redux avant tout conditionnement
  const { territoriesGeojson, loading } = useSelector(
    (state: RootState) => state.territories
  );

  // Chargement initial des territoires
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchTerritories());
    }
  }, [dispatch, isAuthenticated]);

  const mapData = useMemo<TerritoryCollection | null>(() => {
    if (!territoriesGeojson || visibleIds === null) return territoriesGeojson;
    const visible = new Set(visibleIds);
    return {
      ...territoriesGeojson,
      features: territoriesGeojson.features.filter((f) =>
        visible.has(f.properties.id)
      ),
    };
  }, [territoriesGeojson, visibleIds]);

  const tableData = useMemo(
    () => territoriesGeojson?.features.map((f) => f.properties) ?? [],
    [territoriesGeojson]
  );

  // Empêche l'affichage tant que le client n'est pas chargé (évite hydration error)
  if (!isClient) return null;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-bold">Territoires</h1>

      {loading ? (
        <p>Chargement des territoires...</p>
      ) : (
        <>
          {territoriesGeojson && (
            <TerritorySearchInput
              value={search}
              onChange={handleSearchChange}
            />
          )}
          {mapData && (
            <TerritoryMap
              geoJsonData={mapData}
              fitToData={visibleIds !== null}
            />
          )}
          {(user?.role === "ADMIN" || user?.role === "SUPERVISEUR") && (
            <CreateTerritoryModal />
          )}
          {territoriesGeojson && (
            <DataTable
              columns={territoryDataColumns}
              data={tableData}
              tableId="territories"
              searchQuery={search}
              onFilteredIdsChange={setVisibleIds}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TerritoryPage;
