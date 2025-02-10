import React from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "../ui/card";
import {CartesianGrid, Line, LineChart, XAxis} from "recharts";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";


export const StatisticsChart: React.FC = () => {
    const chartConfig = {
        available: {
            label: "Available",
            color: "hsl(var(--chart-1))",
        },
        assigned: {
            label: "Assigned",
            color: "hsl(var(--chart-2))",
        },
        pending: {
            label: "Pending",
            color: "hsl(var(--chart-3))",
        },
        late: {
            label: "Late",
            color: "hsl(var(--chart-4))",
        },
    } satisfies ChartConfig;
    const chartData = [
        { week: 1, available: 186, assigned: 80, pending: 100, late: 5 },
        { week: 2, available: 305, assigned: 200, pending: 120, late: 5 },
        { week: 3, available: 237, assigned: 120, pending: 50, late: 5 },
        { week: 4, available: 73, assigned: 190, pending: 140, late: 5 },
        { week: 5, available: 209, assigned: 130, pending: 90, late: 5 },
        { week: 6, available: 214, assigned: 140, pending: 100, late: 5 },
    ];
    return (
        <Card>
            <CardHeader>
                <CardTitle>Statistiques des territoires</CardTitle>
                <CardDescription>Statistiques par semaine</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <LineChart
                        accessibilityLayer
                        data={chartData}
                    >
                        <CartesianGrid vertical={false}/>
                        <XAxis
                            dataKey="week"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => value + " sem."}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent/>}/>
                        <Line
                            dataKey="available"
                            type="monotone"
                            stroke="var(--color-available)"
                            strokeWidth={2}
                            dot={true}
                        />
                        <Line
                            dataKey="assigned"
                            type="monotone"
                            stroke="var(--color-assigned)"
                            strokeWidth={2}
                            dot={true}
                        />
                        <Line
                            dataKey="pending"
                            type="monotone"
                            stroke="var(--color-pending)"
                            strokeWidth={2}
                            dot={true}
                        />
                        <Line
                            dataKey="late"
                            type="monotone"
                            stroke="var(--color-late)"
                            strokeWidth={2}
                            dot={true}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>

        </Card>
    );
};
