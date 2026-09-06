"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Loader2 } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import MapUpdater from "@/components/territory/map-updater";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchTerritoryCoverageMap } from "@/store/slices/territory-slice";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), { ssr: false });

const defaultCenter: [number, number] = [48.695874, 2.367055];

interface TerritoryCoverageMapProps {
  startDate?: string;
  endDate?: string;
}

const TerritoryCoverageMap: React.FC<TerritoryCoverageMapProps> = ({ startDate, endDate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebar = useSidebar();
  const dispatch = useAppDispatch();

  const { territoryCoverageGeojson, loadingCoverageMap } = useAppSelector(state => state.territories);

  useEffect(() => {
    dispatch(fetchTerritoryCoverageMap({ startDate, endDate }));
  }, [dispatch, startDate, endDate]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const calculateCenter = (): [number, number] => {
    if (!territoryCoverageGeojson || territoryCoverageGeojson.features.length === 0) return defaultCenter;

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    territoryCoverageGeojson.features.forEach((feature: any) => {
      if (!feature.geometry) return;
      if (feature.geometry.type === "Polygon") {
        feature.geometry.coordinates[0].forEach(([lng, lat]: [number, number]) => {
          sumLat += lat;
          sumLng += lng;
          count++;
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        feature.geometry.coordinates.forEach((polygon: any) => {
          polygon[0].forEach((coord: [number, number]) => {
            const [lng, lat] = coord;
            sumLat += lat;
            sumLng += lng;
            count++;
          });
        });
      }
    });

    if (count > 0) {
      return [sumLat / count, sumLng / count];
    }

    return defaultCenter;
  };

  const center = useMemo(calculateCenter, [territoryCoverageGeojson]);

  const getTerritoryStyle = (feature: any) => {
    const parcouru = feature.properties.parcouru;

    return {
      fillColor: parcouru ? "#22c55e" : "#ef4444", // green-500 : red-500
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.6,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-4 text-sm bg-muted p-2 rounded-md">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
          <span>Parcouru</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
          <span>Non parcouru</span>
        </div>
      </div>

      <div className="relative border rounded-xl overflow-hidden shadow-sm">
        {loadingCoverageMap && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Chargement de la carte...</p>
            </div>
          </div>
        )}
        <div
          className="transition-all duration-500"
          style={{ height: isExpanded ? "1200px" : "700px", width: "100%" }}
        >
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
          >
            <MapUpdater
              isSidebarOpen={sidebar.state === "expanded"}
              isExpanded={isExpanded}
            />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {territoryCoverageGeojson && (
              <GeoJSON
                key={`territory-coverage-${startDate}-${endDate}`}
                data={territoryCoverageGeojson as any}
                style={getTerritoryStyle}
              />
            )}
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
    </div>
  );
};

export default TerritoryCoverageMap;
