"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {GeoJSON, LayerGroup, LayersControl, MapContainer, TileLayer} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {LatLng, LatLngBoundsExpression, Layer, LeafletEvent, Map} from "leaflet";
import {Territory} from "@/models/territory";
import {Feature, FeatureCollection, GeoJsonProperties, Polygon} from "geojson";
import {GeomanControl} from "@/components/territory/id/geoman-controls";

interface GeomanCreateEvent extends LeafletEvent {
    layer: Layer & { getLatLngs: () => LatLng[][] }; // Le layer est un polygone avec `getLatLngs()`
}

const TerritoryMap = ({territory}: { territory: Territory }) => {
    const mapRef = useRef<Map | null>(null);
    const [blockFeatures, setBlockFeatures] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: territory.geojson?.features.filter((feature) => feature.properties.type === "BLOCK"),
    });
    const [geoJsonKey, setGeoJsonKey] = useState(0);

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

    const handleMapCreated = (map: Map) => {
        mapRef.current = map;
        console.log("Map initialized", map);
        map.on("pm:create", handleCreate);
    };

    const handleDeleteBlock = (blockId: string) => {
        setBlockFeatures((prev) => ({
            ...prev,
            features: prev.features.filter((feature) => feature.properties?.id !== blockId),
        }));
        setGeoJsonKey((prevKey) => prevKey + 1); // Force le re-render
    };

    const handleCreate = (e: GeomanCreateEvent) => {
        const {layer} = e;

        console.log("Yo", e);
        if (!layer.getLatLngs) return;

        const newPolygon: Feature<Polygon, GeoJsonProperties> = {
            type: "Feature",
            properties: {
                id: new Date().getTime().toString(),
            },
            geometry: {
                type: "Polygon",
                coordinates: [layer.getLatLngs()[0].map((latlng: LatLng) => [latlng.lng, latlng.lat])],
            },
        };

        setBlockFeatures((prev) => ({
            ...prev,
            features: [...prev.features, newPolygon],
        }));

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
        <MapContainer
            // @ts-expect-error ce code marche parfaitement alors que le type est incorrect
            whenReady={(event: LeafletEvent) => handleMapCreated(event.target as Map)}
            ref={mapRef} bounds={bounds} style={{height: "500px", width: "100%", zIndex: 0}}
            className="mt-6 border border-gray-300 rounded-lg overflow-hidden shadow-sm"
        >
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                attribution="&copy; OpenStreetMap contributors"
            />

            <LayersControl position="topright">
                <LayersControl.Overlay name="Pâtés" checked>
                    <LayerGroup key={geoJsonKey}>
                        <GeoJSON data={blockFeatures} style={{color: "blue"}} onEachFeature={onEachBlock}/>
                    </LayerGroup>
                </LayersControl.Overlay>

                <LayersControl.Overlay name="Territoire" checked>
                    <LayerGroup>
                        <GeoJSON data={concaveHullFeature} style={{color: "red", weight: 2, fillOpacity: 0.1}}/>
                    </LayerGroup>
                </LayersControl.Overlay>
            </LayersControl>

            <GeomanControl position="topleft" oneBlock/>
        </MapContainer>
    );
};

export default TerritoryMap;
