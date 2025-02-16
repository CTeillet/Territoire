"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TileLayer, GeoJSON, LayersControl, LayerGroup, MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngBoundsExpression, Map } from "leaflet";
import { Territory } from "@/models/territory";
import { FeatureCollection, Polygon, Feature } from "geojson";

const TerritoryMap = ({ territory }: { territory: Territory }) => {
    const mapRef = useRef<Map | null>(null);
    const [blockFeatures, setBlockFeatures] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: territory.geojson.features.filter((feature) => feature.properties.type === "BLOCK"),
    });
    const [geoJsonKey, setGeoJsonKey] = useState(0); // Force le re-render en changeant la clé

    const concaveHullFeature: FeatureCollection<Polygon> = {
        type: "FeatureCollection",
        features: territory.geojson.features.filter((feature) => feature.properties.type === "CONCAVE_HULL"),
    };

    const concaveHullCoords = concaveHullFeature.features.flatMap((feature) =>
        feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
    );

    const bounds: LatLngBoundsExpression = useMemo(() => {
        if (concaveHullCoords.length > 0) {
            return [
                [Math.min(...concaveHullCoords.map(coord => coord[0])), Math.min(...concaveHullCoords.map(coord => coord[1]))],
                [Math.max(...concaveHullCoords.map(coord => coord[0])), Math.max(...concaveHullCoords.map(coord => coord[1]))]
            ];
        }
        return [[0, 0], [0, 0]];
    }, [concaveHullCoords]);

    useEffect(() => {
        if (mapRef.current && concaveHullCoords.length > 0) {
            mapRef.current.fitBounds(bounds);
        }
    }, [territory.geojson, bounds, concaveHullCoords.length]);

    const handleDeleteBlock = (blockId: string) => {
        setBlockFeatures((prev) => ({
            ...prev,
            features: prev.features.filter((feature) => feature.properties?.id !== blockId),
        }));
        setGeoJsonKey((prevKey) => prevKey + 1); // Force le re-render
    };

    const onEachBlock = (feature: Feature, layer: L.Layer) => {
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
            const deleteButton = document.getElementById(`delete-block-${feature.properties?.id}`);
            if (deleteButton) {
                deleteButton.addEventListener("click", () => {
                    handleDeleteBlock(feature.properties?.id);
                    layer.remove(); // Supprime immédiatement l'élément de la carte
                });
            }
        });
    };

    return (
        <MapContainer ref={mapRef} bounds={bounds} style={{ height: "500px", width: "100%", zIndex: 0 }} className="mt-6 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; OpenStreetMap contributors"
            />

            <LayersControl position="topright">
                <LayersControl.Overlay name="Pâtés" checked>
                    <LayerGroup key={geoJsonKey}>
                        <GeoJSON data={blockFeatures} style={{ color: "blue" }} onEachFeature={onEachBlock} />
                    </LayerGroup>
                </LayersControl.Overlay>

                <LayersControl.Overlay name="Territoire" checked>
                    <LayerGroup>
                        <GeoJSON data={concaveHullFeature} style={{ color: "red", weight: 2, fillOpacity: 0.1 }} />
                    </LayerGroup>
                </LayersControl.Overlay>
            </LayersControl>
        </MapContainer>
    );
};

export default TerritoryMap;
