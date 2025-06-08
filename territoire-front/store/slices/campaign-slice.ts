import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import {Campaign} from "@/models/campaign";
import {authFetch} from "@/utils/auth-fetch";
import {SimplifiedTerritory} from "@/models/territory";
import {CampaignStatistics} from "@/models/campaign-statistics";
import { toast } from "sonner";

const BASE_URL = "/api/campagnes";

interface CampaignState {
    campaigns: Campaign[];
    currentCampaign: Campaign | null;
    campaignStatistics: CampaignStatistics | null;
    loading: boolean;
    deleting: boolean;
    creating: boolean;
    updating: boolean;
    closing: boolean;
    loadingStatistics: boolean;
    error: string | null;
    isFetchingCampaigns: boolean;
    isFetchingCampaign: boolean;
}

const initialState: CampaignState = {
    campaigns: [],
    currentCampaign: null,
    campaignStatistics: null,
    loading: false,
    deleting: false,
    creating: false,
    updating: false,
    closing: false,
    loadingStatistics: false,
    error: null,
    isFetchingCampaigns: false,
    isFetchingCampaign: false,
};

// Thunk pour récupérer toutes les campagnes
export const fetchCampaigns = createAsyncThunk(
    "campaigns/fetchCampaigns",
    async (_, { rejectWithValue }) => {
        const response = await authFetch(BASE_URL);

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des campagnes");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as { campaigns: CampaignState };
            if (state.campaigns.isFetchingCampaigns) {
                console.log("Une récupération des campagnes est déjà en cours. Opération annulée.");
                return false;
            }
            return true;
        }
    }
);

// Thunk pour récupérer une campagne spécifique
export const fetchCampaign = createAsyncThunk(
    "campaigns/fetchCampaign",
    async (campaignId: string, { rejectWithValue }) => {
        const response = await authFetch(`${BASE_URL}/${campaignId}`);

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération de la campagne");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as { campaigns: CampaignState };
            if (state.campaigns.isFetchingCampaign) {
                console.log("Une récupération de campagne est déjà en cours. Opération annulée.");
                return false;
            }
            return true;
        }
    }
);

// Thunk pour créer une campagne
export const createCampaign = createAsyncThunk(
    "campaigns/createCampaign",
    async (newCampaign: Partial<Campaign>, { rejectWithValue }) => {
        const response = await authFetch(BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCampaign),
        });

        if (!response.ok) {
            return rejectWithValue("Échec de la création de la campagne");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk pour créer une campagne avec les territoires restants d'une campagne précédente
export const createCampaignWithRemainingTerritories = createAsyncThunk(
    "campaigns/createCampaignWithRemainingTerritories",
    async ({ previousCampaignId, newCampaign }: { previousCampaignId: string, newCampaign: Partial<Campaign> }, { rejectWithValue }) => {
        const response = await authFetch(`${BASE_URL}/avec-territoires-restants/${previousCampaignId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCampaign),
        });

        if (!response.ok) {
            return rejectWithValue("Échec de la création de la campagne avec territoires restants");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk pour mettre à jour les territoires restants d'une campagne
export const updateRemainingTerritories = createAsyncThunk(
    "campaigns/updateRemainingTerritories",
    async ({ campaignId, territories }: { campaignId: string, territories: SimplifiedTerritory[] }, { rejectWithValue }) => {
        const response = await authFetch(`${BASE_URL}/${campaignId}/territoires-restants`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(territories),
        });

        if (!response.ok) {
            return rejectWithValue("Échec de la mise à jour des territoires restants");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk pour clôturer une campagne
export const closeCampaign = createAsyncThunk(
    "campaigns/closeCampaign",
    async (campaignId: string, { rejectWithValue }) => {
        const response = await authFetch(`${BASE_URL}/${campaignId}/fermer`, {
            method: "PUT",
        });

        if (!response.ok) {
            return rejectWithValue("Échec de la clôture de la campagne");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

// Thunk pour supprimer une campagne
export const deleteCampaign = createAsyncThunk(
    "campaigns/deleteCampaign",
    async (campaignId: string, { rejectWithValue }) => {
        const response = await authFetch(`${BASE_URL}/${campaignId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            return rejectWithValue("Échec de la suppression de la campagne");
        }

        return campaignId;
    }
);

// Thunk pour récupérer les statistiques d'une campagne
export const fetchCampaignStatistics = createAsyncThunk(
    "campaigns/fetchCampaignStatistics",
    async (campaignId: string, { rejectWithValue }) => {
        const response = await authFetch(`${BASE_URL}/${campaignId}/statistiques`);

        if (!response.ok) {
            return rejectWithValue("Erreur lors de la récupération des statistiques de la campagne");
        }

        try {
            return await response.json();
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "Une erreur inconnue s'est produite");
        }
    }
);

const campaignSlice = createSlice({
    name: 'campaigns',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Récupération de toutes les campagnes
            .addCase(fetchCampaigns.pending, (state) => {
                state.loading = true;
                state.isFetchingCampaigns = true;
                state.error = null;
            })
            .addCase(fetchCampaigns.fulfilled, (state, action) => {
                state.loading = false;
                state.isFetchingCampaigns = false;
                state.campaigns = action.payload;
            })
            .addCase(fetchCampaigns.rejected, (state, action) => {
                state.loading = false;
                state.isFetchingCampaigns = false;
                state.error = action.payload as string;
                toast.error(state.error || "Erreur lors de la récupération des campagnes");
            })

            // Récupération d'une campagne spécifique
            .addCase(fetchCampaign.pending, (state) => {
                state.loading = true;
                state.isFetchingCampaign = true;
                state.error = null;
            })
            .addCase(fetchCampaign.fulfilled, (state, action) => {
                state.loading = false;
                state.isFetchingCampaign = false;
                state.currentCampaign = action.payload;
            })
            .addCase(fetchCampaign.rejected, (state, action) => {
                state.loading = false;
                state.isFetchingCampaign = false;
                state.error = action.payload as string;
                toast.error(state.error || "Erreur lors de la récupération de la campagne");
            })

            // Création d'une campagne
            .addCase(createCampaign.pending, (state) => {
                state.creating = true;
                state.error = null;
            })
            .addCase(createCampaign.fulfilled, (state, action) => {
                state.creating = false;
                state.campaigns.push(action.payload);
            })
            .addCase(createCampaign.rejected, (state, action) => {
                state.creating = false;
                state.error = action.payload as string;
                toast.error(state.error || "Échec de la création de la campagne");
            })

            // Création d'une campagne avec territoires restants
            .addCase(createCampaignWithRemainingTerritories.pending, (state) => {
                state.creating = true;
                state.error = null;
            })
            .addCase(createCampaignWithRemainingTerritories.fulfilled, (state, action) => {
                state.creating = false;
                state.campaigns.push(action.payload);
            })
            .addCase(createCampaignWithRemainingTerritories.rejected, (state, action) => {
                state.creating = false;
                state.error = action.payload as string;
                toast.error(state.error || "Échec de la création de la campagne avec territoires restants");
            })

            // Mise à jour des territoires restants
            .addCase(updateRemainingTerritories.pending, (state) => {
                state.updating = true;
                state.error = null;
            })
            .addCase(updateRemainingTerritories.fulfilled, (state, action) => {
                state.updating = false;
                state.currentCampaign = action.payload;

                // Mettre à jour la campagne dans la liste des campagnes si elle existe
                const index = state.campaigns.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.campaigns[index] = action.payload;
                }
            })
            .addCase(updateRemainingTerritories.rejected, (state, action) => {
                state.updating = false;
                state.error = action.payload as string;
                toast.error(state.error || "Échec de la mise à jour des territoires restants");
            })

            // Clôture d'une campagne
            .addCase(closeCampaign.pending, (state) => {
                state.closing = true;
                state.error = null;
            })
            .addCase(closeCampaign.fulfilled, (state, action) => {
                state.closing = false;
                state.currentCampaign = action.payload;

                // Mettre à jour la campagne dans la liste des campagnes si elle existe
                const index = state.campaigns.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.campaigns[index] = action.payload;
                }
            })
            .addCase(closeCampaign.rejected, (state, action) => {
                state.closing = false;
                state.error = action.payload as string;
                toast.error(state.error || "Échec de la clôture de la campagne");
            })

            // Suppression d'une campagne
            .addCase(deleteCampaign.pending, (state) => {
                state.deleting = true;
                state.error = null;
            })
            .addCase(deleteCampaign.fulfilled, (state, action) => {
                state.deleting = false;
                state.campaigns = state.campaigns.filter(campaign => campaign.id !== action.payload);
                if (state.currentCampaign && state.currentCampaign.id === action.payload) {
                    state.currentCampaign = null;
                }
            })
            .addCase(deleteCampaign.rejected, (state, action) => {
                state.deleting = false;
                state.error = action.payload as string;
                toast.error(state.error || "Échec de la suppression de la campagne");
            })

            // Récupération des statistiques d'une campagne
            .addCase(fetchCampaignStatistics.pending, (state) => {
                state.loadingStatistics = true;
                state.error = null;
            })
            .addCase(fetchCampaignStatistics.fulfilled, (state, action) => {
                state.loadingStatistics = false;
                state.campaignStatistics = action.payload;
            })
            .addCase(fetchCampaignStatistics.rejected, (state, action) => {
                state.loadingStatistics = false;
                state.error = action.payload as string;
                toast.error(state.error || "Erreur lors de la récupération des statistiques de la campagne");
            });
    },
});

export default campaignSlice.reducer;
