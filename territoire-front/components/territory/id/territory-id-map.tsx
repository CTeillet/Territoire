"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  LayerGroup,
  LayersControl,
  MapContainer,
  Pane,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { apiErrorMessage } from "@/utils/api-error";
import {
  LatLng,
  LatLngBoundsExpression,
  Layer,
  LeafletEvent,
  Map,
  PathOptions,
} from "leaflet";
import {
  PolygonProperties,
  Territory,
  TerritoryFeature,
} from "@/models/territory";
import {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";
import { GeomanControl } from "@/components/territory/id/geoman-controls";
import {
  fetchTerritories,
  fetchTerritoryById,
} from "@/store/slices/territory-slice";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { authFetch } from "@/utils/auth-fetch";
import MapUpdater from "@/components/territory/map-updater";
import { MapBackground } from "@/components/map/ign-base-layer";
import { useSidebar } from "@/components/ui/sidebar";
import { City } from "@/models/city";
import { MAP_MAX_ZOOM } from "@/lib/ign-plan";

interface GeomanCreateEvent extends LeafletEvent {
  layer: Layer & { getLatLngs: () => LatLng[][] }; // Le layer est un polygone avec `getLatLngs()`
}

/**
 * Gris neutre, pour que seul le territoire affiché ressorte. Un gris clair à bordure fine ne se voyait pas : les
 * territoires d'une ville se touchent, le voile couvrait toute la carte et les bordures se confondaient avec les rues.
 * D'où une bordure foncée en pointillés, que les rues n'ont pas.
 */
const otherTerritoryStyle: PathOptions = {
  color: "#4b5563",
  weight: 2,
  dashArray: "6 4",
  fillColor: "#6b7280",
  fillOpacity: 0.3,
};

/** Nom d'un autre territoire au survol (textContent : le nom est une saisie utilisateur, jamais interprétée en HTML). */
const onEachOtherTerritory = (feature: TerritoryFeature, layer: Layer) => {
  const label = document.createElement("span");
  label.textContent = feature.properties.name;
  layer.bindTooltip(label, { sticky: true });
};

const TerritoryMap = ({
  territory,
  city,
}: {
  territory: Territory;
  city: City;
}) => {
  const mapRef = useRef<Map | null>(null);
  const dispatch = useAppDispatch();
  const sidebar = useSidebar();

  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection<
    Polygon | MultiPolygon,
    PolygonProperties
  > | null>(null);

  const cityCenter: LatLngBoundsExpression = useMemo(() => {
    return [
      [city.center.latitude, city.center.longitude],
      [city.center.latitude, city.center.longitude],
    ];
  }, [city]);

  /** Emprise [[latMin, lngMin], [latMax, lngMax]] de points GeoJSON ([lng, lat]). */
  const toLatLngBounds = (points: Position[]): LatLngBoundsExpression => {
    let minLat = Infinity,
      minLng = Infinity;
    let maxLat = -Infinity,
      maxLng = -Infinity;

    for (const [lng, lat] of points) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  };

  const [blockFeatures, setBlockFeatures] = useState<FeatureCollection>({
    type: "FeatureCollection",
    features:
      geoJsonData?.features?.filter(
        (feature) => feature.properties.type === "BLOCK"
      ) || [],
  });

  const [geoJsonKey, setGeoJsonKey] = useState(0);

  // Tous les territoires, pour situer celui-ci parmi les autres : ceux de la liste s'ils sont déjà chargés
  const allTerritories = useAppSelector(
    (state) => state.territories.territoriesGeojson
  );

  useEffect(() => {
    if (!allTerritories) {
      dispatch(fetchTerritories());
    }
  }, [dispatch, allTerritories]);

  const otherTerritories = useMemo(
    () =>
      allTerritories && {
        ...allTerritories,
        features: allTerritories.features.filter(
          (feature) => feature.properties.id !== territory.id
        ),
      },
    [allTerritories, territory.id]
  );

  const concaveHullFeature = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features:
          geoJsonData?.features?.filter(
            (feature) => feature.properties.type === "CONCAVE_HULL"
          ) || [],
      }) as FeatureCollection<MultiPolygon, PolygonProperties>, // 🔹 Ajout du cast explicite
    [geoJsonData?.features]
  );

  // Tous les points de l'anneau extérieur de chaque polygone du contour (MultiPolygon)
  const concaveHullCoords = useMemo(
    () =>
      concaveHullFeature.features.flatMap((feature) =>
        feature.geometry.coordinates.flatMap((polygon) => polygon[0] ?? [])
      ),
    [concaveHullFeature]
  );

  const bounds: LatLngBoundsExpression = useMemo(() => {
    if (concaveHullCoords.length > 0) {
      return toLatLngBounds(concaveHullCoords);
    }
    return cityCenter; // Utilisation des coordonnées par défaut
  }, [cityCenter, concaveHullCoords]);

  useEffect(() => {
    if (territory?.geojson) {
      try {
        const parsedGeoJson = JSON.parse(
          territory.geojson
        ) as FeatureCollection<Polygon, PolygonProperties>;
        setGeoJsonData(parsedGeoJson);
      } catch (error) {
        console.error("❌ Erreur lors de la conversion de `geojson` :", error);
      }
    }
  }, [territory.geojson]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds);
    }
  }, [territory.geojson, bounds, concaveHullCoords.length]);

  useEffect(() => {
    const testJson: FeatureCollection = JSON.parse(
      territory.geojson as string
    ) as FeatureCollection<Polygon, PolygonProperties>;

    if (testJson) {
      setBlockFeatures({
        type: "FeatureCollection",
        features: testJson.features.filter(
          (feature) => feature.properties?.type === "BLOCK"
        ),
      });
    }
  }, [territory.geojson]);

  const handleMapCreated = (map: Map) => {
    mapRef.current = map;
    map.on("pm:create", handleCreate);
  };

  const handleDeleteBlock = async (blockId: string) => {
    const response = await authFetch(
      `/api/territoires/${territory.id}/pate/${blockId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const message = await apiErrorMessage(
        response,
        "Impossible de supprimer le pâté"
      );
      console.error("❌ Erreur lors de la suppression du bloc :", message);
      toast.error(message);
      return;
    }

    // Rafraîchir le territoire dans Redux pour récupérer la mise à jour
    dispatch(fetchTerritoryById(territory.id));
    setGeoJsonKey((prevKey) => prevKey + 1); // Force le re-render
  };

  const handleCreate = async (e: GeomanCreateEvent) => {
    const { layer } = e;
    if (!layer.getLatLngs) return;

    // Création de l'objet GeoJSON
    const newPolygon = {
      coordinates: [
        layer.getLatLngs()[0].map((latlng: LatLng) => [latlng.lng, latlng.lat]),
      ],
    };

    const response = await authFetch(`/api/territoires/${territory.id}/pate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPolygon),
    });

    if (!response.ok) {
      const message = await apiErrorMessage(
        response,
        "Impossible d'ajouter le pâté"
      );
      console.error("❌ Erreur lors de l'ajout du bloc :", message);
      toast.error(message);
      return;
    }

    // Rafraîchir le territoire dans Redux
    dispatch(fetchTerritoryById(territory.id));
    setGeoJsonKey((prevKey) => prevKey + 1); // Force le re-render

    // Supprimer immédiatement le polygone du layer d'édition
    layer.remove();
  };

  const onEachBlock = (feature: Feature, layer: Layer) => {
    if (!feature.properties) return;

    layer.bindPopup(
      `<div>
                <p>Supprimer ce pâté ?</p>
                <button id="delete-block-${feature.properties.id}" style="color: white; background-color: red; border: none; padding: 5px; cursor: pointer;">
                    Supprimer
                </button>
            </div>`
    );

    layer.on("popupopen", () => {
      const deleteButton = document.getElementById(
        `delete-block-${feature.properties?.id}`
      );
      if (deleteButton) {
        deleteButton.addEventListener("click", () => {
          handleDeleteBlock(feature.properties?.id);
          layer.remove(); // Supprime immédiatement l'élément de la carte
        });
      }
    });
  };

  return (
    <MapContainer
      // @ts-expect-error ce code marche parfaitement alors que le type est incorrect
      whenReady={(event: LeafletEvent) => handleMapCreated(event.target as Map)}
      ref={mapRef}
      bounds={bounds}
      maxZoom={MAP_MAX_ZOOM}
      style={{ zIndex: 0 }}
      className="h-[60svh] w-full overflow-hidden rounded-xl border shadow-sm md:h-[800px]"
    >
      <MapUpdater isSidebarOpen={sidebar.state === "expanded"} />{" "}
      {/* Ajout pour gérer la sidebar */}
      <MapBackground view="TERRITORY" />
      <LayersControl position="topright">
        {/* Couches spécifiques à l'application */}
        <LayersControl.Overlay name="Territoire" checked>
          <LayerGroup>
            <GeoJSON
              data={concaveHullFeature}
              style={{ color: "red", weight: 2, fillOpacity: 0.1 }}
            />
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Pâtés" checked>
          <LayerGroup key={geoJsonKey}>
            <GeoJSON
              data={blockFeatures}
              style={{ color: "blue" }}
              onEachFeature={onEachBlock}
            />
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Autres territoires" checked>
          {/* Volet sous celui des couches (z-index 400) : les autres territoires restent sous le territoire et ses
              pâtés, même réaffichés depuis le contrôle des couches */}
          <Pane name="autres-territoires" style={{ zIndex: 350 }}>
            <LayerGroup>
              {otherTerritories && (
                <GeoJSON
                  data={otherTerritories}
                  style={otherTerritoryStyle}
                  onEachFeature={onEachOtherTerritory}
                />
              )}
            </LayerGroup>
          </Pane>
        </LayersControl.Overlay>
      </LayersControl>
      <GeomanControl position="topleft" oneBlock />
    </MapContainer>
  );
};

export default TerritoryMap;
