"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/use-auth";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchTerritories } from "@/store/slices/territory-slice";
import {
  fetchNotVisitedTerritoryIds,
  fetchSchoolYearPeriods,
} from "@/store/slices/territory-statistics-slice";
import {
  EmptyState,
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";
import { Button } from "@/components/ui/button";
import { SchoolYearPeriodSelect } from "@/components/shared/school-year-period-select";
import { DataTable } from "@/components/territory/territory-data-table";
import { nonVisitedTerritoryColumns } from "@/components/territory/territory-data-columns";
import { NotVisitedSummary } from "@/components/territory/not-visited-summary";
import TerritoryMap from "@/components/territory/territory-map";
import { SchoolYearPeriod } from "@/models/school-year-period";
import { TerritoryCollection } from "@/models/territory";
import { TerritoryStatus } from "@/models/territory-status";
import { currentSchoolYear } from "@/lib/school-year";
import { formatLongDay } from "@/lib/dates";
import { compareNames } from "@/lib/utils";

// Jamais parcourus d'abord, puis du plus ancien parcours au plus récent (à égalité, par nom : ordre des données)
const DEFAULT_SORTING = [{ id: "lastVisitedOn", desc: false }];

// Sorti entre-temps : le territoire est en cours de parcours, il quitte la liste de la période en cours
const IN_CIRCULATION: TerritoryStatus[] = ["ASSIGNED", "LATE"];

export default function NonVisitedTerritoriesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const {
    territoriesGeojson,
    loading,
    error: territoriesError,
  } = useAppSelector((state) => state.territories);
  const { schoolYearPeriods, notVisited, notVisitedError } = useAppSelector(
    (state) => state.territoryStatistics
  );

  // Période choisie ; à défaut, l'année en cours (calculée comme le serveur en attendant la liste des périodes)
  const [chosenPeriod, setChosenPeriod] = useState<SchoolYearPeriod | null>(
    null
  );
  const period =
    chosenPeriod ??
    schoolYearPeriods.find((p) => p.current) ??
    currentSchoolYear();
  const periods = schoolYearPeriods.length > 0 ? schoolYearPeriods : [period];

  // Territoires retenus par les filtres du tableau (null : tous), seuls affichés sur la carte
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchTerritories());
    dispatch(fetchSchoolYearPeriods());
  }, [dispatch, isAuthenticated]);

  const { startDate, endDate } = period;
  const loadNotVisited = () =>
    dispatch(fetchNotVisitedTerritoryIds({ startDate, endDate }));
  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchNotVisitedTerritoryIds({ startDate, endDate }));
  }, [dispatch, isAuthenticated, startDate, endDate]);

  // Identifiants de la période affichée seulement : ceux d'une autre période ne valent plus
  const notVisitedIds =
    notVisited?.startDate === startDate && notVisited?.endDate === endDate
      ? notVisited.ids
      : null;

  const territories = useMemo(
    () => territoriesGeojson?.features.map((f) => f.properties) ?? [],
    [territoriesGeojson]
  );

  const isCurrent = period.current;
  const nonVisitedTerritories = useMemo(() => {
    if (!notVisitedIds) return null;
    const ids = new Set(notVisitedIds);
    return territories
      .filter(
        (t) =>
          ids.has(t.id) && !(isCurrent && IN_CIRCULATION.includes(t.status))
      )
      .sort((a, b) => compareNames(a.name, b.name));
  }, [territories, notVisitedIds, isCurrent]);

  const mapData = useMemo<TerritoryCollection | null>(() => {
    if (!territoriesGeojson || !nonVisitedTerritories) return null;
    const shown = new Set(visibleIds ?? nonVisitedTerritories.map((t) => t.id));
    return {
      ...territoriesGeojson,
      features: territoriesGeojson.features.filter((f) =>
        shown.has(f.properties.id)
      ),
    };
  }, [territoriesGeojson, nonVisitedTerritories, visibleIds]);

  const description = isCurrent
    ? `Territoires non parcourus depuis le ${formatLongDay(startDate)}, à attribuer avant le ${formatLongDay(endDate)}`
    : `Territoires non parcourus pendant la période scolaire ${period.label} (du ${formatLongDay(startDate)} au ${formatLongDay(endDate)})`;

  const loadError =
    (!territoriesGeojson && !loading && territoriesError) ||
    (!notVisitedIds && notVisitedError);

  const retry = () => {
    if (!territoriesGeojson) dispatch(fetchTerritories());
    loadNotVisited();
  };

  return (
    <PageContainer>
      <PageHeader
        title="Territoires non parcourus"
        description={description}
        actions={
          <SchoolYearPeriodSelect
            periods={periods}
            value={period}
            onChange={setChosenPeriod}
          />
        }
      />

      {loadError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Impossible de charger les territoires non parcourus"
          description={loadError}
        >
          <Button variant="outline" onClick={retry}>
            Réessayer
          </Button>
        </EmptyState>
      ) : // Rechargement des territoires : la liste déjà là reste affichée
      !territoriesGeojson || !nonVisitedTerritories ? (
        <LoadingState message="Chargement des territoires..." />
      ) : nonVisitedTerritories.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Aucun territoire non parcouru"
          description={
            isCurrent
              ? `Tous les territoires ont été parcourus depuis le ${formatLongDay(startDate)}.`
              : `Tous les territoires ont été parcourus pendant la période ${period.label}.`
          }
        />
      ) : (
        <>
          <NotVisitedSummary
            territories={territories}
            notVisited={nonVisitedTerritories}
            period={period}
          />
          {mapData && <TerritoryMap geoJsonData={mapData} fitToData />}
          <DataTable
            data={nonVisitedTerritories}
            columns={nonVisitedTerritoryColumns}
            tableId="non-visited-territories"
            exportFileName="territoires-non-parcourus"
            defaultSorting={DEFAULT_SORTING}
            onFilteredIdsChange={setVisibleIds}
          />
        </>
      )}
    </PageContainer>
  );
}
