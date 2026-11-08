import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchTerritories } from "@/store/slices/territory-slice";
import {
  fetchTerritoriesNotAssignedSince,
  fetchTerritoryStatusHistory,
} from "@/store/slices/territory-statistics-slice";

interface StatisticsChartProps {
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
}

export const StatisticsChart: React.FC<StatisticsChartProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const dispatch = useAppDispatch();
  const {
    territoryStatusHistory,
    territoriesNotAssignedSince,
    statisticsLoading,
  } = useSelector((state: RootState) => state.territoryStatistics);
  const territoriesGeojson = useSelector(
    (state: RootState) => state.territories.territoriesGeojson
  );

  const totalTerritories = territoriesGeojson
    ? territoriesGeojson.features.length
    : 0;

  useEffect(() => {
    // Fetch territory status history
    dispatch(
      fetchTerritoryStatusHistory(
        startDate || endDate ? { startDate, endDate } : undefined
      )
    );

    // Fetch territories not assigned since
    dispatch(
      fetchTerritoriesNotAssignedSince(
        startDate || endDate ? { startDate, endDate } : undefined
      )
    );

    // Fetch all territories if not already loaded
    if (!territoriesGeojson) {
      dispatch(fetchTerritories());
    }
  }, [dispatch, territoriesGeojson, startDate, endDate]);

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
    late: entry.lateTerritory || 0,
  }));

  // Prepare data for the pie chart
  const pieChartData = [
    {
      name: "Territoires parcourus",
      value: totalTerritories - territoriesNotAssignedSince,
      count: totalTerritories - territoriesNotAssignedSince,
      fill: "hsl(var(--chart-2))", // Using the same color as "Assigné" from chartConfig
    },
    {
      name: "Territoires non parcourus",
      value: territoriesNotAssignedSince,
      count: territoriesNotAssignedSince,
      fill: "hsl(var(--chart-4))", // Using the same color as "Retard" from chartConfig
    },
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
              // Un point par jour rendait les courbes illisibles : points au survol seulement,
              // dates espacées et graphique plus haut sur téléphone
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-64 w-full md:h-80"
              >
                <LineChart
                  data={formattedChartData}
                  margin={{ left: 0, right: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={24}
                  />
                  <YAxis
                    width={36}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />

                  <Line
                    dataKey="available"
                    type="monotone"
                    stroke="var(--color-available)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="assigned"
                    type="monotone"
                    stroke="var(--color-assigned)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="pending"
                    type="monotone"
                    stroke="var(--color-pending)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="late"
                    type="monotone"
                    stroke="var(--color-late)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="col-span-1 h-full">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>
              {periodLabel
                ? `Territoires parcourus (${periodLabel})`
                : "Territoires parcourus depuis le 01/09"}
            </CardTitle>
            <CardDescription>
              {periodLabel
                ? `Pourcentage des territoires parcourus (${periodLabel})`
                : "Pourcentage des territoires parcourus depuis le 01/09"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center flex-grow">
            {statisticsLoading ? (
              <p>Chargement des statistiques...</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieChartData.map((entry, index) => ({
                      ...entry,
                      fill: COLORS[index % COLORS.length],
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    innerRadius="45%"
                    outerRadius="70%"
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                    animationBegin={0}
                    animationDuration={1000}
                    label={({ percent, payload }) =>
                      `${((percent ?? 0) * 100).toFixed(0)}% (${payload?.count})`
                    }
                  />
                  <Tooltip
                    formatter={(value, name) => [`${value} territoires`, name]}
                    contentStyle={{
                      borderRadius: "8px",
                      padding: "10px",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
