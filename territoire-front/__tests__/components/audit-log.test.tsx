import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockApi, renderWithStore } from "../test-utils";
import { AuditLogCard, AuditLogSection } from "@/components/shared/audit-log";

const events = [
  {
    id: "e2",
    occurredAt: "2026-11-09T10:00:00Z",
    actor: "Lien personnel",
    action: "RETOUR_PAR_LIEN",
    territoryId: "t1",
    territoryName: "R-12",
    personId: null,
    personName: null,
    details: "Rendu par la personne depuis son lien personnel",
  },
  {
    id: "e1",
    occurredAt: "2026-11-01T10:00:00Z",
    actor: "gestion@exemple.fr",
    action: "ATTRIBUTION",
    territoryId: "t1",
    territoryName: "R-12",
    personId: "p1",
    personName: "Jean Dupont",
    details: "À rendre le 2027-03-01",
  },
];

describe("Journal des actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("montre qui a fait quoi sur un territoire", async () => {
    const api = mockApi({ "GET /api/journal": events });
    renderWithStore(<AuditLogCard territoryId="t1" />, "SUPERVISEUR");

    expect(
      await screen.findByText("Retour par le lien personnel")
    ).toBeInTheDocument();
    expect(screen.getByText("Attribution")).toBeInTheDocument();
    expect(screen.getByText(/gestion@exemple.fr/)).toBeInTheDocument();
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/api/journal?territoryId=t1", {});
  });

  it("n'est pas montré au gestionnaire", () => {
    const api = mockApi({ "GET /api/journal": events });
    renderWithStore(<AuditLogCard territoryId="t1" />, "GESTIONNAIRE");
    expect(screen.queryByText("Journal des actions")).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it("filtre le journal de l'application par une recherche", async () => {
    mockApi({ "GET /api/journal": events });
    renderWithStore(<AuditLogSection />, "ADMIN");

    expect(await screen.findByText("Attribution")).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Rechercher dans le journal" }),
      "dupont"
    );
    expect(screen.getByText("Attribution")).toBeInTheDocument();
    expect(
      screen.queryByText("Retour par le lien personnel")
    ).not.toBeInTheDocument();
  });
});
