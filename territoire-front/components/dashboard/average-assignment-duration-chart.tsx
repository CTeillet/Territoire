"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchAverageAssignmentDurationByMonth, fetchOverallAverageAssignmentDuration } from "@/store/slices/territory-slice";

interface AverageAssignmentDurationChartProps {
    startDate?: string;
    endDate?: string;
}

export const AverageAssignmentDurationChart: React.FC<AverageAssignmentDurationChartProps> = ({ startDate, endDate }) => {
    const dispatch = useAppDispatch();
    const { 
        averageAssignmentDurationByMonth, 
        overallAverageAssignmentDuration, 
        statisticsLoading, 
        error 
    } = useSelector((state: RootState) => state.territories);

    useEffect(() => {
        dispatch(fetchAverageAssignmentDurationByMonth(startDate || endDate ? { startDate, endDate } : undefined));
        dispatch(fetchOverallAverageAssignmentDuration(startDate || endDate ? { startDate, endDate } : undefined));
    }, [dispatch, startDate, endDate]);

    // Helper function to format YearMonth (2023-01) to a more readable format (Jan 2023)
    const formatYearMonth = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    };

    // Format the data for the chart
    const chartData = averageAssignmentDurationByMonth.map(item => ({
        period: formatYearMonth(item.period),
        averageDuration: Math.round(item.averageDuration)
    }));

    // Round the overall average
    const overallAverage = overallAverageAssignmentDuration !== null 
        ? Math.round(overallAverageAssignmentDuration) 
        : null;

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
                {statisticsLoading ? (
                    <p>Chargement des statistiques...</p>
                ) : error ? (
                    <p>Erreur: {error}</p>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Aucune donnée pour cette période
                    </div>
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
