"use client";

import {useEffect, useMemo, useRef} from "react";
import {TileLayer, GeoJSON, LayersControl, LayerGroup, MapContainer} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngBoundsExpression, Map } from "leaflet";
import {Territory} from "@/models/territory";
import {FeatureCollection, Polygon} from "geojson";

const TerritoryMap = ({ territory }: { territory: Territory }) => {
    const mapRef = useRef<Map | null>(null);

    // Filtrer les features
    const blockFeatures: FeatureCollection  = {
        type: "FeatureCollection",
        features: territory.geojson.features.filter((feature) => feature.properties.type === "BLOCK"),
    };

    const concaveHullFeature: FeatureCollection<Polygon> = {
        type: "FeatureCollection",
        features: territory.geojson.features.filter((feature) => feature.properties.type === "CONCAVE_HULL"),
    };

    // Récupérer les coordonnées du concave hull
    const concaveHullCoords = concaveHullFeature.features.flatMap((feature) =>
        feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]) // Leaflet attend [lat, lon]
    );

    // Calculer la boîte englobante (bounding box)
    const bounds: LatLngBoundsExpression =  useMemo(() => {
        if (concaveHullCoords.length > 0) {
            return [
                [Math.min(...concaveHullCoords.map(coord => coord[0])), Math.min(...concaveHullCoords.map(coord => coord[1]))],
                [Math.max(...concaveHullCoords.map(coord => coord[0])), Math.max(...concaveHullCoords.map(coord => coord[1]))]
            ];
        }
        return [[0, 0], [0, 0]];
    }, [concaveHullCoords]);

    // Centrer et ajuster la carte sur le concave hull après le rendu
    useEffect(() => {
        if (mapRef.current && concaveHullCoords.length > 0) {
            mapRef.current.fitBounds(bounds);
        }
    }, [territory.geojson, bounds, concaveHullCoords.length]);

    return (
        <MapContainer ref={mapRef} bounds={bounds} style={{ height: "500px", width: "100%", zIndex: 0 }} className={"mt-6 border border-gray-300 rounded-lg overflow-hidden shadow-sm"}>
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; OpenStreetMap contributors'
            />

            <LayersControl position="topright">
                {/* Layer des Blocks */}
                <LayersControl.Overlay name="Pâtés" checked>
                    <LayerGroup>
                        <GeoJSON data={blockFeatures} style={{ color: "blue" }} />
                    </LayerGroup>
                </LayersControl.Overlay>

                {/* Layer du Concave Hull */}
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
