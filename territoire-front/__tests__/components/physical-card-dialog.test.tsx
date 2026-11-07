import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { PhysicalCardDialog } from "@/components/territory/id/physical-card-dialog";
import { DEFAULT_PLAN_THEMES, renderIgnPlan } from "@/lib/ign-plan";
import { Territory } from "@/models/territory";
import {
  jsonResponse,
  mockApi,
  renderWithStore,
  TEST_CITY,
} from "../test-utils";
import { captureDownloads } from "../mocks/ios";

// Le plan est dessiné par MapLibre (WebGL), absent de jsdom : on en simule le résultat
vi.mock("@/lib/ign-plan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ign-plan")>()),
  renderIgnPlan: vi.fn(),
}));

const CARD_URL = "/api/territoires/t1/carte-physique";
const LAYOUT = {
  west: 2.352,
  south: 48.691,
  east: 2.364,
  north: 48.695,
  width: 828,
  height: 376,
};

const selectedTerritory = {
  id: "t1",
  name: "R-12",
  city: TEST_CITY,
  lastModifiedDate: "2026-10-01",
} as Territory;

/** Adresses demandées au back pour la carte physique, avec leur méthode. */
const cardCalls = (api: ReturnType<typeof mockApi>) =>
  api.mock.calls
    .filter(([url]) => url.startsWith(CARD_URL))
    .map(([url, init]) => `${init?.method ?? "GET"} ${url}`);

/** Plan envoyé au back par la dernière requête vers cette adresse. */
const sentPlan = (api: ReturnType<typeof mockApi>, url: string) =>
  (api.mock.calls.findLast(([u]) => u === url)?.[1]?.body as FormData).get(
    "plan"
  );

const routes = (extra: Record<string, unknown> = {}) => ({
  [`GET ${CARD_URL}/emprise`]: LAYOUT,
  [`POST ${CARD_URL}/apercu`]: {},
  ...extra,
});

describe("Carte physique d'un territoire", () => {
  const plan = new Blob(["plan"], { type: "image/png" });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(renderIgnPlan).mockReset();
    vi.mocked(renderIgnPlan).mockResolvedValue(plan);
    URL.createObjectURL = vi.fn(() => "blob:carte-physique");
    URL.revokeObjectURL = vi.fn();
  });

  const open = async () =>
    userEvent.click(screen.getByRole("button", { name: "Générer la carte" }));

  it("dessine le plan sur l'emprise du cadrage et le refait quand on change le cadrage", async () => {
    const api = mockApi(routes());
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );

    await open();

    expect(
      await screen.findByAltText("Carte physique du territoire R-12")
    ).toHaveAttribute("src", "blob:carte-physique");
    expect(renderIgnPlan).toHaveBeenCalledWith(LAYOUT, DEFAULT_PLAN_THEMES);
    expect(sentPlan(api, `${CARD_URL}/apercu?cadrage=NORMAL`)).toBeInstanceOf(
      Blob
    );
    expect(
      screen.getByText(/remplace la carte actuelle du territoire/)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Large" }));

    await waitFor(() =>
      expect(cardCalls(api)).toEqual([
        `GET ${CARD_URL}/emprise?cadrage=NORMAL`,
        `POST ${CARD_URL}/apercu?cadrage=NORMAL`,
        `GET ${CARD_URL}/emprise?cadrage=WIDE`,
        `POST ${CARD_URL}/apercu?cadrage=WIDE`,
      ])
    );
    expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("cache les maisons par défaut et redessine le plan quand on change un thème", async () => {
    mockApi(routes());
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );
    await open();
    await screen.findByAltText("Carte physique du territoire R-12");
    const houses = screen.getByRole("checkbox", { name: "Maisons" });
    expect(houses).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Noms de lieux et repères" })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Végétation et parcs" })
    ).not.toBeChecked();

    await userEvent.click(houses);

    await waitFor(() =>
      expect(renderIgnPlan).toHaveBeenLastCalledWith(LAYOUT, [
        "PLACES",
        "BUILDINGS",
        "HOUSES",
      ])
    );
    expect(houses).toBeChecked();
  });

  it("explique pourquoi la carte ne peut pas être générée", async () => {
    mockApi({
      [`GET ${CARD_URL}/emprise`]: jsonResponse(
        { error: "Ce territoire n'a pas encore de pâtés" },
        400
      ),
    });
    renderWithStore(
      <PhysicalCardDialog
        territoryId="t1"
        territoryName="R-12"
        hasCard={false}
      />
    );

    await open();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce territoire n'a pas encore de pâtés"
    );
    expect(renderIgnPlan).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Enregistrer la carte" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeDisabled();
  });

  it("propose de réessayer quand le plan IGN n'a pas pu être chargé", async () => {
    vi.mocked(renderIgnPlan).mockRejectedValueOnce(new Error("tuile"));
    mockApi(routes());
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );
    await open();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "réessayez dans un instant"
    );

    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByAltText("Carte physique du territoire R-12")
    ).toHaveAttribute("src", "blob:carte-physique");
    expect(renderIgnPlan).toHaveBeenCalledTimes(2);
  });

  it("télécharge l'aperçu en PNG", async () => {
    mockApi(routes());
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );
    await open();
    await screen.findByAltText("Carte physique du territoire R-12");
    const downloads = captureDownloads();

    await userEvent.click(screen.getByRole("button", { name: "Télécharger" }));

    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe("carte-r-12.png");
    expect(downloads[0].file.type).toBe("image/png");
  });

  it("enregistre la carte avec le plan de l'aperçu comme carte du territoire", async () => {
    const success = vi.spyOn(toast, "success");
    const onSaved = vi.fn();
    const api = mockApi(
      routes({ [`POST ${CARD_URL}`]: new Response(null, { status: 204 }) })
    );
    const { store } = renderWithStore(
      <PhysicalCardDialog
        territoryId="t1"
        territoryName="R-12"
        hasCard={false}
        onSaved={onSaved}
      />,
      "SUPERVISEUR",
      { territories: { selectedTerritory } }
    );
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Serré" }));
    await waitFor(() =>
      expect(cardCalls(api)).toContain(`POST ${CARD_URL}/apercu?cadrage=TIGHT`)
    );
    await screen.findByAltText("Carte physique du territoire R-12");

    await userEvent.click(
      screen.getByRole("button", { name: "Enregistrer la carte" })
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(cardCalls(api)).toContain(`POST ${CARD_URL}?cadrage=TIGHT`);
    expect(sentPlan(api, `${CARD_URL}?cadrage=TIGHT`)).toBeInstanceOf(Blob);
    expect(success).toHaveBeenCalledWith(
      expect.stringContaining("Impression des cartes")
    );
    // La fiche sait désormais que le territoire a une carte à imprimer
    expect(store.getState().territories.selectedTerritory?.territoryMapId).toBe(
      "t1"
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("signale un échec d'enregistrement", async () => {
    const error = vi.spyOn(toast, "error");
    mockApi(
      routes({
        [`POST ${CARD_URL}`]: jsonResponse(
          { error: "Plan de la carte illisible" },
          400
        ),
      })
    );
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );
    await open();
    await screen.findByAltText("Carte physique du territoire R-12");

    await userEvent.click(
      screen.getByRole("button", { name: "Remplacer la carte" })
    );

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Plan de la carte illisible")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
