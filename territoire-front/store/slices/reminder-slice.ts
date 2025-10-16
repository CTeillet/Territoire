import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { TerritoryReminder } from "@/models/territory-reminder";
import { authFetch } from "@/utils/auth-fetch";

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

// Async thunk for fetching all reminders
export const fetchReminders = createAsyncThunk<TerritoryReminder[]>(
  "reminders/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(BASE_URL);

      if (!response.ok) {
        return rejectWithValue("Erreur lors de la récupération des rappels");
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Une erreur inconnue s'est produite"
      );
    }
  }
);

// Async thunk for creating a reminder
export const createReminder = createAsyncThunk(
  "reminders/create",
  async (
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
  ) => {
    try {
      let url = `${BASE_URL}?territoryId=${territoryId}&personId=${personId}`;
      if (notes) {
        url += `&notes=${encodeURIComponent(notes)}`;
      }

      const response = await authFetch(url, {
        method: "POST",
      });

      if (!response.ok) {
        let message = "Failed to send reminder";
        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errorData = await response.json();
            message = (errorData && (errorData.message || errorData.error)) || message;
          } else {
            const text = await response.text();
            message = text || message;
          }
        } catch (_) {
          // ignore parsing errors and keep default message
        }
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Impossible d'envoyer le rappel"
      );
    }
  }
);

// Create the slice
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