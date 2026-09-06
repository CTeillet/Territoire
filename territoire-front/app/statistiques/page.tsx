"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchSchoolYearPeriods } from "@/store/slices/territory-slice";
import { StatisticsOverview } from "@/components/dashboard/statistics-overview";
import { AverageAssignmentDurationChart } from "@/components/dashboard/average-assignment-duration-chart";
import { TerritoryDistributionChart } from "@/components/dashboard/territory-distribution-chart";
import { StatisticsChart } from "@/components/dashboard/statistics-chart";
import TerritoryCoverageMap from "@/components/dashboard/territory-coverage-map";
import { TerritoryPeriodStatistics } from "@/components/dashboard/territory-period-statistics";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SchoolYearPeriod } from "@/models/school-year-period";
import { Calendar, BarChart3, Clock } from "lucide-react";

const StatistiquesPage = () => {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { schoolYearPeriods, statisticsLoading } = useAppSelector(state => state.territories);

    const [selectedPeriod, setSelectedPeriod] = useState<SchoolYearPeriod | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        dispatch(fetchSchoolYearPeriods());
    }, [dispatch]);

    useEffect(() => {
        if (schoolYearPeriods.length > 0 && !selectedPeriod) {
            // Default to the current school year period or first one
            const current = schoolYearPeriods.find(p => p.current) || schoolYearPeriods[0];
            setSelectedPeriod(current);
        }
    }, [schoolYearPeriods, selectedPeriod]);

    if (!isAuthenticated) return null;

    const handlePeriodChange = (startYearStr: string) => {
        const startYear = parseInt(startYearStr, 10);
        const period = schoolYearPeriods.find(p => p.startYear === startYear);
        if (period) {
            setSelectedPeriod(period);
        }
    };

    const formatDateFrench = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        Statistiques des Territoires
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Consultez l&apos;historique et les statistiques par période scolaire (du 1er septembre au 31 août)
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <label htmlFor="period-select" className="text-sm font-medium whitespace-nowrap">
                        Période scolaire :
                    </label>
                    <Select
                        value={selectedPeriod ? String(selectedPeriod.startYear) : undefined}
                        onValueChange={handlePeriodChange}
                        disabled={schoolYearPeriods.length === 0}
                    >
                        <SelectTrigger id="period-select" className="w-[200px] bg-background">
                            <SelectValue placeholder="Sélectionner une période" />
                        </SelectTrigger>
                        <SelectContent>
                            {schoolYearPeriods.map((period) => (
                                <SelectItem key={period.startYear} value={String(period.startYear)}>
                                    {period.label} {period.current ? "(En cours)" : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedPeriod && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 py-2 px-4 rounded-md border border-primary/20">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>
                        Période sélectionnée : <strong className="text-foreground">{selectedPeriod.label}</strong> (du {formatDateFrench(selectedPeriod.startDate)} au {formatDateFrench(selectedPeriod.endDate)})
                        {selectedPeriod.current && <span className="ml-2 font-semibold text-primary">(Période en cours)</span>}
                    </span>
                </div>
            )}

            {selectedPeriod ? (
                <>
                    <StatisticsOverview
                        startDate={selectedPeriod.startDate}
                        endDate={selectedPeriod.endDate}
                        periodLabel={selectedPeriod.label}
                        isCurrentPeriod={selectedPeriod.current}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AverageAssignmentDurationChart
                            startDate={selectedPeriod.startDate}
                            endDate={selectedPeriod.endDate}
                        />
                        <TerritoryDistributionChart
                            startDate={selectedPeriod.startDate}
                            endDate={selectedPeriod.endDate}
                            periodLabel={selectedPeriod.label}
                        />
                    </div>

                    <TerritoryPeriodStatistics
                        startDate={selectedPeriod.startDate}
                        endDate={selectedPeriod.endDate}
                        periodLabel={selectedPeriod.label}
                    />

                    <Card className="shadow-md border-0">
                        <CardHeader>
                            <CardTitle>Carte de couverture des territoires</CardTitle>
                            <CardDescription>
                                Visualisez directement les territoires parcourus et non parcourus pour la période {selectedPeriod.label}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TerritoryCoverageMap
                                startDate={selectedPeriod.startDate}
                                endDate={selectedPeriod.endDate}
                            />
                        </CardContent>
                    </Card>

                    <StatisticsChart
                        startDate={selectedPeriod.startDate}
                        endDate={selectedPeriod.endDate}
                        periodLabel={selectedPeriod.label}
                    />
                </>
            ) : statisticsLoading ? (
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Chargement des statistiques...</p>
                </div>
            ) : null}
        </div>
    );
};

export default StatistiquesPage;
