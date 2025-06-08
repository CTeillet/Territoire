import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authFetch } from "@/utils/auth-fetch";

// Types for statistics data
interface TerritoryStatistics {
    totalTerritories: number;
    assignedTerritories: number;
    availableTerritories: number;
    pendingTerritories: number;
}

interface TerritoryDistribution {
    cityName: string;
    count: number;
}

interface UnassignedStatistics {
    lessThan3Months: number;
    between3And6Months: number;
    between6And12Months: number;
    moreThan12Months: number;
}

interface AssignmentDurationByMonth {
    month: string;
    averageDuration: number;
}

// Interface for recent assignments
interface RecentAssignment {
    id: string;
    assignmentDate: string;
    returnDate?: string;
    person: {
        id: string;
        firstName: string;
        lastName: string;
    };
    territory: {
        territoryId: string;
        name: string;
        cityName: string;
    };
}

interface StatisticsState {
    territoryStats: TerritoryStatistics | null;
    territoryDistribution: TerritoryDistribution[];
    unassignedStats: UnassignedStatistics | null;
    assignmentDurationByMonth: AssignmentDurationByMonth[];
    overallAverageDuration: number | null;
    recentAssignments: RecentAssignment[];
    loading: boolean;
    error: string | null;
    lastFetched: {
        territoryStats: number | null;
        territoryDistribution: number | null;
        unassignedStats: number | null;
        assignmentDuration: number | null;
        recentAssignments: number | null;
    };
}

const initialState: StatisticsState = {
    territoryStats: null,
    territoryDistribution: [],
    unassignedStats: null,
    assignmentDurationByMonth: [],
    overallAverageDuration: null,
    recentAssignments: [],
    loading: false,
    error: null,
    lastFetched: {
        territoryStats: null,
        territoryDistribution: null,
        unassignedStats: null,
        assignmentDuration: null,
        recentAssignments: null,
    }
};

// Helper function to check if data should be fetched based on last fetch time
const shouldFetch = (lastFetched: number | null, maxAge = 5 * 60 * 1000) => {
    if (!lastFetched) return true;
    return Date.now() - lastFetched > maxAge;
};

// Thunk for fetching territory statistics
export const fetchTerritoryStatistics = createAsyncThunk(
    "statistics/fetchTerritoryStatistics",
    async (_, { rejectWithValue, getState }) => {
        const state = getState() as { statistics: StatisticsState };

        if (!shouldFetch(state.statistics.lastFetched.territoryStats)) {
            return state.statistics.territoryStats;
        }

        const response = await authFetch("/api/territoires/statistiques");

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des statistiques des territoires");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk for fetching territory distribution by city
export const fetchTerritoryDistribution = createAsyncThunk(
    "statistics/fetchTerritoryDistribution",
    async (_, { rejectWithValue, getState }) => {
        const state = getState() as { statistics: StatisticsState };

        if (!shouldFetch(state.statistics.lastFetched.territoryDistribution)) {
            return state.statistics.territoryDistribution;
        }

        const response = await authFetch("/api/territoires/statistiques/distribution-par-ville");

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération de la distribution des territoires");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk for fetching unassigned territories statistics
export const fetchUnassignedStatistics = createAsyncThunk(
    "statistics/fetchUnassignedStatistics",
    async (_, { rejectWithValue, getState }) => {
        const state = getState() as { statistics: StatisticsState };

        if (!shouldFetch(state.statistics.lastFetched.unassignedStats)) {
            return state.statistics.unassignedStats;
        }

        const response = await authFetch("/api/territoires/statistiques/non-assignes-depuis");

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des statistiques des territoires non assignés");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk for fetching assignment duration statistics
export const fetchAssignmentDurationStatistics = createAsyncThunk(
    "statistics/fetchAssignmentDurationStatistics",
    async (_, { rejectWithValue, getState }) => {
        const state = getState() as { statistics: StatisticsState };

        if (!shouldFetch(state.statistics.lastFetched.assignmentDuration)) {
            return {
                byMonth: state.statistics.assignmentDurationByMonth,
                overall: state.statistics.overallAverageDuration
            };
        }

        // Fetch monthly data
        const monthlyResponse = await authFetch("/api/territoires/statistiques/duree-moyenne-attribution/par-mois");

        if (!monthlyResponse.ok) {
            return rejectWithValue("Erreur lors de la récupération des statistiques de durée d'attribution par mois");
        }

        // Fetch overall data
        const overallResponse = await authFetch("/api/territoires/statistiques/duree-moyenne-attribution/global");

        if (!overallResponse.ok) {
            return rejectWithValue("Erreur lors de la récupération de la durée moyenne d'attribution globale");
        }

        try {
            const monthlyData = await monthlyResponse.json();
            const overallData = await overallResponse.json();

            return {
                byMonth: monthlyData,
                overall: overallData
            };
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk for fetching recent assignments
export const fetchRecentAssignments = createAsyncThunk(
    "statistics/fetchRecentAssignments",
    async (_, { rejectWithValue, getState }) => {
        const state = getState() as { statistics: StatisticsState };

        if (!shouldFetch(state.statistics.lastFetched.recentAssignments)) {
            return state.statistics.recentAssignments;
        }

        const response = await authFetch("/api/attributions/dernieres");

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des attributions récentes");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

const statisticsSlice = createSlice({
    name: 'statistics',
    initialState,
    reducers: {
        clearStatistics: (state) => {
            state.territoryStats = null;
            state.territoryDistribution = [];
            state.unassignedStats = null;
            state.assignmentDurationByMonth = [];
            state.overallAverageDuration = null;
            state.recentAssignments = [];
            state.lastFetched = {
                territoryStats: null,
                territoryDistribution: null,
                unassignedStats: null,
                assignmentDuration: null,
                recentAssignments: null,
            };
        }
    },
    extraReducers: (builder) => {
        builder
            // Territory Statistics
            .addCase(fetchTerritoryStatistics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTerritoryStatistics.fulfilled, (state, action) => {
                state.loading = false;
                state.territoryStats = action.payload;
                state.lastFetched.territoryStats = Date.now();
            })
            .addCase(fetchTerritoryStatistics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Territory Distribution
            .addCase(fetchTerritoryDistribution.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTerritoryDistribution.fulfilled, (state, action) => {
                state.loading = false;
                state.territoryDistribution = action.payload;
                state.lastFetched.territoryDistribution = Date.now();
            })
            .addCase(fetchTerritoryDistribution.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Unassigned Statistics
            .addCase(fetchUnassignedStatistics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUnassignedStatistics.fulfilled, (state, action) => {
                state.loading = false;
                state.unassignedStats = action.payload;
                state.lastFetched.unassignedStats = Date.now();
            })
            .addCase(fetchUnassignedStatistics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Assignment Duration Statistics
            .addCase(fetchAssignmentDurationStatistics.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAssignmentDurationStatistics.fulfilled, (state, action) => {
                state.loading = false;
                state.assignmentDurationByMonth = action.payload.byMonth;
                state.overallAverageDuration = action.payload.overall;
                state.lastFetched.assignmentDuration = Date.now();
            })
            .addCase(fetchAssignmentDurationStatistics.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Recent Assignments
            .addCase(fetchRecentAssignments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRecentAssignments.fulfilled, (state, action) => {
                state.loading = false;
                state.recentAssignments = action.payload;
                state.lastFetched.recentAssignments = Date.now();
            })
            .addCase(fetchRecentAssignments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export const { clearStatistics } = statisticsSlice.actions;
export default statisticsSlice.reducer;
