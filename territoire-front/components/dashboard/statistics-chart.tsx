import React, {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "../ui/card";
import {CartesianGrid, Line, LineChart, XAxis, YAxis, PieChart, Pie, Cell, Legend, Tooltip} from "recharts";
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
    const [territoriesNotAssigned, setTerritoriesNotAssigned] = useState<number>(0);
    const [totalTerritories, setTotalTerritories] = useState<number>(0);

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

        const fetchTerritoriesNotAssigned = async () => {
            try {
                const response = await authFetch("/api/territoires/statistiques/non-assignes-depuis");
                const count = await response.json();
                setTerritoriesNotAssigned(count);

                // Fetch total territories count
                const territoriesResponse = await authFetch("/api/territoires");
                const territories = await territoriesResponse.json();
                setTotalTerritories(territories.length);
            } catch (error) {
                console.error("Erreur lors de la récupération des territoires non assignés :", error);
            }
        };

        fetchData();
        fetchTerritoriesNotAssigned();
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

    // Prepare data for the pie chart
    const pieChartData = [
        { name: 'Territoires parcourus', value: totalTerritories - territoriesNotAssigned, fill: '#4CAF50' },
        { name: 'Territoires non parcourus', value: territoriesNotAssigned, fill: '#F44336' }
    ];

    const COLORS = ['#4CAF50', '#F44336'];

    return (
        <div className="space-y-6">
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

            <Card>
                <CardHeader>
                    <CardTitle>Territoires parcourus depuis le 01/09</CardTitle>
                    <CardDescription>Pourcentage des territoires parcourus depuis le 01/09</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    {loading ? (
                        <p>Chargement des statistiques...</p>
                    ) : (
                        <div style={{ width: '100%', height: 300 }}>
                            <PieChart width={400} height={300}>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
