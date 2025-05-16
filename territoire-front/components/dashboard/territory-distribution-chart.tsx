"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { authFetch } from "@/utils/auth-fetch";

interface TerritoryDistribution {
    cityName: string;
    territoryCount: number;
    percentage: number;
}

export const TerritoryDistributionChart: React.FC = () => {
    const [chartData, setChartData] = useState<TerritoryDistribution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await authFetch("/api/territoires/statistiques/distribution-par-ville");
                const data = await response.json();

                setChartData(data);
            } catch (error) {
                console.error("Erreur lors de la récupération de la distribution des territoires :", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribution par ville</CardTitle>
                <CardDescription>
                    Répartition des territoires par ville depuis le 01/09
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Chargement des statistiques...</p>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey="territoryCount"
                                nameKey="cityName"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {chartData.map((entry, index) => (
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
