import React, {useEffect} from "react";
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
import {useSelector} from "react-redux";
import {RootState, useAppDispatch} from "@/store/store";
import {fetchTerritories, fetchTerritoriesNotAssignedSince, fetchTerritoryStatusHistory} from "@/store/slices/territory-slice";

export const StatisticsChart: React.FC = () => {
    const dispatch = useAppDispatch();
    const { 
        territoryStatusHistory, 
        territoriesNotAssignedSince, 
        statisticsLoading,
        territoriesGeojson
    } = useSelector((state: RootState) => state.territories);

    const totalTerritories = territoriesGeojson ? territoriesGeojson.features.length : 0;

    useEffect(() => {
        // Fetch territory status history
        dispatch(fetchTerritoryStatusHistory());

        // Fetch territories not assigned since
        dispatch(fetchTerritoriesNotAssignedSince());

        // Fetch all territories if not already loaded
        if (!territoriesGeojson) {
            dispatch(fetchTerritories());
        }
    }, [dispatch, territoriesGeojson]);

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
    const formattedChartData = territoryStatusHistory.map((entry) => ({
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
        { 
            name: 'Territoires parcourus', 
            value: totalTerritories - territoriesNotAssignedSince, 
            count: totalTerritories - territoriesNotAssignedSince,
            fill: "hsl(var(--chart-2))" // Using the same color as "Assigné" from chartConfig
        },
        { 
            name: 'Territoires non parcourus', 
            value: territoriesNotAssignedSince, 
            count: territoriesNotAssignedSince,
            fill: "hsl(var(--chart-4))" // Using the same color as "Retard" from chartConfig
        }
    ];

    const COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))"];

    return (
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
            <div className="col-span-1 2xl:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Statistiques des territoires</CardTitle>
                        <CardDescription>Statistiques par date</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statisticsLoading ? (
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
            </div>

            <div className="col-span-1 h-full">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Territoires parcourus depuis le 01/09</CardTitle>
                        <CardDescription>Pourcentage des territoires parcourus depuis le 01/09</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center flex-grow">
                        {statisticsLoading ? (
                            <p>Chargement des statistiques...</p>
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <PieChart width={400} height={400}>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        innerRadius={60}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                        paddingAngle={2}
                                        animationBegin={0}
                                        animationDuration={1000}
                                        label={({ percent, count }) => `${(percent * 100).toFixed(0)}% (${count})`}
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value, name) => [`${value} territoires`, name]}
                                        contentStyle={{ borderRadius: '8px', padding: '10px', border: '1px solid var(--border)' }}
                                    />
                                    <Legend 
                                        layout="horizontal" 
                                        verticalAlign="bottom" 
                                        align="center"
                                        wrapperStyle={{ paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
