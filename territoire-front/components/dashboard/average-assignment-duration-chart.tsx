"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { authFetch } from "@/utils/auth-fetch";

interface AverageAssignmentDuration {
    period: string;
    averageDuration: number;
}

export const AverageAssignmentDurationChart: React.FC = () => {
    const [chartData, setChartData] = useState<AverageAssignmentDuration[]>([]);
    const [overallAverage, setOverallAverage] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch monthly data
                const response = await authFetch("/api/territoires/statistiques/duree-moyenne-attribution/par-mois");
                const data = await response.json();

                // Format the data for the chart
                const formattedData = data.map((item: { period: string; averageDuration: number }) => ({
                    period: formatYearMonth(item.period),
                    averageDuration: Math.round(item.averageDuration)
                }));

                setChartData(formattedData);

                // Fetch overall average
                const overallResponse = await authFetch("/api/territoires/statistiques/duree-moyenne-attribution/globale");
                const overallData = await overallResponse.json();
                setOverallAverage(Math.round(overallData));
            } catch (error) {
                console.error("Erreur lors de la récupération des données de durée d'attribution :", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper function to format YearMonth (2023-01) to a more readable format (Jan 2023)
    const formatYearMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Durée moyenne d&apos;attribution</CardTitle>
                <CardDescription>
                    Durée moyenne pendant laquelle les territoires restent attribués avant d&apos;être retournés
                    {overallAverage !== null && (
                        <div className="mt-2 font-semibold">
                            Moyenne globale: {overallAverage} jours
                        </div>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Chargement des statistiques...</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="period" 
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis 
                                label={{ value: 'Jours', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar 
                                dataKey="averageDuration" 
                                name="Durée moyenne (jours)" 
                                fill="#8884d8" 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
};
