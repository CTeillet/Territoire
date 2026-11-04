import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerritoryStatusBadge } from "@/components/territory/territory-status-badge";
import {
  TERRITORY_STATUS_STYLES,
  territoryStatusStyle,
} from "@/components/territory/territory-status";
import { buildTerritoryPopup } from "@/components/territory/territory-popup";
import { TerritoryStatus } from "@/models/territory-status";

const STATUSES = Object.keys(TERRITORY_STATUS_STYLES) as TerritoryStatus[];

describe("Couleurs des statuts de territoire", () => {
  it("affiche le statut traduit avec la pastille de la couleur de la carte", () => {
    render(<TerritoryStatusBadge status="LATE" />);

    const badge = screen.getByText("En retard");
    expect(badge).toHaveClass("bg-pink-100", "text-pink-800");
    expect(badge.querySelector("span")).toHaveStyle({
      backgroundColor: TERRITORY_STATUS_STYLES.LATE.color,
    });
  });

  it("donne à chaque statut une couleur différente", () => {
    const colors = STATUSES.map((status) => territoryStatusStyle(status).color);
    expect(new Set(colors).size).toBe(STATUSES.length);
  });

  it("le popup de la carte reprend la teinte du badge", () => {
    for (const status of STATUSES) {
      const badge = buildTerritoryPopup("t1", "R-12", status).querySelector(
        "span"
      );
      for (const cls of TERRITORY_STATUS_STYLES[status].badge.split(" ")) {
        expect(badge).toHaveClass(cls);
      }
    }
  });

  it("met un statut inconnu en gris", () => {
    expect(territoryStatusStyle("INCONNU" as TerritoryStatus).color).toBe(
      "#6b7280"
    );
    render(<TerritoryStatusBadge status={"INCONNU" as TerritoryStatus} />);
    expect(screen.getByText("INCONNU")).toHaveClass("bg-gray-100");
  });
});
