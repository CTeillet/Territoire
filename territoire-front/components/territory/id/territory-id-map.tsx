"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {GeoJSON, LayerGroup, LayersControl, MapContainer, TileLayer} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {LatLng, LatLngBoundsExpression, Layer, LeafletEvent, Map} from "leaflet";
import {PolygonProperties, Territory} from "@/models/territory";
import {Feature, FeatureCollection, Polygon} from "geojson";
import {GeomanControl} from "@/components/territory/id/geoman-controls";
import {useDispatch} from "react-redux";
import {fetchTerritoryById} from "@/store/slices/territory-slice";

interface GeomanCreateEvent extends LeafletEvent {
    layer: Layer & { getLatLngs: () => LatLng[][] }; // Le layer est un polygone avec `getLatLngs()`
}

const defaultCenter: LatLngBoundsExpression = [[48.695874, 2.367055], [48.695874, 2.367055]];


const TerritoryMap = ({territory}: { territory: Territory }) => {
    const mapRef = useRef<Map | null>(null);
    const dispatch = useDispatch();
    const [geoJsonData, setGeoJsonData] = useState<FeatureCollection<Polygon, PolygonProperties> | null>(null);

    const [blockFeatures, setBlockFeatures] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: geoJsonData?.features?.filter((feature) => feature.properties.type === "BLOCK") || [],
    });

    const [geoJsonKey, setGeoJsonKey] = useState(0);

    const concaveHullFeature = useMemo(() => ({
        type: "FeatureCollection",
        features: geoJsonData?.features?.filter((feature) => feature.properties.type === "CONCAVE_HULL") || [],
    }), [geoJsonData?.features]);

    const concaveHullCoords = useMemo(() => {
        if (concaveHullFeature.features.length > 0) {
            return concaveHullFeature.features.flatMap((feature) =>
                feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng])
            );
        }
        return [];
    }, [concaveHullFeature]);

    const bounds: LatLngBoundsExpression = useMemo(() => {
        if (concaveHullCoords.length > 0) {
            return [
                [Math.min(...concaveHullCoords.map(coord => coord[0])), Math.min(...concaveHullCoords.map(coord => coord[1]))],
                [Math.max(...concaveHullCoords.map(coord => coord[0])), Math.max(...concaveHullCoords.map(coord => coord[1]))]
            ];
        }
        return defaultCenter; // Utilisation des coordonnées par défaut
    }, [concaveHullCoords]);

    useEffect(() => {
        if (territory?.geojson) {
            try {
                const parsedGeoJson = JSON.parse(territory.geojson) as FeatureCollection<Polygon, PolygonProperties>;
                setGeoJsonData(parsedGeoJson);
                console.log("✅ Conversion réussie de geojson :", parsedGeoJson);
            } catch (error) {
                console.error("❌ Erreur lors de la conversion de `geojson` :", error);
            }
        }
    }, [territory.geojson]);

    useEffect(() => {
        if (mapRef.current && concaveHullCoords.length > 0) {
            mapRef.current.fitBounds(bounds);
        }
    }, [territory.geojson, bounds, concaveHullCoords.length]);

    useEffect(() => {
        const testJson: FeatureCollection = JSON.parse(territory.geojson as string) as FeatureCollection<Polygon, PolygonProperties>;

        if (testJson) {
            setBlockFeatures({
                type: "FeatureCollection",
                features: testJson.features.filter((feature) => feature.properties?.type === "BLOCK"),
            });
        }
    }, [territory.geojson]);

    const handleMapCreated = (map: Map) => {
        mapRef.current = map;
        map.on("pm:create", handleCreate);
    };

    const handleDeleteBlock = async (blockId: string) => {
        try {
            const response = await fetch(`/api/territories/${territory.id}/blocks/${blockId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Erreur lors de la suppression du block");
            }

            console.log(`✅ Block supprimé: ${blockId}`);

            // Rafraîchir le territoire dans Redux pour récupérer la mise à jour
            dispatch(fetchTerritoryById(territory.id));
            setGeoJsonKey((prevKey) => prevKey + 1); // Force le re-render
        } catch (error) {
            console.error("❌ Erreur lors de la suppression du bloc :", error);
        }
    };


    const handleCreate = async (e: GeomanCreateEvent) => {
        const { layer } = e;
        if (!layer.getLatLngs) return;

        // Création de l'objet GeoJSON
        const newPolygon = {
            coordinates: [layer.getLatLngs()[0].map((latlng: LatLng) => [latlng.lng, latlng.lat])],
        };

        try {
            // Envoi au backend
            const response = await fetch(`/api/territories/${territory.id}/blocks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPolygon),
            });

            if (!response.ok) {
                console.log("response",response)
                throw new Error("Erreur lors de l'ajout du block");
            }

            // Rafraîchir le territoire dans Redux
            dispatch(fetchTerritoryById(territory.id));
            setGeoJsonKey((prevKey) => prevKey + 1); // Force le re-render

        } catch (error) {
            console.error("Erreur lors de l'ajout du bloc:", error);
        }

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
                <LayersControl.Overlay name="Territoire" checked>
                    <LayerGroup>
                        <GeoJSON data={concaveHullFeature} style={{color: "red", weight: 2, fillOpacity: 0.1}}/>
                    </LayerGroup>
                </LayersControl.Overlay>

                <LayersControl.Overlay name="Pâtés" checked>
                    <LayerGroup key={geoJsonKey}>
                        <GeoJSON data={blockFeatures} style={{color: "blue"}} onEachFeature={onEachBlock}/>
                    </LayerGroup>
                </LayersControl.Overlay>

            </LayersControl>

            <GeomanControl position="topleft" oneBlock/>
        </MapContainer>
    );
};

export default TerritoryMap;
