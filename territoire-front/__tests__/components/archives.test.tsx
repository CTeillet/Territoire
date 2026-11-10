import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockApi, renderWithStore } from "../test-utils";
import { ArchivesSection } from "@/components/parameters/other-parameter/archives-section";
import { ArchiveTerritoryButton } from "@/components/territory/id/archive-territory-button";
import { ArchivePersonButton } from "@/components/person/archive-person-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const archivedTerritory = {
  id: "t1",
  name: "R-12",
  cityName: "Rennes",
  archivedAt: "2026-11-01T10:00:00Z",
  assignments: 7,
};
const departed = {
  id: "p1",
  firstName: "Jean",
  lastName: "Dupont",
  archivedAt: "2026-11-02T10:00:00Z",
  anonymizedAt: null,
};

describe("Archivage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
  });

  it("liste les archives et restaure un territoire", async () => {
    const api = mockApi({
      "GET /api/territoires/archives": [archivedTerritory],
      "GET /api/personnes/archives": [departed],
      "POST /api/territoires/t1/restaurer": {},
      "GET /api/territoires/geojson": {
        type: "FeatureCollection",
        features: [],
      },
      "GET /api/personnes": [],
    });
    renderWithStore(<ArchivesSection />, "SUPERVISEUR");

    const row = (await screen.findByText("R-12")).closest("tr")!;
    expect(row).toHaveTextContent("(Rennes)");
    expect(row).toHaveTextContent("7");
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    // Anonymisation réservée à l'administrateur
    expect(
      screen.queryByRole("button", { name: "Anonymiser" })
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(row).getByRole("button", { name: "Restaurer" })
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/territoires/t1/restaurer", {
        method: "POST",
      })
    );
  });

  it("anonymise une personne partie après confirmation (administrateur)", async () => {
    const api = mockApi({
      "GET /api/territoires/archives": [],
      "GET /api/personnes/archives": [departed],
      "POST /api/personnes/p1/anonymiser": { ...departed, anonymizedAt: "x" },
      "GET /api/territoires/geojson": {
        type: "FeatureCollection",
        features: [],
      },
      "GET /api/personnes": [],
    });
    renderWithStore(<ArchivesSection />, "ADMIN");

    expect(
      await screen.findByText("Aucun territoire archivé.")
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Anonymiser" }));
    expect(
      screen.getByText(/Cette action est irréversible/)
    ).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Anonymiser",
      })
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("/api/personnes/p1/anonymiser", {
        method: "POST",
      })
    );
  });

  it("archive un territoire et revient à la liste, ou affiche le refus", async () => {
    mockApi({ "POST /api/territoires/t1/archiver": {} });
    renderWithStore(
      <ArchiveTerritoryButton territoryId="t1" territoryName="R-12" />
    );

    await userEvent.click(screen.getByRole("button", { name: "Archiver" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Archiver",
      })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/territoires"));
  });

  it("marque une personne comme partie", async () => {
    const api = mockApi({
      "POST /api/personnes/p1/archiver": departed,
      "GET /api/personnes": [],
    });
    const onArchived = vi.fn();
    renderWithStore(
      <ArchivePersonButton
        person={{ id: "p1", firstName: "Jean", lastName: "Dupont" }}
        onArchived={onArchived}
      />,
      "SUPERVISEUR"
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Marquer comme partie" })
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Marquer comme partie",
      })
    );
    await waitFor(() => expect(onArchived).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith("/api/personnes/p1/archiver", {
      method: "POST",
    });
  });

  it("n'affiche pas l'archivage d'une personne en simple consultation", () => {
    renderWithStore(
      <ArchivePersonButton
        person={{ id: "p1", firstName: "Jean", lastName: "Dupont" }}
        onArchived={vi.fn()}
      />,
      "UTILISATEUR"
    );
    expect(
      screen.queryByRole("button", { name: "Marquer comme partie" })
    ).not.toBeInTheDocument();
  });
});
