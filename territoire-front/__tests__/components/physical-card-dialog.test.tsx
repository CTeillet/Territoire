import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { PhysicalCardDialog } from "@/components/territory/id/physical-card-dialog";
import { Territory } from "@/models/territory";
import {
  jsonResponse,
  mockApi,
  renderWithStore,
  TEST_CITY,
} from "../test-utils";
import { captureDownloads } from "../mocks/ios";

const CARD_URL = "/api/territoires/t1/carte-physique";

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

describe("Carte physique d'un territoire", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:carte-physique");
    URL.revokeObjectURL = vi.fn();
  });

  const open = async () =>
    userEvent.click(screen.getByRole("button", { name: "Générer la carte" }));

  it("montre l'aperçu et le régénère quand on change le cadrage", async () => {
    const api = mockApi({ [`GET ${CARD_URL}`]: {} });
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );

    await open();

    expect(
      await screen.findByAltText("Carte physique du territoire R-12")
    ).toHaveAttribute("src", "blob:carte-physique");
    expect(screen.getByRole("button", { name: "Normal" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      screen.getByText(/remplace la carte actuelle du territoire/)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Large" }));

    await waitFor(() =>
      expect(cardCalls(api)).toEqual([
        `GET ${CARD_URL}?cadrage=NORMAL`,
        `GET ${CARD_URL}?cadrage=WIDE`,
      ])
    );
    expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("explique pourquoi la carte ne peut pas être générée", async () => {
    mockApi({
      [`GET ${CARD_URL}`]: jsonResponse(
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
    expect(
      screen.getByRole("button", { name: "Enregistrer la carte" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeDisabled();
  });

  it("télécharge l'aperçu en PNG", async () => {
    mockApi({ [`GET ${CARD_URL}`]: {} });
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

  it("enregistre la carte avec le cadrage choisi comme carte du territoire", async () => {
    const success = vi.spyOn(toast, "success");
    const onSaved = vi.fn();
    const api = mockApi({
      [`GET ${CARD_URL}`]: {},
      [`POST ${CARD_URL}`]: new Response(null, { status: 204 }),
    });
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
    await screen.findByAltText("Carte physique du territoire R-12");

    await userEvent.click(
      screen.getByRole("button", { name: "Enregistrer la carte" })
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(cardCalls(api)).toContain(`POST ${CARD_URL}?cadrage=TIGHT`);
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
    mockApi({
      [`GET ${CARD_URL}`]: {},
      [`POST ${CARD_URL}`]: jsonResponse(
        { error: "Plan IGN indisponible" },
        409
      ),
    });
    renderWithStore(
      <PhysicalCardDialog territoryId="t1" territoryName="R-12" hasCard />
    );
    await open();
    await screen.findByAltText("Carte physique du territoire R-12");

    await userEvent.click(
      screen.getByRole("button", { name: "Remplacer la carte" })
    );

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Plan IGN indisponible")
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
