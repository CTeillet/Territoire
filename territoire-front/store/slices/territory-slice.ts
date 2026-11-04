import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  Territory,
  TerritoryCollection,
  TerritoryCoverageMap,
} from "@/models/territory";
import { format } from "date-fns";
import { Assignment } from "@/models/assignment";
import { authFetch } from "@/utils/auth-fetch";
import { apiErrorMessage } from "@/utils/api-error";
import { AddressNotToDoDto } from "@/models/AddressNotToDoDto";
import { UpdateTerritoryDto } from "@/models/update-territory-dto";
import { TerritoryStatusHistoryDto } from "@/models/territory-status-history";
import { SchoolYearPeriod } from "@/models/school-year-period";
import { TerritoryStatisticsBreakdown } from "@/models/campaign-statistics";

interface TerritoryDistribution {
  cityName: string;
  territoryCount: number;
  percentage: number;
}

interface AverageAssignmentDuration {
  period: string;
  averageDuration: number;
}

type TerritoryState = {
  territoriesGeojson: TerritoryCollection | null;
  selectedTerritory: Territory | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
  // Statistics state
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
};

// État initial
const initialState: TerritoryState = {
  territoriesGeojson: null,
  selectedTerritory: null,
  loading: false,
  updating: false,
  error: null,
  // Statistics initial state
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
};

const BASE_URL = `/api/territoires`;

// --- Small helpers to reduce duplication inside reducers ---
const findFeatureById = (state: TerritoryState, id: string) => {
  return state.territoriesGeojson?.features.find((f) => f.properties.id === id);
};

const updateSelectedIfSame = (
  state: TerritoryState,
  affectedId: string,
  updater: (t: Territory) => void
) => {
  if (state.selectedTerritory && state.selectedTerritory.id === affectedId) {
    updater(state.selectedTerritory);
  }
};

/**
 * Applique la modification au territoire de la liste et au territoire affiché. Chacun peut manquer : la fiche
 * d'un territoire ouverte directement ne charge pas la liste.
 */
const updateTerritoryEverywhere = (
  state: TerritoryState,
  affectedId: string,
  updater: (t: Territory) => void
) => {
  const feature = findFeatureById(state, affectedId);
  if (feature) {
    updater(feature.properties);
  }
  updateSelectedIfSame(state, affectedId, updater);
};

/** Remplace l'attribution de même identifiant, ou l'ajoute si elle n'est pas encore connue. */
const upsertAssignment = (t: Territory, updated: Assignment) => {
  const assignments = Array.isArray(t.assignments) ? t.assignments : [];
  t.assignments = assignments.some((a) => a.id === updated.id)
    ? assignments.map((a) => (a.id === updated.id ? updated : a))
    : [...assignments, updated];
};

const clearCurrentAssignment = (t: Territory) => {
  t.assignedTo = "";
  t.assignedOn = "";
  t.waitedFor = "";
};

const applyAssignment = (t: Territory, assignment: Assignment) => {
  t.status = "ASSIGNED";
  t.assignments = [
    ...(Array.isArray(t.assignments) ? t.assignments : []),
    assignment,
  ];
  if (assignment.person) {
    t.assignedTo =
      assignment.person.firstName + " " + assignment.person.lastName;
  }
  t.assignedOn = assignment.assignmentDate;
  t.waitedFor = assignment.dueDate;
};

/** Retour : l'attribution en cours est close (l'historique est conservé), le territoire passe en attente. */
const applyReturn = (t: Territory, returned: Assignment) => {
  upsertAssignment(t, returned);
  t.status = "PENDING";
  if (returned.returnDate) {
    t.lastVisitedOn = returned.returnDate;
  }
  clearCurrentAssignment(t);
};

/**
 * Annulation : le back supprime l'attribution en cours, le territoire redevient disponible.
 * Le dernier parcours ne change pas : une annulation n'est pas un retour.
 */
const applyCancellation = (t: Territory, cancelled: Assignment) => {
  t.status = "AVAILABLE";
  t.assignments = (Array.isArray(t.assignments) ? t.assignments : []).filter(
    (a) => a.id !== cancelled.id
  );
  clearCurrentAssignment(t);
};

/**
 * Remplace une attribution modifiée et met à jour ce qui en découle : statut recalculé par le back,
 * dates de l'attribution en cours et date du dernier parcours.
 */
const applyAssignmentUpdate = (t: Territory, updated: Assignment) => {
  t.status = updated.territory.status;
  t.assignments = Array.isArray(t.assignments)
    ? t.assignments.map((a) => (a.id === updated.id ? updated : a))
    : [updated];
  if (updated.returnDate === null) {
    t.assignedOn = updated.assignmentDate;
    t.waitedFor = updated.dueDate;
  }
  const lastReturnDate = t.assignments
    .map((a) => a.returnDate)
    .filter((date): date is string => !!date)
    .sort()
    .at(-1);
  if (lastReturnDate) {
    t.lastVisitedOn = lastReturnDate;
  }
};

/**
 * Prolongation : l'attribution en cours se termine le jour où commence celle reçue (même personne, nouvelle
 * échéance). Attribuée le jour même, l'attribution garde son identifiant et est simplement remplacée.
 * Le dernier parcours ne change pas : une prolongation n'est pas un retour.
 */
const applyExtension = (t: Territory, extended: Assignment) => {
  const assignments = (Array.isArray(t.assignments) ? t.assignments : []).map(
    (a) =>
      a.id === extended.id
        ? extended
        : a.returnDate === null
          ? {
              ...a,
              returnDate: extended.assignmentDate,
              returnedVia: "PROLONGATION" as const,
            }
          : a
  );
  t.assignments = assignments.some((a) => a.id === extended.id)
    ? assignments
    : [...assignments, extended];
  t.status = extended.territory.status;
  t.assignedOn = extended.assignmentDate;
  t.waitedFor = extended.dueDate;
};

export const extendTerritory = createAsyncThunk(
  "territories/extendTerritory",
  async (
    { territoryId, dueDate }: { territoryId: string; dueDate?: string },
    { rejectWithValue }
  ) => {
    // Construct URL with query parameter if dueDate is provided
    let url = `${BASE_URL}/${territoryId}/prolongation`;
    if (dueDate) {
      url += `?dueDate=${dueDate}`;
    }

    const response = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return rejectWithValue(
        await apiErrorMessage(
          response,
          "Erreur lors de la prolongation du territoire"
        )
      );
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const returnTerritory = createAsyncThunk(
  "territories/returnTerritory",
  async (territoryId: string, { rejectWithValue }) => {
    const response = await authFetch(`${BASE_URL}/${territoryId}/retour`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return rejectWithValue(
        await apiErrorMessage(response, "Erreur lors du retour du territoire")
      );
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const cancelAssignment = createAsyncThunk(
  "territories/cancelAssignment",
  async (territoryId: string, { rejectWithValue }) => {
    // Use the dedicated endpoint for canceling assignments
    const response = await authFetch(
      `${BASE_URL}/${territoryId}/annuler-assignation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      return rejectWithValue(
        await apiErrorMessage(
          response,
          "Erreur lors de l'annulation de l'assignation"
        )
      );
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const assignTerritory = createAsyncThunk(
  "territories/assignTerritory",
  async (
    { territoryId, personId }: { territoryId: string; personId: string },
    { rejectWithValue }
  ) => {
    const response = await authFetch(
      `${BASE_URL}/${territoryId}/attribuer/${personId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      // Motif de l'API affiché tel quel (ex. territoire déjà attribué entre-temps)
      return rejectWithValue(
        await apiErrorMessage(
          response,
          "Erreur lors de l'assignation du territoire"
        )
      );
    }

    try {
      return (await response.json()) as Assignment;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

/** Corrige les dates d'une attribution : le back recalcule le statut du territoire (renvoyé dans `territory.status`). */
export const updateAssignmentDates = createAsyncThunk(
  "territories/updateAssignmentDates",
  async (
    {
      assignmentId,
      ...dates
    }: {
      assignmentId: string;
      assignmentDate: string;
      dueDate: string;
      returnDate: string | null;
    },
    { rejectWithValue }
  ) => {
    const response = await authFetch(`/api/attributions/${assignmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dates),
    });

    if (!response.ok) {
      return rejectWithValue(
        await apiErrorMessage(
          response,
          "Erreur lors de la modification des dates d'attribution"
        )
      );
    }

    try {
      return (await response.json()) as Assignment;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const deleteTerritory = createAsyncThunk(
  "territories/deleteTerritory",
  async (territoryId: string, { rejectWithValue }) => {
    const response = await authFetch(`${BASE_URL}/${territoryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return rejectWithValue("Erreur lors de la suppression du territoire");
    }

    return territoryId;
  }
);

export const updateTerritory = createAsyncThunk(
  "territories/updateTerritory",
  async (
    { id, dto }: { id: string; dto: UpdateTerritoryDto },
    { rejectWithValue }
  ) => {
    const response = await authFetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      return rejectWithValue("Erreur lors de la mise à jour du territoire");
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

/** Signale un territoire perdu (sa carte papier a disparu) ou le retire des perdus. */
export const updateTerritoryLost = createAsyncThunk(
  "territories/updateTerritoryLost",
  async (
    { territoryId, lost }: { territoryId: string; lost: boolean },
    { rejectWithValue }
  ) => {
    const response = await authFetch(`${BASE_URL}/${territoryId}/perdu`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lost }),
    });

    if (!response.ok) {
      return rejectWithValue(
        await apiErrorMessage(
          response,
          lost
            ? "Erreur lors du signalement du territoire perdu"
            : "Erreur lors du retrait du territoire des perdus"
        )
      );
    }

    return { territoryId, lost };
  }
);

/** Territoire en attente rendu disponible sans attendre la fin de la durée d'attente (refusé par le back sinon). */
export const makeTerritoryAvailable = createAsyncThunk(
  "territories/makeTerritoryAvailable",
  async (territoryId: string, { rejectWithValue }) => {
    const response = await authFetch(
      `${BASE_URL}/${territoryId}/rendre-disponible`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      return rejectWithValue(
        await apiErrorMessage(
          response,
          "Erreur lors de la remise à disposition du territoire"
        )
      );
    }

    return territoryId;
  }
);

export const fetchTerritories = createAsyncThunk<TerritoryCollection>(
  "territories/fetchGeoJson",
  async (_, { rejectWithValue }) => {
    const response = await authFetch(`${BASE_URL}/geojson`);

    if (!response.ok) {
      return rejectWithValue(
        "Erreur lors de la récupération des territoires (GeoJSON)"
      );
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchTerritoryCoverageMap = createAsyncThunk<
  TerritoryCoverageMap,
  { startDate?: string; endDate?: string } | undefined
>(
  "territories/fetchTerritoryCoverageMap",
  async (params, { rejectWithValue }) => {
    try {
      let url = `${BASE_URL}/statistiques/carte-couverture`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération de la carte de couverture des territoires"
        );
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const addTerritory = createAsyncThunk(
  "territories/add",
  async (
    { name, cityId }: { name: string; cityId: string },
    { rejectWithValue }
  ) => {
    const response = await authFetch(`${BASE_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, cityId: cityId }),
    });

    if (!response.ok) {
      return rejectWithValue("Erreur lors de l'ajout du territoire");
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchTerritoryById = createAsyncThunk<Territory, string>(
  "territories/fetchById",
  async (id, { rejectWithValue }) => {
    const response = await authFetch(`${BASE_URL}/${id}`);

    if (!response.ok) {
      return rejectWithValue("Erreur lors de la récupération du territoire");
    }

    try {
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const addAddressNotToVisit = createAsyncThunk(
  "territories/addAddressNotToVisit",
  async (
    {
      territoryId,
      address,
    }: { territoryId: string; address: AddressNotToDoDto },
    { rejectWithValue }
  ) => {
    try {
      const response = await authFetch(
        `${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(address),
        }
      );

      if (!response.ok) {
        return rejectWithValue(
          `Erreur lors de l'ajout de l'adresse : ${response.statusText}`
        );
      }

      return await response.json(); // Retourne l'adresse ajoutée
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const modifyAddressNotToVisit = createAsyncThunk(
  "territories/modifyAddressNotToVisit",
  async (
    {
      territoryId,
      address,
      addressId,
    }: { territoryId: string; address: AddressNotToDoDto; addressId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authFetch(
        `${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter/${addressId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(address),
        }
      );

      if (!response.ok) {
        return rejectWithValue(
          `Erreur lors de la modification de l'adresse : ${response.statusText}`
        );
      }

      return await response.json(); // Retourne l'adresse modifiée
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const deleteAddressNotToVisit = createAsyncThunk(
  "territories/deleteAddressNotToVisit",
  async (
    { territoryId, addressId }: { territoryId: string; addressId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authFetch(
        `${BASE_URL}/${territoryId}/adresses-a-ne-pas-visiter/${addressId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        return rejectWithValue(
          `Erreur lors de la suppression de l'adresse : ${response.statusText}`
        );
      }

      return { territoryId, addressId }; // Retourne les IDs pour modifier le state
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

// Statistics-related async thunks
export const fetchTerritoryStatusHistory = createAsyncThunk(
  "territories/fetchTerritoryStatusHistory",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `${BASE_URL}/statistiques`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération des statistiques de territoire"
        );
      }

      return (await response.json()) as TerritoryStatusHistoryDto[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchTerritoriesNotAssignedSince = createAsyncThunk(
  "territories/fetchTerritoriesNotAssignedSince",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `${BASE_URL}/statistiques/non-assignes-depuis`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération des territoires non assignés"
        );
      }

      return (await response.json()) as number;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchAverageAssignmentDurationByMonth = createAsyncThunk(
  "territories/fetchAverageAssignmentDurationByMonth",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `${BASE_URL}/statistiques/duree-moyenne-attribution/par-mois`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération de la durée moyenne d'attribution par mois"
        );
      }

      return (await response.json()) as AverageAssignmentDuration[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchOverallAverageAssignmentDuration = createAsyncThunk(
  "territories/fetchOverallAverageAssignmentDuration",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `${BASE_URL}/statistiques/duree-moyenne-attribution/globale`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération de la durée moyenne globale d'attribution"
        );
      }

      return (await response.json()) as number;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchTerritoryDistributionByCity = createAsyncThunk(
  "territories/fetchTerritoryDistributionByCity",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `${BASE_URL}/statistiques/distribution-par-ville`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération de la distribution des territoires par ville"
        );
      }

      return (await response.json()) as TerritoryDistribution[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchTerritoryPeriodStatistics = createAsyncThunk(
  "territories/fetchTerritoryPeriodStatistics",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `${BASE_URL}/statistiques/resume-periode`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération des statistiques de la période"
        );
      }

      return (await response.json()) as TerritoryStatisticsBreakdown;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchLatestAssignments = createAsyncThunk(
  "territories/fetchLatestAssignments",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`/api/attributions/dernieres`);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération des dernières attributions"
        );
      }

      return (await response.json()) as Assignment[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchSchoolYearPeriods = createAsyncThunk(
  "territories/fetchSchoolYearPeriods",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/statistiques/periodes`);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération des périodes scolaires"
        );
      }

      return (await response.json()) as SchoolYearPeriod[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

export const fetchAssignmentsInPeriod = createAsyncThunk(
  "territories/fetchAssignmentsInPeriod",
  async (
    params: { startDate?: string; endDate?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      let url = `/api/attributions/periode`;
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append("startDate", params.startDate);
      if (params?.endDate) searchParams.append("endDate", params.endDate);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await authFetch(url);

      if (!response.ok) {
        return rejectWithValue(
          "Erreur lors de la récupération des attributions de la période"
        );
      }

      return (await response.json()) as Assignment[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite"
      );
    }
  }
);

const territorySlice = createSlice({
  name: "territories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Récupération des territoires en GeoJSON
      .addCase(fetchTerritories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTerritories.fulfilled, (state, action) => {
        state.territoriesGeojson = action.payload;
        state.loading = false;
      })
      .addCase(fetchTerritories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Ajout d'un territoire
      .addCase(addTerritory.fulfilled, (state, action) => {
        // L'API /api/territoires ne retourne pas un GeoJSON directement, il faudra refaire un fetch.
        // Ici, on garde simplement la cohérence de l'état.
        if (state.territoriesGeojson) {
          state.territoriesGeojson.features.push({
            type: "Feature",
            properties: {
              id: action.payload.id,
              name: action.payload.name,
              status: action.payload.status,
              lastModifiedDate: new Date().toISOString(),
              assignments: [],
              city: {
                id: action.payload.city.id,
                name: action.payload.city.name,
                zipCode: action.payload.city.zipCode,
                center: action.payload.city.center,
              },
              addressesNotToDo: [],
              geojson: "",
              lastVisitedOn: "nouveau",
              assignedTo: "N/A",
              assignedOn: "N/A",
              waitedFor: "N/A",
            },
            geometry: {
              type: "Polygon",
              coordinates: [], // À voir comment gérer la géométrie
            },
          });
        }
      })
      .addCase(addTerritory.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(fetchTerritoryById.pending, (state) => {
        state.loading = true;
        state.selectedTerritory = null;
        state.error = null;
      })
      .addCase(fetchTerritoryById.fulfilled, (state, action) => {
        state.selectedTerritory = action.payload;
        state.loading = false;
      })
      .addCase(fetchTerritoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(updateTerritory.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTerritory.fulfilled, (state, action) => {
        state.updating = false;
        if (
          state.selectedTerritory &&
          state.selectedTerritory.id === action.payload.id
        ) {
          state.selectedTerritory = {
            ...state.selectedTerritory,
            ...action.payload,
            lastModifiedDate: format(new Date(), "yyyy-MM-dd"), // ✅ Format YYYY-MM-DD
          };
        }
      })
      .addCase(updateTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(updateTerritoryLost.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateTerritoryLost.fulfilled, (state, action) => {
        state.updating = false;
        const { territoryId, lost } = action.payload;
        const feature = findFeatureById(state, territoryId);
        if (feature) {
          feature.properties.lost = lost;
        }
        updateSelectedIfSame(state, territoryId, (t) => {
          t.lost = lost;
        });
      })
      .addCase(updateTerritoryLost.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Seul le statut change : les attributions et le dernier parcours restent ceux du dernier retour
      .addCase(makeTerritoryAvailable.pending, (state) => {
        state.updating = true;
      })
      .addCase(makeTerritoryAvailable.fulfilled, (state, action) => {
        state.updating = false;
        updateTerritoryEverywhere(state, action.payload, (t) => {
          t.status = "AVAILABLE";
        });
      })
      .addCase(makeTerritoryAvailable.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(deleteTerritory.fulfilled, (state, action) => {
        if (state.territoriesGeojson) {
          state.territoriesGeojson.features =
            state.territoriesGeojson.features.filter(
              (territory) => territory.properties.id !== action.payload
            );
        }

        if (state.selectedTerritory?.id === action.payload) {
          state.selectedTerritory = null; // Supprime du store sélectionné si c'était lui
        }
      })

      // Assignation, retour, annulation, prolongation : `updating` plutôt que `loading`,
      // sinon les pages masquent leur tableau pendant l'enregistrement et il perd sa page courante
      .addCase(assignTerritory.pending, (state) => {
        state.updating = true;
      })
      .addCase(assignTerritory.fulfilled, (state, action) => {
        state.updating = false;
        const assignment = action.payload;

        if (!assignment || !assignment.territory.territoryId) {
          console.error(
            "❌ Problème : l'assignation ou le territoireId est undefined",
            assignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          assignment.territory.territoryId,
          (t) => applyAssignment(t, assignment)
        );
      })
      .addCase(assignTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(returnTerritory.pending, (state) => {
        state.updating = true;
      })
      .addCase(returnTerritory.fulfilled, (state, action) => {
        state.updating = false;
        const updatedAssignment: Assignment = action.payload;

        if (!updatedAssignment || !updatedAssignment.territory.territoryId) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            updatedAssignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          updatedAssignment.territory.territoryId,
          (t) => applyReturn(t, updatedAssignment)
        );
      })
      .addCase(returnTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(cancelAssignment.pending, (state) => {
        state.updating = true;
      })
      .addCase(cancelAssignment.fulfilled, (state, action) => {
        state.updating = false;
        const cancelledAssignment: Assignment = action.payload;

        if (
          !cancelledAssignment ||
          !cancelledAssignment.territory.territoryId
        ) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            cancelledAssignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          cancelledAssignment.territory.territoryId,
          (t) => applyCancellation(t, cancelledAssignment)
        );
      })
      .addCase(cancelAssignment.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(addAddressNotToVisit.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(addAddressNotToVisit.fulfilled, (state, action) => {
        state.updating = false;
        if (state.selectedTerritory) {
          state.selectedTerritory.addressesNotToDo.push(action.payload);
        }
      })
      .addCase(addAddressNotToVisit.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Modification d'une adresse à ne pas visiter
      .addCase(modifyAddressNotToVisit.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(modifyAddressNotToVisit.fulfilled, (state, action) => {
        state.updating = false;
        if (state.selectedTerritory) {
          const index = state.selectedTerritory.addressesNotToDo.findIndex(
            (addr) => addr.id === action.payload.id
          );
          if (index !== -1) {
            state.selectedTerritory.addressesNotToDo[index] = action.payload;
          }
        }
      })
      .addCase(modifyAddressNotToVisit.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Suppression d'une adresse à ne pas visiter
      .addCase(deleteAddressNotToVisit.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(deleteAddressNotToVisit.fulfilled, (state, action) => {
        state.updating = false;
        if (state.selectedTerritory) {
          state.selectedTerritory.addressesNotToDo =
            state.selectedTerritory.addressesNotToDo.filter(
              (addr) => addr.id !== action.payload.addressId
            );
        }
      })
      .addCase(deleteAddressNotToVisit.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      .addCase(extendTerritory.pending, (state) => {
        state.updating = true;
      })
      .addCase(extendTerritory.fulfilled, (state, action) => {
        state.updating = false;
        const extendedAssignment = action.payload;

        if (!extendedAssignment || !extendedAssignment.territory.territoryId) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            extendedAssignment
          );
          return;
        }

        updateTerritoryEverywhere(
          state,
          extendedAssignment.territory.territoryId,
          (t) => applyExtension(t, extendedAssignment)
        );
      })
      .addCase(extendTerritory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // `updating` plutôt que `loading` : la page du territoire reste affichée pendant l'enregistrement
      .addCase(updateAssignmentDates.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateAssignmentDates.fulfilled, (state, action) => {
        state.updating = false;
        const updatedAssignment = action.payload;
        const affectedId = updatedAssignment?.territory?.territoryId;
        if (!affectedId) {
          console.error(
            "❌ Problème : Assignation ou territoireId est undefined",
            updatedAssignment
          );
          return;
        }

        updateTerritoryEverywhere(state, affectedId, (t) =>
          applyAssignmentUpdate(t, updatedAssignment)
        );
      })
      .addCase(updateAssignmentDates.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      })

      // Statistics-related reducers
      .addCase(fetchTerritoryStatusHistory.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchTerritoryStatusHistory.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.territoryStatusHistory = action.payload;
      })
      .addCase(fetchTerritoryStatusHistory.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchTerritoriesNotAssignedSince.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchTerritoriesNotAssignedSince.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.territoriesNotAssignedSince = action.payload;
      })
      .addCase(fetchTerritoriesNotAssignedSince.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })

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
      })

      .addCase(fetchAverageAssignmentDurationByMonth.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(
        fetchAverageAssignmentDurationByMonth.fulfilled,
        (state, action) => {
          state.statisticsLoading = false;
          state.averageAssignmentDurationByMonth = action.payload;
        }
      )
      .addCase(
        fetchAverageAssignmentDurationByMonth.rejected,
        (state, action) => {
          state.statisticsLoading = false;
          state.error = action.payload as string;
        }
      )

      .addCase(fetchOverallAverageAssignmentDuration.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(
        fetchOverallAverageAssignmentDuration.fulfilled,
        (state, action) => {
          state.statisticsLoading = false;
          state.overallAverageAssignmentDuration = action.payload;
        }
      )
      .addCase(
        fetchOverallAverageAssignmentDuration.rejected,
        (state, action) => {
          state.statisticsLoading = false;
          state.error = action.payload as string;
        }
      )

      .addCase(fetchTerritoryDistributionByCity.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchTerritoryDistributionByCity.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.territoryDistributionByCity = action.payload;
      })
      .addCase(fetchTerritoryDistributionByCity.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchTerritoryPeriodStatistics.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchTerritoryPeriodStatistics.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.periodStatistics = action.payload;
      })
      .addCase(fetchTerritoryPeriodStatistics.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchLatestAssignments.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchLatestAssignments.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.latestAssignments = action.payload;
      })
      .addCase(fetchLatestAssignments.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchSchoolYearPeriods.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchSchoolYearPeriods.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.schoolYearPeriods = action.payload;
      })
      .addCase(fetchSchoolYearPeriods.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchAssignmentsInPeriod.pending, (state) => {
        state.statisticsLoading = true;
        state.error = null;
      })
      .addCase(fetchAssignmentsInPeriod.fulfilled, (state, action) => {
        state.statisticsLoading = false;
        state.periodAssignments = action.payload;
      })
      .addCase(fetchAssignmentsInPeriod.rejected, (state, action) => {
        state.statisticsLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export du reducer
export default territorySlice.reducer;
