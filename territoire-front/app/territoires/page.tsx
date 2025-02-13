"use client";

import {useEffect, useState} from "react";
import "leaflet/dist/leaflet.css";
import {TerritoryCollection} from "@/models/territory";
import TerritoryMap from "@/components/territory/territory-map";
import TerritoryTable from "@/components/territory/territory-table";

const mockGeoJsonData: TerritoryCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
                id: "1",
                name: "Territory 1",
                status: "AVAILABLE",
                lastModifiedDate: new Date("2024-02-12T12:00:00Z"),
                city: "Juvisy sur Orge",
                addressNotToDo: []
            },
            geometry: {
                type: "Polygon",
                coordinates: [[[2.3603239, 48.6933831], [2.3608281, 48.6931494], [2.3610212, 48.6933193],
                    [2.3655059, 48.693723], [2.3659458, 48.6942258], [2.3614397, 48.6945303],
                    [2.3603239, 48.6933831]]]
            }
        },
        {
            type: "Feature",
            properties: {
                id: "2",
                name: "Territory 2",
                status: "ASSIGNED",
                lastModifiedDate: new Date("2024-02-12T12:00:00Z"),
                city: "Juvisy sur Orge",
                addressNotToDo: []
            },
            geometry: {
                type: "Polygon",
                coordinates: [[[2.3654329, 48.6936768], [2.3635982, 48.6934926], [2.3647891, 48.6929898],
                    [2.3654329, 48.6936768]]]
            }
        },
        {
            type: "Feature",
            properties: {
                id: "3",
                name: "Territory 3",
                status: "AVAILABLE",
                lastModifiedDate: new Date("2024-02-12T12:00:00Z"),
                city: "Juvisy sur Orge",
                addressNotToDo: []
            },
            geometry: {
                type: "Polygon",
                coordinates: [[[2.3647891, 48.6929898], [2.3634909, 48.6934856], [2.3620533, 48.6933439],
                    [2.3642205, 48.6924516], [2.3647891, 48.6929898]]]
            }
        },
        {
            type: "Feature",
            properties: {
                id: "4",
                name: "Territory 4",
                status: "ASSIGNED",
                lastModifiedDate: new Date("2024-02-12T12:00:00Z"),
                city: "Juvisy sur Orge",
                addressNotToDo: []
            },
            geometry: {
                type: "Polygon",
                coordinates: [[[2.3609053, 48.6931315], [2.3635017, 48.6919629], [2.3641239, 48.6924303],
                    [2.3619031, 48.6933297], [2.3611091, 48.6932802], [2.3609053, 48.6931315]]]
            }
        },
        {
            type: "Feature",
            properties: {
                id: "5",
                name: "Territory 5",
                status: "AVAILABLE",
                lastModifiedDate: new Date("2024-02-12T12:00:00Z"),
                city: "Juvisy sur Orge",
                addressNotToDo: []
            },
            geometry: {
                type: "Polygon",
                coordinates: [[[2.3615088, 48.6945797], [2.3625602, 48.6945088], [2.3638906, 48.6959323],
                    [2.3632683, 48.696428], [2.3620237, 48.6950966], [2.3615088, 48.6945797]]]
            }
        }
    ]
};

const TerritoryPage = () => {
    const [geoJsonData, setGeoJsonData] = useState<TerritoryCollection | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMockData = () => {
            setTimeout(() => {
                setGeoJsonData(mockGeoJsonData);
                setLoading(false);
            }, 2000); // Simule un délai de 2 secondes
        };

        fetchMockData();
    }, []);

    return (
        <div className="flex flex-col gap-4 p-4">
            <h1 className="text-xl font-bold">Territoires</h1>
            {loading ? (
                <p>Chargement des territoires...</p>
            ) : (
                <>
                    {geoJsonData && <TerritoryMap geoJsonData={geoJsonData} />}
                    {geoJsonData && <TerritoryTable geoJsonData={geoJsonData} />}
                </>
            )}
        </div>
    );
};

export default TerritoryPage;
