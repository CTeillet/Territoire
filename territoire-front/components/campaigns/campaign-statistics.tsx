"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerritoryType } from "@/models/territory-type";
import { TerritoryStatusData, TerritoryTypeData, CityData } from "@/models/chart-data";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchCampaignStatistics, exportCampaignStatistics } from "@/store/slices/campaign-slice";

// Import sub-components
import { StatisticsSummary } from "./statistics/statistics-summary";
import { StatisticsCharts } from "./statistics/statistics-charts";
import { StatisticsTable } from "./statistics/statistics-table";
import { CityStatisticsTable } from "./statistics/city-statistics-table";
import { Download } from "lucide-react";

interface CampaignStatisticsProps {
  campaignId: string;
}

export function CampaignStatisticsComponent({ campaignId }: CampaignStatisticsProps) {
  const dispatch = useAppDispatch();
  const { campaignStatistics: statistics, loadingStatistics: loading, error } = useAppSelector(state => state.campaigns);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!statistics) return;
    
    setIsExporting(true);
    const toastId = toast.loading("Génération de l'export Excel natif avec graphiques...");
    
    try {
      await dispatch(exportCampaignStatistics({ 
        campaignId: statistics.campaignId, 
        campaignName: statistics.campaignName 
      })).unwrap();
      
      toast.success("Export Excel terminé", { id: toastId });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error("Erreur lors de la génération de l'export", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      dispatch(fetchCampaignStatistics(campaignId))
        .unwrap()
        .catch((error) => {
          if (error.name === 'ConditionError') return;
          console.error("Error fetching statistics:", error);
        });
    }
  }, [campaignId, dispatch]);


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
    available: "Restants"
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

  const cityData: CityData[] = Object.keys(statistics.totalTerritoriesByCity).map(cityName => ({
    name: cityName,
    used: statistics.usedTerritoriesByCity[cityName] || 0,
    available: statistics.availableTerritoriesByCity[cityName] || 0,
  }));

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <Card className="shadow-md border-0 mt-8">
      <CardHeader className="pb-6 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-2xl font-bold mb-2">Statistiques</CardTitle>
          <CardDescription className="text-base">
            Statistiques des territoires pour cette campagne
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Export en cours..." : "Exporter en Excel"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <StatisticsSummary statistics={statistics} />

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="charts">Graphiques</TabsTrigger>
            <TabsTrigger value="details">Détails par type</TabsTrigger>
            <TabsTrigger value="cities">Détails par ville</TabsTrigger>
          </TabsList>

          <TabsContent value="charts">
            <StatisticsCharts 
              territoryStatusData={territoryStatusData}
              territoryTypeData={territoryTypeData}
              cityData={cityData}
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

          <TabsContent value="cities">
            <CityStatisticsTable 
              statistics={statistics}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
