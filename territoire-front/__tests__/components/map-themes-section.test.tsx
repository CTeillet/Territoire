import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { MapThemesSection } from "@/components/parameters/map-settings/map-themes-section";
import { setCachedMapThemes, useMapThemes } from "@/lib/map-themes";
import { DEFAULT_MAP_THEMES } from "@/models/map-view";
import { mockApi, renderWithStore } from "../test-utils";

const SETTINGS = {
  maps: { ...DEFAULT_MAP_THEMES, PUBLIC: ["PLACES", "NUMBERS"] },
};

/** PUT envoyés au back, corps décodé. */
const saves = (api: ReturnType<typeof mockApi>) =>
  api.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(String(init?.body)));

describe("Réglages des cartes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCachedMapThemes(null);
  });

  it("montre pour chaque carte les thèmes réglés", async () => {
    mockApi({ "GET /api/settings/cartes": SETTINGS });
    renderWithStore(<MapThemesSection />);

    const numbers = await screen.findByRole("checkbox", {
      name: "Numéros de rue sur la carte « Lien personnel »",
    });
    await waitFor(() => expect(numbers).toBeChecked());
    expect(
      screen.getByRole("checkbox", {
        name: "Maisons sur la carte « Lien personnel »",
      })
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "Maisons sur la carte « Fiche d'un territoire »",
      })
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("enregistre les thèmes cochés, dans l'ordre des thèmes", async () => {
    const success = vi.spyOn(toast, "success");
    const api = mockApi({
      "GET /api/settings/cartes": SETTINGS,
      "PUT /api/settings/cartes": (init?: RequestInit) =>
        JSON.parse(String(init?.body)),
    });
    renderWithStore(<MapThemesSection />);
    const houses = await screen.findByRole("checkbox", {
      name: "Maisons sur la carte « Lien personnel »",
    });
    await waitFor(() => expect(houses).not.toBeDisabled());

    await userEvent.click(houses);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(saves(api)[0].maps.PUBLIC).toEqual(["PLACES", "HOUSES", "NUMBERS"]);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("remet les valeurs par défaut avant de les enregistrer", async () => {
    const api = mockApi({
      "GET /api/settings/cartes": SETTINGS,
      "PUT /api/settings/cartes": (init?: RequestInit) =>
        JSON.parse(String(init?.body)),
    });
    renderWithStore(<MapThemesSection />);
    const reset = await screen.findByRole("button", {
      name: "Valeurs par défaut",
    });
    await waitFor(() => expect(reset).not.toBeDisabled());

    await userEvent.click(reset);
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(saves(api)).toHaveLength(1));
    expect(saves(api)[0].maps).toEqual(DEFAULT_MAP_THEMES);
  });
});

function Themes({ view }: { view: "CARD" | "PUBLIC" }) {
  const themes = useMapThemes(view);
  return <p data-testid={view}>{themes ? themes.join(",") : "…"}</p>;
}

describe("Thèmes d'une carte", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCachedMapThemes(null);
  });

  it("lit les réglages une seule fois pour toutes les cartes de la page", async () => {
    const api = mockApi({ "GET /api/settings/cartes": SETTINGS });
    renderWithStore(
      <>
        <Themes view="CARD" />
        <Themes view="PUBLIC" />
      </>
    );

    await waitFor(() =>
      expect(screen.getByTestId("PUBLIC")).toHaveTextContent("PLACES,NUMBERS")
    );
    expect(screen.getByTestId("CARD")).toHaveTextContent("PLACES,BUILDINGS");
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("garde les thèmes par défaut si les réglages ne se lisent pas", async () => {
    mockApi({});
    renderWithStore(<Themes view="CARD" />);

    await waitFor(() =>
      expect(screen.getByTestId("CARD")).toHaveTextContent("PLACES,BUILDINGS")
    );
  });
});
