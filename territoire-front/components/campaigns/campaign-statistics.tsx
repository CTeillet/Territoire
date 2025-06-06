"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CampaignStatistics } from "@/models/campaign-statistics";
import { TerritoryType } from "@/models/territory-type";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";

interface CampaignStatisticsProps {
  campaignId: string;
}

export function CampaignStatisticsComponent({ campaignId }: CampaignStatisticsProps) {
  const [statistics, setStatistics] = useState<CampaignStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`/api/campagnes/${campaignId}/statistiques`);
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const data = await response.json();
        setStatistics(data);
      } catch (error) {
        console.error("Error fetching statistics:", error);
        toast.error("Impossible de charger les statistiques");
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchStatistics();
    }
  }, [campaignId]);

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
  const territoryStatusData = [
    { name: statusTranslations.used, value: statistics.usedTerritories, key: "used" },
    { name: statusTranslations.available, value: statistics.availableTerritories, key: "available" },
  ];

  const territoryTypeData = [
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Total des territoires</h3>
            <p className="text-3xl font-bold">{statistics.totalTerritories}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Territoires utilisés</h3>
            <p className="text-3xl font-bold text-green-600">{statistics.usedTerritories}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Territoires disponibles</h3>
            <p className="text-3xl font-bold text-blue-600">{statistics.availableTerritories}</p>
          </div>
        </div>

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="charts">Graphiques</TabsTrigger>
            <TabsTrigger value="details">Détails par type</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Répartition des territoires</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={territoryStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {territoryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => {
                        // For PieChart, name is the category (value)
                        return [value, props.payload.name];
                      }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Territoires par type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={territoryTypeData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => {
                        if (name === "used") return [value, statusTranslations.used];
                        if (name === "available") return [value, statusTranslations.available];
                        return [value, name];
                      }} />
                      <Legend formatter={(value) => {
                        if (value === "used") return statusTranslations.used;
                        if (value === "available") return statusTranslations.available;
                        return value;
                      }} />
                      <Bar dataKey="used" name="used" fill="#0088FE" />
                      <Bar dataKey="available" name="available" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-left">Type de territoire</th>
                    <th className="border p-3 text-center">Total</th>
                    <th className="border p-3 text-center">Utilisés</th>
                    <th className="border p-3 text-center">Disponibles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-3 font-medium">Immeubles</td>
                    <td className="border p-3 text-center">{statistics.totalTerritoriesByType[TerritoryType.BUILDING] || 0}</td>
                    <td className="border p-3 text-center">{statistics.usedTerritoriesByType[TerritoryType.BUILDING] || 0}</td>
                    <td className="border p-3 text-center">{statistics.availableTerritoriesByType[TerritoryType.BUILDING] || 0}</td>
                  </tr>
                  <tr>
                    <td className="border p-3 font-medium">Pavillons</td>
                    <td className="border p-3 text-center">{statistics.totalTerritoriesByType[TerritoryType.HOUSE] || 0}</td>
                    <td className="border p-3 text-center">{statistics.usedTerritoriesByType[TerritoryType.HOUSE] || 0}</td>
                    <td className="border p-3 text-center">{statistics.availableTerritoriesByType[TerritoryType.HOUSE] || 0}</td>
                  </tr>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border p-3">Total</td>
                    <td className="border p-3 text-center">{statistics.totalTerritories}</td>
                    <td className="border p-3 text-center">{statistics.usedTerritories}</td>
                    <td className="border p-3 text-center">{statistics.availableTerritories}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
