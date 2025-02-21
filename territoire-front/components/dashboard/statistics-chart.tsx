import React, {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "../ui/card";
import {CartesianGrid, Line, LineChart, XAxis, YAxis} from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from "@/components/ui/chart";
import {TerritoryStatusHistoryDto} from "@/models/territory-status-history";
import {authFetch} from "@/utils/auth-fetch";

export const StatisticsChart: React.FC = () => {
    const [chartData, setChartData] = useState<TerritoryStatusHistoryDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await authFetch("/api/territoires/statistiques");
                const data: TerritoryStatusHistoryDto[] = await response.json();

                setChartData(data); // On garde la structure attendue
            } catch (error) {
                console.error("Erreur lors de la récupération des statistiques :", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const chartConfig = {
        available: {
            label: "Disponible",
            color: "hsl(var(--chart-1))",
        },
        assigned: {
            label: "Assigné",
            color: "hsl(var(--chart-2))",
        },
        pending: {
            label: "En attente",
            color: "hsl(var(--chart-3))",
        },
        late: {
            label: "Retard",
            color: "hsl(var(--chart-4))",
        },
    } satisfies ChartConfig;

    // Transformation des données pour correspondre aux clés utilisées par Recharts
    const formattedChartData = chartData.map((entry) => ({
        date: new Date(entry.date).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
        }), // Format "DD MMM"
        available: entry.availableTerritory || 0,
        assigned: entry.assignedTerritory || 0,
        pending: entry.pendingTerritory || 0,
        late: entry.lateTerritory || 0
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Statistiques des territoires</CardTitle>
                <CardDescription>Statistiques par date</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p>Chargement des statistiques...</p>
                ) : (
                    <ChartContainer config={chartConfig}>
                        <LineChart data={formattedChartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent hideLabel={true} />} />
                            <ChartLegend content={<ChartLegendContent />} />

                            <Line dataKey="available" type="monotone" stroke="var(--color-available)" strokeWidth={2} dot={true} />
                            <Line dataKey="assigned" type="monotone" stroke="var(--color-assigned)" strokeWidth={2} dot={true} />
                            <Line dataKey="pending" type="monotone" stroke="var(--color-pending)" strokeWidth={2} dot={true} />
                            <Line dataKey="late" type="monotone" stroke="var(--color-late)" strokeWidth={2} dot={true} />
                        </LineChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
};
