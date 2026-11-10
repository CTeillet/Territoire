import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockApi, renderWithStore } from "../test-utils";
import { CardHistoryDialog } from "@/components/territory/id/card-history-dialog";

const version = {
  id: "v1",
  fileName: "scan.png",
  contentType: "image/png",
  replacedAt: "2026-11-07T10:00:00Z",
};

describe("Cartes précédentes d'un territoire", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:carte");
    URL.revokeObjectURL = vi.fn();
  });

  it("montre les cartes remplacées et en remet une après confirmation", async () => {
    const api = mockApi({
      "GET /api/territoires/t1/cartes-precedentes/v1": {},
      "GET /api/territoires/t1/cartes-precedentes": [version],
      "POST /api/territoires/t1/cartes-precedentes/v1/restauration": {},
    });
    const onRestored = vi.fn();
    renderWithStore(
      <CardHistoryDialog
        territoryId="t1"
        territoryName="R-12"
        onRestored={onRestored}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Cartes précédentes" })
    );
    expect(await screen.findByText(/Remplacée le/)).toHaveTextContent(
      "(scan.png)"
    );
    expect(await screen.findByRole("img")).toHaveAttribute("src", "blob:carte");

    await userEvent.click(
      screen.getByRole("button", { name: "Remettre cette carte" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Remettre" }));

    await waitFor(() => expect(onRestored).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith(
      "/api/territoires/t1/cartes-precedentes/v1/restauration",
      { method: "POST" }
    );
  });

  it("indique qu'il n'y a pas encore de carte précédente", async () => {
    mockApi({ "GET /api/territoires/t1/cartes-precedentes": [] });
    renderWithStore(
      <CardHistoryDialog
        territoryId="t1"
        territoryName="R-12"
        onRestored={vi.fn()}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Cartes précédentes" })
    );
    expect(
      await screen.findByText("Aucune carte précédente")
    ).toBeInTheDocument();
  });
});
