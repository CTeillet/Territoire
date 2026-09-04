"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchTerritoryDistributionByCity } from "@/store/slices/territory-slice";

interface TerritoryDistribution {
    cityName: string;
    territoryCount: number;
    percentage: number;
}

interface TerritoryDistributionChartProps {
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
}

export const TerritoryDistributionChart: React.FC<TerritoryDistributionChartProps> = ({ startDate, endDate, periodLabel }) => {
    const dispatch = useAppDispatch();
    const { territoryDistributionByCity, statisticsLoading, error } = useSelector((state: RootState) => state.territories);

    useEffect(() => {
        dispatch(fetchTerritoryDistributionByCity(startDate || endDate ? { startDate, endDate } : undefined));
    }, [dispatch, startDate, endDate]);

    // Generate colors for the pie chart
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#6B66FF'];

    // Custom tooltip formatter
    const CustomTooltip = ({ 
        active, 
        payload 
    }: { 
        active?: boolean; 
        payload?: Array<{ payload: TerritoryDistribution }> 
    }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-2 border rounded shadow-sm">
                    <p className="font-semibold">{data.cityName}</p>
                    <p>Territoires: {data.territoryCount}</p>
                    <p>Pourcentage: {data.percentage.toFixed(2)}%</p>
                </div>
            );
        }
        return null;
    };

    const descriptionText = periodLabel
        ? `Répartition des territoires par ville pour la période ${periodLabel}`
        : "Répartition des territoires par ville depuis le 01/09";

    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribution par ville</CardTitle>
                <CardDescription>
                    {descriptionText}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {statisticsLoading ? (
                    <p>Chargement des statistiques...</p>
                ) : error ? (
                    <p>Erreur: {error}</p>
                ) : territoryDistributionByCity.length === 0 ? (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        Aucune donnée pour cette période
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={territoryDistributionByCity}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey="territoryCount"
                                nameKey="cityName"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {territoryDistributionByCity.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
};
