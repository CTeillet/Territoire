import React, { useEffect } from "react";
import { useMap } from "react-leaflet";

const MapUpdater: React.FC<{ isSidebarOpen: boolean, isExpanded?: boolean }> = ({ isSidebarOpen, isExpanded }) => {
    const map = useMap();

    useEffect(() => {
        const timeout = setTimeout(() => {
            requestAnimationFrame(() => {
                map.invalidateSize();
            });
        }, 300);

        return () => clearTimeout(timeout);
    }, [isSidebarOpen, isExpanded, map]);

    return null;
};

export default MapUpdater;
