"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchSchoolYearPeriods } from "@/store/slices/territory-statistics-slice";
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
import { SchoolYearPeriod } from "@/models/school-year-period";
import { Clock } from "lucide-react";
import { SchoolYearPeriodSelect } from "@/components/shared/school-year-period-select";
import {
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";

const StatistiquesPage = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { schoolYearPeriods, statisticsLoading } = useAppSelector(
    (state) => state.territoryStatistics
  );

  // Période choisie dans la liste ; à défaut, l'année en cours (ou la première)
  const [chosenPeriod, setSelectedPeriod] = useState<SchoolYearPeriod | null>(
    null
  );
  const selectedPeriod =
    chosenPeriod ??
    schoolYearPeriods.find((p) => p.current) ??
    schoolYearPeriods[0] ??
    null;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    dispatch(fetchSchoolYearPeriods());
  }, [dispatch]);

  if (!isAuthenticated) return null;

  const formatDateFrench = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Statistiques"
        description="Consultez l'historique et les statistiques par période scolaire (du 1er septembre au 31 août)"
        actions={
          <SchoolYearPeriodSelect
            periods={schoolYearPeriods}
            value={selectedPeriod}
            onChange={setSelectedPeriod}
          />
        }
      />

      {selectedPeriod && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 py-2 px-4 rounded-md border border-primary/20">
          <Clock className="h-4 w-4 text-primary" />
          <span>
            Période sélectionnée :{" "}
            <strong className="text-foreground">{selectedPeriod.label}</strong>{" "}
            (du {formatDateFrench(selectedPeriod.startDate)} au{" "}
            {formatDateFrench(selectedPeriod.endDate)})
            {selectedPeriod.current && (
              <span className="ml-2 font-semibold text-primary">
                (Période en cours)
              </span>
            )}
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

          <Card>
            <CardHeader>
              <CardTitle>Carte de couverture des territoires</CardTitle>
              <CardDescription>
                Visualisez directement les territoires parcourus et non
                parcourus pour la période {selectedPeriod.label}
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
        <LoadingState message="Chargement des statistiques..." />
      ) : null}
    </PageContainer>
  );
};

export default StatistiquesPage;
