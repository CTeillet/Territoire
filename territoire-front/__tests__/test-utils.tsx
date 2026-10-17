import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import authReducer from "@/store/slices/auth-slice";
import cityReducer from "@/store/slices/city-slice";
import personReducer from "@/store/slices/person-slice";
import territoryReducer from "@/store/slices/territory-slice";
import userReducer from "@/store/slices/user-slice";
import campaignReducer from "@/store/slices/campaign-slice";
import reminderReducer from "@/store/slices/reminder-slice";
import * as authFetchModule from "@/utils/auth-fetch";
import { Role } from "@/models/role";
import { City } from "@/models/city";

export const TEST_CITY: City = {
  id: "c1",
  name: "Rennes",
  zipCode: "35000",
  colorHex: "#3498db",
  center: { latitude: 48.11, longitude: -1.67 },
};

const authState = (role: Role | null) => ({
  user: role ? { id: "u1", email: "a@b.fr", username: "Alice", role } : null,
  token: role ? "token" : null,
});

/** Rend un composant avec un store contenant uniquement l'utilisateur connecté (et son rôle). */
export function renderWithRole(ui: React.ReactElement, role: Role | null) {
  const store = configureStore({
    reducer: { auth: authReducer, cities: cityReducer },
    preloadedState: {
      auth: authState(role),
      cities: { cities: [TEST_CITY], loading: false, error: null },
    },
  });
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

const reducers = {
  auth: authReducer,
  cities: cityReducer,
  persons: personReducer,
  territories: territoryReducer,
  users: userReducer,
  campaigns: campaignReducer,
  reminders: reminderReducer,
};

const rootReducer = combineReducers(reducers);

export type TestState = ReturnType<typeof rootReducer>;

/** Crée un store complet (tous les slices de l'application), avec un état initial partiel par slice. */
export function createTestStore(
  role: Role | null = "ADMIN",
  preloaded: { [K in keyof TestState]?: Partial<TestState[K]> } = {}
) {
  const initial = Object.fromEntries(
    Object.entries(reducers).map(([key, reducer]) => [
      key,
      {
        ...(reducer as (s: unknown, a: { type: string }) => object)(undefined, {
          type: "init",
        }),
        ...(key === "auth" ? authState(role) : {}),
        ...(key === "cities" ? { cities: [TEST_CITY] } : {}),
        ...(preloaded[key as keyof TestState] ?? {}),
      },
    ])
  );
  return configureStore({
    reducer: rootReducer,
    preloadedState: initial as TestState,
  });
}

/** Rend un composant avec le store complet. */
export function renderWithStore(
  ui: React.ReactElement,
  role: Role | null = "ADMIN",
  preloaded: Parameters<typeof createTestStore>[1] = {}
) {
  const store = createTestStore(role, preloaded);
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

/** Réponse fetch JSON minimale. */
export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 400 ? "Erreur" : "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    blob: async () => new Blob([JSON.stringify(body)]),
  } as Response;
}

type Route = unknown | ((init?: RequestInit) => unknown);

/**
 * Faux backend pour authFetch : clé « MÉTHODE /chemin » (le chemin peut être un préfixe, sans la query).
 * Une valeur Response est renvoyée telle quelle, une fonction est appelée avec l'init, sinon le corps JSON est renvoyé.
 * Les routes inconnues répondent 404.
 */
export function mockApi(routes: Record<string, Route>) {
  return vi
    .spyOn(authFetchModule, "authFetch")
    .mockImplementation(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const path = url.split("?")[0];
      const key =
        Object.keys(routes).find((k) => k === `${method} ${path}`) ??
        Object.keys(routes)
          .filter(
            (k) =>
              k.startsWith(`${method} `) &&
              path.startsWith(k.slice(method.length + 1))
          )
          .sort((a, b) => b.length - a.length)[0];
      if (!key)
        return jsonResponse(
          { error: `Route non simulée : ${method} ${url}` },
          404
        );
      const route = routes[key];
      const value =
        typeof route === "function"
          ? (route as (i?: RequestInit) => unknown)(init)
          : route;
      return value &&
        typeof value === "object" &&
        "ok" in (value as object) &&
        "status" in (value as object)
        ? (value as Response)
        : jsonResponse(value);
    });
}
