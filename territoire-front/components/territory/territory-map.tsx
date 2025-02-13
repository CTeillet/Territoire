"use client"; // Indique que ce fichier doit être exécuté côté client

import dynamic from "next/dynamic";
import React, {useMemo} from "react";
import {TerritoryCollection, TerritoryFeature} from "@/models/territory";
import {TerritoryCollectionProps} from "@/models/territory-props";
import {STATUS_TRANSLATIONS, TerritoryStatus} from "@/models/territory-status";
import {renderToString} from "react-dom/server";
import {getBadgeColor, PERSONS_MOCK} from "@/components/territory/territory-data-columns";
import {TerritoryDataActionButtons} from "@/components/territory/territory-data-action-buttons";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {ssr: false});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {ssr: false});
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), {ssr: false});


const TerritoryMap: React.FC<TerritoryCollectionProps> = ({geoJsonData}) => {
    const center = useMemo(() => calculateCenter(geoJsonData), [geoJsonData]);

    return (
        <MapContainer center={center} zoom={14} style={{ height: "500px", width: "100%", zIndex: 0 }}>
            <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
            />
            <GeoJSON onEachFeature={onEachFeature} data={geoJsonData} style={territoryStyle} />
        </MapContainer>
    );
};

const calculateCenter = (geoJsonData: TerritoryCollection): [number, number] => {
    if (!geoJsonData || geoJsonData.features.length === 0) return [0, 0];

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    geoJsonData.features.forEach((feature) => {
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

const onEachFeature = (feature:  TerritoryFeature, layer: any) => {
    if (feature.properties) {
        const {id, name, status} = feature.properties;
        const html = renderToString(
            <>
                <div className={"text-center"}>
                    <h2 className={"text-lg font-bold"}>{name}</h2>
                </div>
                <div className={"flex justify-center mt-2 mb-5"}>
                    <span className={`${getBadgeColor(status)} text-white px-2 py-1 rounded w-full text-center`}>
                        {STATUS_TRANSLATIONS[status] || status}
                    </span>
                </div>
                <TerritoryDataActionButtons id={id} people={PERSONS_MOCK}/>
            </>
        );
        layer.bindPopup(`${html}`);
    }
};

const territoryStyle = (feature: any) => {
    console.log(feature);
    const badgeColor = getBadgeColorTerritory(feature.properties.status);
    console.log(badgeColor);
    return {
        fillColor: badgeColor,
        color: badgeColor, // Bordure noire pour le contraste
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6 // Opacité du remplissage
    };
};

export const getBadgeColorTerritory = (status: TerritoryStatus) => {
    switch (status) {
        case "AVAILABLE":
            return "#9333ea";  // 🟣 Violet (bg-purple-500)
        case "ASSIGNED":
            return "#f97316";  // 🟠 Orange (bg-orange-500)
        case "LATE":
            return "#ec4899";  // 🔴 Rose (bg-pink-500)
        case "PENDING":
            return "#92400e";  // 🟤 Brun (bg-amber-700)
        default:
            return "#6b7280";  // ⚫ Gris (bg-gray-500)
    }
};


export default TerritoryMap;

//esri
// var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
//     attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
// });
