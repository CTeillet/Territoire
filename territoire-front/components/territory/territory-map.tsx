"use client"; // Indique que ce fichier doit être exécuté côté client

import dynamic from "next/dynamic";
import React, {useMemo} from "react";
import {TerritoryCollection} from "@/models/territory";
import {TerritoryCollectionProps} from "@/models/territory-props";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), { ssr: false });



const TerritoryMap: React.FC<TerritoryCollectionProps> = ({ geoJsonData }) => {
    const center = useMemo(() => calculateCenter(geoJsonData), [geoJsonData]);

    return (
        <MapContainer center={center} zoom={14} style={{ height: "500px", width: "100%" }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            {geoJsonData.features.map((feature) => (
                <GeoJSON key={feature.properties.id} data={feature} />
            ))}
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



export default TerritoryMap;
