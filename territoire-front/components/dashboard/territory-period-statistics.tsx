"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerritoryType } from "@/models/territory-type";
import { TerritoryStatusData, TerritoryTypeData, CityData } from "@/models/chart-data";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchTerritoryPeriodStatistics } from "@/store/slices/territory-slice";
import { StatisticsCharts } from "@/components/campaigns/statistics/statistics-charts";
import { StatisticsTable } from "@/components/campaigns/statistics/statistics-table";
import { CityStatisticsTable } from "@/components/campaigns/statistics/city-statistics-table";

interface TerritoryPeriodStatisticsProps {
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
}

// Réutilise les mêmes graphiques et tableaux que la page Campagnes (pie, bar par type, bar par ville)
// en les alimentant avec la couverture (parcourus / non parcourus) sur la période scolaire sélectionnée.
export function TerritoryPeriodStatistics({ startDate, endDate, periodLabel }: TerritoryPeriodStatisticsProps) {
    const dispatch = useAppDispatch();
    const { periodStatistics: statistics, statisticsLoading: loading, error } = useAppSelector(state => state.territories);

    useEffect(() => {
        dispatch(fetchTerritoryPeriodStatistics(startDate || endDate ? { startDate, endDate } : undefined));
    }, [dispatch, startDate, endDate]);

    const statusTranslations = {
        used: "Parcourus",
        available: "Non parcourus",
    };

    const typeTranslations = {
        [TerritoryType.BUILDING]: "Immeubles",
        [TerritoryType.HOUSE]: "Pavillons",
    };

    const COLORS = ["#22c55e", "#ef4444"];

    return (
        <Card className="shadow-md border-0">
            <CardHeader>
                <CardTitle>Statistiques détaillées</CardTitle>
                <CardDescription>
                    {periodLabel
                        ? `Répartition des territoires parcourus et non parcourus pour la période ${periodLabel}`
                        : "Répartition des territoires parcourus et non parcourus"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Chargement des statistiques...</p>
                ) : error ? (
                    <p>Erreur: {error}</p>
                ) : !statistics ? (
                    <p className="text-muted-foreground">Aucune statistique disponible</p>
                ) : (
                    <Tabs defaultValue="charts" className="w-full">
                        <TabsList className="mb-6">
                            <TabsTrigger value="charts">Graphiques</TabsTrigger>
                            <TabsTrigger value="details">Détails par type</TabsTrigger>
                            <TabsTrigger value="cities">Détails par ville</TabsTrigger>
                        </TabsList>

                        <TabsContent value="charts">
                            <StatisticsCharts
                                territoryStatusData={buildStatusData(statistics, statusTranslations)}
                                territoryTypeData={buildTypeData(statistics, typeTranslations)}
                                cityData={buildCityData(statistics)}
                                statusTranslations={statusTranslations}
                                colors={COLORS}
                            />
                        </TabsContent>

                        <TabsContent value="details">
                            <StatisticsTable statistics={statistics} typeTranslations={typeTranslations} />
                        </TabsContent>

                        <TabsContent value="cities">
                            <CityStatisticsTable statistics={statistics} />
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    );
}

function buildStatusData(
    statistics: { usedTerritories: number; availableTerritories: number },
    statusTranslations: Record<string, string>
): TerritoryStatusData[] {
    return [
        { name: statusTranslations.used, value: statistics.usedTerritories, key: "used" },
        { name: statusTranslations.available, value: statistics.availableTerritories, key: "available" },
    ];
}

function buildTypeData(
    statistics: {
        usedTerritoriesByType: Record<string, number>;
        availableTerritoriesByType: Record<string, number>;
    },
    typeTranslations: Record<TerritoryType, string>
): TerritoryTypeData[] {
    return [
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
}

function buildCityData(statistics: {
    totalTerritoriesByCity: Record<string, number>;
    usedTerritoriesByCity: Record<string, number>;
    availableTerritoriesByCity: Record<string, number>;
}): CityData[] {
    return Object.keys(statistics.totalTerritoriesByCity).map(cityName => ({
        name: cityName,
        used: statistics.usedTerritoriesByCity[cityName] || 0,
        available: statistics.availableTerritoriesByCity[cityName] || 0,
    }));
}
