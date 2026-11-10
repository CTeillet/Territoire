import { Campaign, CampaignMap } from "@/models/campaign";
import { authFetch } from "@/utils/auth-fetch";
import { apiErrorMessage } from "@/utils/api-error";
import { SimplifiedTerritory } from "@/models/territory";
import { CampaignStatistics } from "@/models/campaign-statistics";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { createSlice } from "@reduxjs/toolkit";
import { createApiThunk, jsonBody, thunkApi } from "@/utils/thunk-request";

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
  loadingMap: boolean;
  currentCampaignGeoJson: CampaignMap | null;
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
  loadingMap: false,
  currentCampaignGeoJson: null,
  error: null,
  isFetchingCampaigns: false,
  isFetchingCampaign: false,
};

// Thunk pour récupérer toutes les campagnes
export const fetchCampaigns = createApiThunk(
  "campaigns/fetchCampaigns",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Campaign[]>(
      BASE_URL,
      "Erreur lors de la récupération des campagnes"
    ),
  {
    condition: (_, { getState }) =>
      !(getState() as { campaigns: CampaignState }).campaigns
        .isFetchingCampaigns,
  }
);

// Thunk pour récupérer une campagne spécifique
export const fetchCampaign = createApiThunk(
  "campaigns/fetchCampaign",
  (campaignId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Campaign>(
      `${BASE_URL}/${campaignId}`,
      "Erreur lors de la récupération de la campagne"
    ),
  {
    condition: (_, { getState }) =>
      !(getState() as { campaigns: CampaignState }).campaigns
        .isFetchingCampaign,
  }
);

// Thunk pour créer une campagne
export const createCampaign = createApiThunk(
  "campaigns/createCampaign",
  (newCampaign: Partial<Campaign>, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Campaign>(
      BASE_URL,
      "Échec de la création de la campagne",
      jsonBody("POST", newCampaign)
    )
);

// Thunk pour créer une campagne avec les territoires restants d'une campagne précédente
export const createCampaignWithRemainingTerritories = createApiThunk(
  "campaigns/createCampaignWithRemainingTerritories",
  (
    {
      previousCampaignId,
      newCampaign,
    }: { previousCampaignId: string; newCampaign: Partial<Campaign> },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<Campaign>(
      `${BASE_URL}/avec-territoires-restants/${previousCampaignId}`,
      "Échec de la création de la campagne avec territoires restants",
      jsonBody("POST", newCampaign)
    )
);

// Thunk pour mettre à jour les territoires restants d'une campagne
export const updateRemainingTerritories = createApiThunk(
  "campaigns/updateRemainingTerritories",
  (
    {
      campaignId,
      territories,
    }: { campaignId: string; territories: SimplifiedTerritory[] },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<Campaign>(
      `${BASE_URL}/${campaignId}/territoires-restants`,
      "Échec de la mise à jour des territoires restants",
      jsonBody("PUT", territories)
    )
);

// Thunk pour clôturer une campagne
export const closeCampaign = createApiThunk(
  "campaigns/closeCampaign",
  (campaignId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<Campaign>(
      `${BASE_URL}/${campaignId}/fermer`,
      "Échec de la clôture de la campagne",
      { method: "PUT" }
    )
);

// Thunk pour supprimer une campagne
export const deleteCampaign = createApiThunk(
  "campaigns/deleteCampaign",
  async (campaignId: string, { rejectWithValue }) =>
    (await thunkApi(rejectWithValue).noContent(
      `${BASE_URL}/${campaignId}`,
      "Échec de la suppression de la campagne",
      { method: "DELETE" }
    )) ?? campaignId
);

// Thunk pour récupérer les statistiques d'une campagne
export const fetchCampaignStatistics = createApiThunk(
  "campaigns/fetchCampaignStatistics",
  (campaignId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<CampaignStatistics>(
      `${BASE_URL}/${campaignId}/statistiques`,
      "Erreur lors de la récupération des statistiques de la campagne"
    ),
  {
    condition: (_, { getState }) =>
      !(getState() as { campaigns: CampaignState }).campaigns.loadingStatistics,
  }
);

// Thunk pour récupérer le GeoJSON de la campagne pour la carte
export const fetchCampaignMap = createApiThunk(
  "campaigns/fetchCampaignMap",
  (campaignId: string, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<CampaignMap>(
      `${BASE_URL}/${campaignId}/geojson`,
      "Erreur lors de la récupération du GeoJSON de la campagne"
    ),
  {
    condition: (_, { getState }) =>
      !(getState() as { campaigns: CampaignState }).campaigns.loadingMap,
  }
);

// Thunk pour exporter les statistiques d'une campagne en Excel
export const exportCampaignStatistics = createApiThunk(
  "campaigns/exportCampaignStatistics",
  async (
    { campaignId, campaignName }: { campaignId: string; campaignName: string },
    { rejectWithValue }
  ) => {
    const message = "Erreur lors de l'exportation des statistiques";
    try {
      const response = await authFetch(
        `${BASE_URL}/${campaignId}/export/excel`
      );
      if (!response.ok) {
        return rejectWithValue(await apiErrorMessage(response, message));
      }
      const blob = await response.blob();
      const fileName = `Statistiques_Campagne_${campaignName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(blob, fileName);
      return campaignId;
    } catch {
      return rejectWithValue(message);
    }
  }
);

const campaignSlice = createSlice({
  name: "campaigns",
  initialState,
  reducers: {
    clearCampaignMap: (state) => {
      state.currentCampaignGeoJson = null;
      state.loadingMap = false;
    },
  },
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
        if (action.meta.condition) return;
        state.error = action.payload as string;
        toast.error(
          state.error || "Erreur lors de la récupération des campagnes"
        );
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
        if (action.meta.condition) return;
        state.error = action.payload as string;
        toast.error(
          state.error || "Erreur lors de la récupération de la campagne"
        );
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
      .addCase(
        createCampaignWithRemainingTerritories.fulfilled,
        (state, action) => {
          state.creating = false;
          state.campaigns.push(action.payload);
        }
      )
      .addCase(
        createCampaignWithRemainingTerritories.rejected,
        (state, action) => {
          state.creating = false;
          state.error = action.payload as string;
          toast.error(
            state.error ||
              "Échec de la création de la campagne avec territoires restants"
          );
        }
      )

      // Mise à jour des territoires restants
      .addCase(updateRemainingTerritories.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateRemainingTerritories.fulfilled, (state, action) => {
        state.updating = false;
        state.currentCampaign = action.payload;

        // Mettre à jour la campagne dans la liste des campagnes si elle existe
        const index = state.campaigns.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.campaigns[index] = action.payload;
        }
      })
      .addCase(updateRemainingTerritories.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
        toast.error(
          state.error || "Échec de la mise à jour des territoires restants"
        );
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
        const index = state.campaigns.findIndex(
          (c) => c.id === action.payload.id
        );
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
        state.campaigns = state.campaigns.filter(
          (campaign) => campaign.id !== action.payload
        );
        if (
          state.currentCampaign &&
          state.currentCampaign.id === action.payload
        ) {
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
        if (action.meta.condition) return;
        state.error = action.payload as string;
        toast.error(
          state.error ||
            "Erreur lors de la récupération des statistiques de la campagne"
        );
      })

      // Récupération du GeoJSON de la campagne
      .addCase(fetchCampaignMap.pending, (state) => {
        state.loadingMap = true;
        state.error = null;
      })
      .addCase(fetchCampaignMap.fulfilled, (state, action) => {
        state.loadingMap = false;
        state.currentCampaignGeoJson = action.payload;
      })
      .addCase(fetchCampaignMap.rejected, (state, action) => {
        state.loadingMap = false;
        if (action.meta.condition) return;
        state.error = action.payload as string;
        toast.error(
          state.error ||
            "Erreur lors de la récupération du GeoJSON de la campagne"
        );
      });
  },
});

export const { clearCampaignMap } = campaignSlice.actions;
export default campaignSlice.reducer;
