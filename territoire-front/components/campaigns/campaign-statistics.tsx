"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerritoryType } from "@/models/territory-type";
import { TerritoryStatusData, TerritoryTypeData } from "@/models/chart-data";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchCampaignStatistics } from "@/store/slices/campaign-slice";

// Import sub-components
import { StatisticsSummary } from "./statistics/statistics-summary";
import { StatisticsCharts } from "./statistics/statistics-charts";
import { StatisticsTable } from "./statistics/statistics-table";

interface CampaignStatisticsProps {
  campaignId: string;
}

export function CampaignStatisticsComponent({ campaignId }: CampaignStatisticsProps) {
  const dispatch = useAppDispatch();
  const { campaignStatistics: statistics, loadingStatistics: loading, error } = useAppSelector(state => state.campaigns);

  useEffect(() => {
    if (campaignId) {
      dispatch(fetchCampaignStatistics(campaignId))
        .unwrap()
        .catch((error) => {
          console.error("Error fetching statistics:", error);
          toast.error("Impossible de charger les statistiques");
        });
    }
  }, [campaignId, dispatch]);

  // Show error toast if there's an error in the Redux state
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (loading) {
    return (
      <Card className="shadow-md border-0">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold mb-2">Statistiques</CardTitle>
          <CardDescription className="text-base">
            Chargement des statistiques...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!statistics) {
    return (
      <Card className="shadow-md border-0">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold mb-2">Statistiques</CardTitle>
          <CardDescription className="text-base">
            Aucune statistique disponible
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Translation mapping for display
  const statusTranslations = {
    used: "Utilisés",
    available: "Disponibles"
  };

  const typeTranslations = {
    [TerritoryType.BUILDING]: "Immeubles",
    [TerritoryType.HOUSE]: "Pavillons"
  };

  // Prepare data for charts
  const territoryStatusData: TerritoryStatusData[] = [
    { name: statusTranslations.used, value: statistics.usedTerritories, key: "used" },
    { name: statusTranslations.available, value: statistics.availableTerritories, key: "available" },
  ];

  const territoryTypeData: TerritoryTypeData[] = [
    { 
      name: typeTranslations[TerritoryType.BUILDING], 
      used: statistics.usedTerritoriesByType[TerritoryType.BUILDING] || 0,
      available: statistics.availableTerritoriesByType[TerritoryType.BUILDING] || 0,
    },
    { 
      name: typeTranslations[TerritoryType.HOUSE], 
      used: statistics.usedTerritoriesByType[TerritoryType.HOUSE] || 0,
      available: statistics.availableTerritoriesByType[TerritoryType.HOUSE] || 0,
    },
  ];

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <Card className="shadow-md border-0 mt-8">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold mb-2">Statistiques</CardTitle>
        <CardDescription className="text-base">
          Statistiques des territoires pour cette campagne
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <StatisticsSummary statistics={statistics} />

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="charts">Graphiques</TabsTrigger>
            <TabsTrigger value="details">Détails par type</TabsTrigger>
          </TabsList>

          <TabsContent value="charts">
            <StatisticsCharts 
              territoryStatusData={territoryStatusData}
              territoryTypeData={territoryTypeData}
              statusTranslations={statusTranslations}
              colors={COLORS}
            />
          </TabsContent>

          <TabsContent value="details">
            <StatisticsTable 
              statistics={statistics}
              typeTranslations={typeTranslations}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
