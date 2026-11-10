import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TerritoryCoverageMap } from "@/models/territory";
import { Assignment } from "@/models/assignment";
import { TerritoryStatusHistoryDto } from "@/models/territory-status-history";
import { SchoolYearPeriod } from "@/models/school-year-period";
import { TerritoryStatisticsBreakdown } from "@/models/campaign-statistics";
import { createApiThunk, thunkApi, withQuery } from "@/utils/thunk-request";

/**
 * Statistiques des territoires (page Statistiques et tableau de bord) : historique des statuts, couverture, durées
 * d'attribution, répartition par ville, dernières attributions. Séparées de la liste des territoires
 * (territory-slice), qu'elles ne modifient pas.
 */

interface TerritoryDistribution {
  cityName: string;
  territoryCount: number;
  percentage: number;
}

interface AverageAssignmentDuration {
  period: string;
  averageDuration: number;
}

/** Période facultative des statistiques (dates AAAA-MM-JJ). */
export type PeriodParams = { startDate?: string; endDate?: string } | undefined;

type TerritoryStatisticsState = {
  territoryStatusHistory: TerritoryStatusHistoryDto[];
  territoriesNotAssignedSince: number;
  territoryCoverageGeojson: TerritoryCoverageMap | null;
  loadingCoverageMap: boolean;
  averageAssignmentDurationByMonth: AverageAssignmentDuration[];
  overallAverageAssignmentDuration: number | null;
  territoryDistributionByCity: TerritoryDistribution[];
  periodStatistics: TerritoryStatisticsBreakdown | null;
  latestAssignments: Assignment[];
  schoolYearPeriods: SchoolYearPeriod[];
  periodAssignments: Assignment[];
  statisticsLoading: boolean;
  error: string | null;
};

const initialState: TerritoryStatisticsState = {
  territoryStatusHistory: [],
  territoriesNotAssignedSince: 0,
  territoryCoverageGeojson: null,
  loadingCoverageMap: false,
  averageAssignmentDurationByMonth: [],
  overallAverageAssignmentDuration: null,
  territoryDistributionByCity: [],
  periodStatistics: null,
  latestAssignments: [],
  schoolYearPeriods: [],
  periodAssignments: [],
  statisticsLoading: false,
  error: null,
};

const STATISTICS_URL = "/api/territoires/statistiques";

/** Statistique d'une période : même forme pour toutes, seuls l'adresse et le message changent. */
const periodThunk = <T>(type: string, url: string, fallback: string) =>
  createApiThunk(type, (params: PeriodParams, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<T>(
      withQuery(url, {
        startDate: params?.startDate,
        endDate: params?.endDate,
      }),
      fallback
    )
  );

export const fetchTerritoryStatusHistory = periodThunk<
  TerritoryStatusHistoryDto[]
>(
  "territories/fetchTerritoryStatusHistory",
  STATISTICS_URL,
  "Erreur lors de la récupération des statistiques de territoire"
);

export const fetchTerritoriesNotAssignedSince = periodThunk<number>(
  "territories/fetchTerritoriesNotAssignedSince",
  `${STATISTICS_URL}/non-assignes-depuis`,
  "Erreur lors de la récupération des territoires non assignés"
);

export const fetchTerritoryCoverageMap = periodThunk<TerritoryCoverageMap>(
  "territories/fetchTerritoryCoverageMap",
  `${STATISTICS_URL}/carte-couverture`,
  "Erreur lors de la récupération de la carte de couverture des territoires"
);

export const fetchAverageAssignmentDurationByMonth = periodThunk<
  AverageAssignmentDuration[]
>(
  "territories/fetchAverageAssignmentDurationByMonth",
  `${STATISTICS_URL}/duree-moyenne-attribution/par-mois`,
  "Erreur lors de la récupération de la durée moyenne d'attribution par mois"
);

export const fetchOverallAverageAssignmentDuration = periodThunk<number>(
  "territories/fetchOverallAverageAssignmentDuration",
  `${STATISTICS_URL}/duree-moyenne-attribution/globale`,
  "Erreur lors de la récupération de la durée moyenne globale d'attribution"
);

export const fetchTerritoryDistributionByCity = periodThunk<
  TerritoryDistribution[]
>(
  "territories/fetchTerritoryDistributionByCity",
  `${STATISTICS_URL}/distribution-par-ville`,
  "Erreur lors de la récupération de la distribution des territoires par ville"
);

export const fetchTerritoryPeriodStatistics =
  periodThunk<TerritoryStatisticsBreakdown>(
    "territories/fetchTerritoryPeriodStatistics",
    `${STATISTICS_URL}/resume-periode`,
    "Erreur lors de la récupération des statistiques de la période"
  );

export const fetchAssignmentsInPeriod = periodThunk<Assignment[]>(
  "territories/fetchAssignmentsInPeriod",
  "/api/attributions/periode",
  "Erreur lors de la récupération des attributions de la période"
);

export const fetchLatestAssignments = createApiThunk(
  "territories/fetchLatestAssignments",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Assignment[]>(
      "/api/attributions/dernieres",
      "Erreur lors de la récupération des dernières attributions"
    )
);

export const fetchSchoolYearPeriods = createApiThunk(
  "territories/fetchSchoolYearPeriods",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<SchoolYearPeriod[]>(
      `${STATISTICS_URL}/periodes`,
      "Erreur lors de la récupération des périodes scolaires"
    )
);

/** Champs de l'état remplis par chaque statistique. */
type ValueKey = Exclude<
  keyof TerritoryStatisticsState,
  "loadingCoverageMap" | "statisticsLoading" | "error"
>;

const territoryStatisticsSlice = createSlice({
  name: "territoryStatistics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Chaque statistique : chargement commun, valeur rangée dans son champ, erreur commune
    // (addCase seulement : RTK refuse un addCase après un addMatcher)
    const track = (
      thunk: {
        pending: { type: string };
        fulfilled: { type: string };
        rejected: { type: string };
      },
      key: ValueKey
    ) => {
      builder
        .addCase(thunk.pending.type, (state) => {
          state.statisticsLoading = true;
          state.error = null;
        })
        .addCase(
          thunk.fulfilled.type,
          (state, action: PayloadAction<unknown>) => {
            state.statisticsLoading = false;
            (state as unknown as Record<ValueKey, unknown>)[key] =
              action.payload;
          }
        )
        .addCase(
          thunk.rejected.type,
          (state, action: PayloadAction<unknown>) => {
            state.statisticsLoading = false;
            state.error = action.payload as string;
          }
        );
    };

    // La carte de couverture a son propre indicateur de chargement
    builder
      .addCase(fetchTerritoryCoverageMap.pending, (state) => {
        state.loadingCoverageMap = true;
        state.error = null;
      })
      .addCase(fetchTerritoryCoverageMap.fulfilled, (state, action) => {
        state.loadingCoverageMap = false;
        state.territoryCoverageGeojson = action.payload;
      })
      .addCase(fetchTerritoryCoverageMap.rejected, (state, action) => {
        state.loadingCoverageMap = false;
        state.error = action.payload as string;
      });

    track(fetchTerritoryStatusHistory, "territoryStatusHistory");
    track(fetchTerritoriesNotAssignedSince, "territoriesNotAssignedSince");
    track(
      fetchAverageAssignmentDurationByMonth,
      "averageAssignmentDurationByMonth"
    );
    track(
      fetchOverallAverageAssignmentDuration,
      "overallAverageAssignmentDuration"
    );
    track(fetchTerritoryDistributionByCity, "territoryDistributionByCity");
    track(fetchTerritoryPeriodStatistics, "periodStatistics");
    track(fetchLatestAssignments, "latestAssignments");
    track(fetchSchoolYearPeriods, "schoolYearPeriods");
    track(fetchAssignmentsInPeriod, "periodAssignments");
  },
});

export default territoryStatisticsSlice.reducer;
