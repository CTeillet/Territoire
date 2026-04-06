"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { TerritoryType } from "@/models/territory-type";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Info, Loader2 } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import MapUpdater from "@/components/territory/map-updater";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchCampaignMap, clearCampaignMap } from "@/store/slices/campaign-slice";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), { ssr: false });

const defaultCenter: [number, number] = [48.695874, 2.367055];

// Types for styling
type ColorBy = "type" | "status";

interface CampaignMapProps {
  campaignId: string;
  remainingTerritoryIds: string[]; // Pass only IDs to avoid outdated geojson issues
}

const CampaignMap: React.FC<CampaignMapProps> = ({ campaignId, remainingTerritoryIds }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [colorBy, setColorBy] = useState<ColorBy>("status");
  const sidebar = useSidebar();
  const dispatch = useAppDispatch();
  
  const { currentCampaignGeoJson, loadingMap } = useAppSelector(state => state.campaigns);

  useEffect(() => {
    // Clear the map data if it's for a different campaign (not easy to check here)
    // or just fetch if it's null
    if (!currentCampaignGeoJson) {
      dispatch(fetchCampaignMap(campaignId));
    }
    
    // Cleanup on unmount or campaignId change
    return () => {
      dispatch(clearCampaignMap());
    };
  }, [campaignId, dispatch]);

  const remainingIds = useMemo(() => new Set(remainingTerritoryIds), [remainingTerritoryIds]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const calculateCenter = (): [number, number] => {
    if (!currentCampaignGeoJson || currentCampaignGeoJson.features.length === 0) return defaultCenter;

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    currentCampaignGeoJson.features.forEach((feature: any) => {
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

  const center = useMemo(calculateCenter, [currentCampaignGeoJson]);

  const getTerritoryStyle = (feature: any) => {
    const isVisited = !remainingIds.has(feature.properties.id);
    const type = feature.properties.type;
    
    let fillColor = "#94a3b8"; // Default slate-400

    if (colorBy === "status") {
      fillColor = isVisited ? "#22c55e" : "#ef4444"; // green-500 : red-500
    } else {
      // Color by type
      if (type === TerritoryType.BUILDING) {
        fillColor = "#3b82f6"; // blue-500
      } else if (type === TerritoryType.HOUSE) {
        fillColor = "#f97316"; // orange-500
      }
    }

    return {
      fillColor,
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: isVisited && colorBy === "type" ? 0.3 : 0.6
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Colorier par :</span>
          <Button 
            variant={colorBy === "status" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setColorBy("status")}
          >
            Statut (Visité/Restant)
          </Button>
          <Button 
            variant={colorBy === "type" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setColorBy("type")}
          >
            Type (Immeuble/Pavillon)
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm bg-muted p-2 rounded-md">
          {colorBy === "status" ? (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                <span>À faire</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
                <span>Utilisé</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                <span>Immeuble</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
                <span>Pavillon</span>
              </div>
              <div className="flex items-center gap-1 ml-2 text-muted-foreground italic">
                <Info className="w-3 h-3" />
                <span>Opacité réduite = Déjà utilisé</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative border rounded-xl overflow-hidden shadow-sm">
        {loadingMap && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Chargement des données de la carte...</p>
            </div>
          </div>
        )}
        <div
          className="transition-all duration-500"
          style={{ height: '780px', width: "100%" }}
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
            {currentCampaignGeoJson && (
              <GeoJSON
                key={`campaign-geojson-${colorBy}-${remainingTerritoryIds.length}`}
                data={currentCampaignGeoJson as any}
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

export default CampaignMap;
