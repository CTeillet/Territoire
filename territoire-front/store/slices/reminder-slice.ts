import { TerritoryReminder } from "@/models/territory-reminder";
import { createSlice } from "@reduxjs/toolkit";
import { createApiThunk, thunkApi, withQuery } from "@/utils/thunk-request";

// Define the state interface
interface ReminderState {
  reminders: TerritoryReminder[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: ReminderState = {
  reminders: [],
  loading: false,
  error: null,
};

const BASE_URL = `/api/territory-reminders`;

// Récupère tous les rappels
export const fetchReminders = createApiThunk(
  "reminders/fetchAll",
  (_: void, { rejectWithValue }) =>
    thunkApi(rejectWithValue).json<TerritoryReminder[]>(
      BASE_URL,
      "Erreur lors de la récupération des rappels"
    )
);

// Enregistre un rappel pour un territoire en retard
export const createReminder = createApiThunk(
  "reminders/create",
  (
    {
      territoryId,
      personId,
      notes,
    }: {
      territoryId: string;
      personId: string;
      notes?: string;
    },
    { rejectWithValue }
  ) =>
    thunkApi(rejectWithValue).json<TerritoryReminder>(
      withQuery(BASE_URL, { territoryIds: territoryId, personId, notes }),
      "Impossible d'enregistrer le rappel",
      { method: "POST" }
    )
);

const reminderSlice = createSlice({
  name: "reminders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch reminders
      .addCase(fetchReminders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.reminders = action.payload;
        state.loading = false;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create reminder
      .addCase(createReminder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        state.reminders.push(action.payload);
        state.loading = false;
      })
      .addCase(createReminder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export the reducer
export default reminderSlice.reducer;
