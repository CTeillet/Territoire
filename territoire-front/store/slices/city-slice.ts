import { City } from "@/models/city";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createApiThunk, jsonBody, thunkApi } from "@/utils/thunk-request";

// État initial du slice
interface CityState {
  cities: City[];
  loading: boolean;
  error: string | null;
}

const initialState: CityState = {
  cities: [],
  loading: false,
  error: null,
};
const API_URL = "/api/villes";

// ✅ Thunk pour récupérer les villes depuis le backend
export const fetchCities = createApiThunk(
  "cities/fetchCities",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<City[]>(
      API_URL,
      "Erreur lors de la récupération des villes"
    )
);

// ✅ Thunk pour ajouter une ville
export const addCity = createApiThunk(
  "cities/addCity",
  (
    {
      name,
      zipCode,
      colorHex,
    }: {
      name: string;
      zipCode: string;
      colorHex?: string;
    },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<City>(
      API_URL,
      "Erreur lors de l'ajout de la ville",
      jsonBody("POST", { name, zipCode, colorHex })
    )
);

// ✅ Thunk pour supprimer une ville (ex. refus d'une ville qui contient encore des territoires)
export const removeCity = createApiThunk(
  "cities/removeCity",
  async (id: string, { rejectWithValue }) =>
    (await thunkApi(rejectWithValue).noContent(
      `${API_URL}/${id}`,
      "Erreur lors de la suppression de la ville",
      { method: "DELETE" }
    )) ?? id
);

// ✅ Thunk pour mettre à jour la couleur d'une ville
export const updateCityColor = createApiThunk(
  "cities/updateCityColor",
  (
    { id, colorHex }: { id: string; colorHex: string | null },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<City>(
      `${API_URL}/${id}/couleur`,
      "Erreur lors de la mise à jour de la couleur",
      jsonBody("PATCH", { colorHex })
    )
);

const citySlice = createSlice({
  name: "cities",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // 📌 Gestion de la récupération des villes
      .addCase(fetchCities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCities.fulfilled,
        (state, action: PayloadAction<City[]>) => {
          state.loading = false;
          state.cities = action.payload;
        }
      )
      .addCase(fetchCities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Erreur lors du chargement des villes";
      })

      // 📌 Gestion de l'ajout d'une ville
      .addCase(addCity.fulfilled, (state, action: PayloadAction<City>) => {
        state.cities.push(action.payload);
      })

      // 📌 Gestion de la suppression d'une ville
      .addCase(removeCity.fulfilled, (state, action: PayloadAction<string>) => {
        state.cities = state.cities.filter(
          (city) => city.id !== action.payload
        );
      })
      // 📌 Gestion de la mise à jour de la couleur
      .addCase(
        updateCityColor.fulfilled,
        (state, action: PayloadAction<City>) => {
          const updated = action.payload;
          const idx = state.cities.findIndex((c) => c.id === updated.id);
          if (idx !== -1) {
            state.cities[idx] = updated;
          }
        }
      );
  },
});

export default citySlice.reducer;
