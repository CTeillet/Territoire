"use client"; // Indique que ce fichier doit être exécuté côté client

import dynamic from "next/dynamic";
import React, {useEffect, useMemo, useState} from "react";
import {TerritoryCollection, TerritoryFeature} from "@/models/territory";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {getBadgeColor} from "@/components/territory/territory-data-columns";
import {TerritoryDataActionButtons} from "@/components/shared/territory-data-action-buttons";
import {createRoot} from "react-dom/client";
import {Layer, PathOptions, PopupEvent} from "leaflet";
import {Feature, Geometry} from "geojson";
import {Provider} from "react-redux";
import {store} from "@/store/store";
import MapUpdater from "@/components/territory/map-updater";
import {useSidebar} from "@/components/ui/sidebar";
import {Button} from "@/components/ui/button";
import {Maximize2, Minimize2} from "lucide-react";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {ssr: false});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {ssr: false});
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), {ssr: false});

const defaultCenter: [number, number]  = [48.695874, 2.367055];


interface TerritoryCollectionProps {
    geoJsonData: TerritoryCollection;
}

const TerritoryMap: React.FC<TerritoryCollectionProps> = ({geoJsonData}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const center = useMemo(() => calculateCenter(geoJsonData), [geoJsonData]);
    const sidebar = useSidebar();

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const mapHeight = useMemo(() => {
        if (isExpanded) {
            return "1200px";
        } else {
            return "700px";
        }
    }, [isExpanded]) ;

    useEffect(()=> {
        console.log("Map height", mapHeight);
    }, [mapHeight])

    return (
        <div className="relative">
            <div
                className="transition-all duration-500"
                style={{ height: mapHeight, width: "100%" }}
            >
                <MapContainer
                    center={center}
                    zoom={15}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    <MapUpdater isSidebarOpen={sidebar.state === "expanded"} isExpanded={isExpanded} />
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                        attribution="..."
                    />
                    <GeoJSON onEachFeature={onEachFeature} data={geoJsonData} style={territoryStyle} />
                </MapContainer>
            </div>

            <Button
                variant="outline"
                size="icon"
                className="absolute top-3 right-3 z-10 bg-white shadow-md"
                onClick={toggleExpand}
                title={isExpanded ? "Réduire la carte" : "Agrandir la carte"}
            >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
        </div>
    );
};

const calculateCenter = (geoJsonData: TerritoryCollection): [number, number] => {
    if (!geoJsonData || geoJsonData.features.length === 0 || geoJsonData.features.filter(value => value.geometry).length == 0) return defaultCenter;

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    geoJsonData.features.filter(value => value.geometry).forEach((feature) => {
        if (feature.geometry.coordinates.length == 0) return;

        if (feature.geometry.type === "Polygon") {
            // Un seul ensemble de coordonnées pour un Polygone
            feature.geometry.coordinates[0].forEach(([lng, lat]) => {
                sumLat += lat;
                sumLng += lng;
                count++;
            });
        } else if (feature.geometry.type === "MultiPolygon") {
            // Plusieurs ensembles de coordonnées pour un MultiPolygon
            feature.geometry.coordinates.forEach(polygon => {
                polygon[0].forEach(coord => {
                    const [lng, lat] = coord as unknown as [number, number];
                    sumLat += lat;
                    sumLng += lng;
                    count++;
                });
            });
        }
    });

    return count > 0 ? [sumLat / count, sumLng / count] : [0, 0];
};

const onEachFeature = (feature:  TerritoryFeature, layer: Layer) => {
    if (feature.properties) {
        const { id, name, status, territoryMapId } = feature.properties;

        // Créer un conteneur pour le popup
        const container = document.createElement("div");

        // Ajouter du contenu statique (nom + statut)
        container.innerHTML = `
            <div class="text-center">
                <h2 class="text-lg font-bold">${name}</h2>
            </div>
            <div class="flex justify-center mt-2 mb-5">
                <span class="${getBadgeColor(status)} text-white px-2 py-1 rounded w-full text-center">
                    ${STATUS_TRANSLATIONS[status] || status}
                </span>
            </div>
            <div id="react-popup-${id}"></div>  <!-- Un div spécifique pour React -->
        `;

        // Lier la popup au layer
        layer.bindPopup(container);

        // Attendre que le popup s'affiche avant d'insérer React
        layer.on("popupopen", (e: PopupEvent) => {
            const popup = e.popup; // Récupérer l'instance des pop-up Leaflet
            const reactContainer = document.getElementById(`react-popup-${id}`);

            if (reactContainer) {
                createRoot(reactContainer).render(
                    <Provider store={store}>

                    <TerritoryDataActionButtons territoryId={id} status={status} territoryMapId={territoryMapId}/>
                    </Provider>

                );

                // Attendre la fin du rendu React pour mettre à jour la taille du popup
                setTimeout(() => {
                    popup.update(); // Recalcule la taille du popup après le rendu de React
                }, 100);
            }
        });
    }
};

const territoryStyle = (feature?: Feature<Geometry, { status: TerritoryStatus }>): PathOptions => {
    if (!feature || !feature.properties) {
        return {
            fillColor: "#6b7280", // Couleur par défaut (gris)
            color: "#6b7280",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.6
        };
    }

    const badgeColor = getBadgeColorTerritory(feature.properties.status);
    return {
        fillColor: badgeColor,
        color: badgeColor,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6
    };
};

export const getBadgeColorTerritory = (status: TerritoryStatus) => {
    switch (status) {
        case "AVAILABLE":
            return "#9333ea";
        case "ASSIGNED":
            return "#22c55e";
        case "LATE":
            return "#ec4899";
        case "PENDING":
            return "#0ea5e9";
        default:
            return "#6b7280";
    }
};

export default TerritoryMap;
