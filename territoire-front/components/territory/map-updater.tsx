import React, { useEffect } from "react";
import { useMap } from "react-leaflet";

const MapUpdater: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
    const map = useMap();

    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 300); // Légère pause pour laisser l'animation finir
    }, [isSidebarOpen, map]);

    return null;
};

export default MapUpdater;
