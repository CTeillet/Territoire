"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";
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
import {
  AddressSearch,
  AddressSelection,
} from "@/components/territory/address-search";
import { TerritoryCollection } from "@/models/territory";
import { geoJsonCenter } from "@/lib/geo";
import { cn } from "@/lib/utils";
import {
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";

type SearchMode = "territoire" | "adresse";

const SEARCH_MODES: { mode: SearchMode; label: string }[] = [
  { mode: "territoire", label: "Nom, ville, personne" },
  { mode: "adresse", label: "Adresse" },
];

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
  const isClient = useIsClient();
  const user = useSelector((state: RootState) => state.auth.user);
  const [search, setSearch] = useState(() =>
    typeof window === "undefined" ? "" : readStoredSearch()
  );
  // Territoires retenus par la recherche et les filtres du tableau (null : tous), seuls affichés sur la carte
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("territoire");
  const [address, setAddress] = useState<AddressSelection | null>(null);

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

  // Les adresses proches des territoires sont proposées d'abord
  const territoriesCenter = useMemo(() => {
    if (!territoriesGeojson) return null;
    const [lat, lng] = geoJsonCenter(territoriesGeojson, [NaN, NaN]);
    return Number.isNaN(lat) ? null : { lat, lng };
  }, [territoriesGeojson]);

  const changeSearchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    // Une seule recherche à la fois : l'adresse choisie ne reste pas en revenant à la recherche par nom
    if (mode === "territoire") setAddress(null);
  };

  // Empêche l'affichage tant que le client n'est pas chargé (évite hydration error)
  if (!isClient) return null;

  return (
    <PageContainer>
      <PageHeader
        title="Territoires"
        actions={
          (user?.role === "ADMIN" || user?.role === "SUPERVISEUR") && (
            <CreateTerritoryModal />
          )
        }
      />

      {loading ? (
        <LoadingState message="Chargement des territoires..." />
      ) : (
        <>
          {territoriesGeojson && (
            <div className="space-y-2">
              <div
                role="group"
                aria-label="Rechercher par"
                className="inline-flex rounded-md border bg-white p-0.5"
              >
                {SEARCH_MODES.map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={searchMode === mode}
                    onClick={() => changeSearchMode(mode)}
                    className={cn(
                      "min-h-9 rounded px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      searchMode === mode
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {searchMode === "territoire" ? (
                <TerritorySearchInput
                  value={search}
                  onChange={handleSearchChange}
                />
              ) : (
                <AddressSearch
                  features={territoriesGeojson.features}
                  near={territoriesCenter}
                  selection={address}
                  onSelect={setAddress}
                />
              )}
            </div>
          )}
          {mapData && (
            <TerritoryMap
              geoJsonData={mapData}
              fitToData={visibleIds !== null}
              focusPoint={address}
            />
          )}
          {territoriesGeojson && (
            <DataTable
              columns={territoryDataColumns}
              data={tableData}
              tableId="territories"
              // En recherche d'adresse : les territoires de l'adresse, le plus pertinent d'abord
              searchQuery={searchMode === "territoire" ? search : ""}
              restrictToIds={address?.territoryIds ?? null}
              onFilteredIdsChange={setVisibleIds}
            />
          )}
        </>
      )}
    </PageContainer>
  );
};

export default TerritoryPage;
