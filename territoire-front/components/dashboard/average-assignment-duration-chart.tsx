"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchAverageAssignmentDurationByMonth, fetchOverallAverageAssignmentDuration } from "@/store/slices/territory-slice";

// Using AverageAssignmentDuration type from the Redux store

export const AverageAssignmentDurationChart: React.FC = () => {
    const dispatch = useAppDispatch();
    const { 
        averageAssignmentDurationByMonth, 
        overallAverageAssignmentDuration, 
        statisticsLoading, 
        error 
    } = useSelector((state: RootState) => state.territories);

    useEffect(() => {
        dispatch(fetchAverageAssignmentDurationByMonth());
        dispatch(fetchOverallAverageAssignmentDuration());
    }, [dispatch]);

    // Format the data for the chart
    const chartData = averageAssignmentDurationByMonth.map(item => ({
        period: formatYearMonth(item.period),
        averageDuration: Math.round(item.averageDuration)
    }));

    // Round the overall average
    const overallAverage = overallAverageAssignmentDuration !== null 
        ? Math.round(overallAverageAssignmentDuration) 
        : null;

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
                {statisticsLoading ? (
                    <p>Chargement des statistiques...</p>
                ) : error ? (
                    <p>Erreur: {error}</p>
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
