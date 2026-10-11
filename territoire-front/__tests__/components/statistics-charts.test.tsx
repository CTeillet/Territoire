import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CityBarChart } from "@/components/campaigns/statistics/city-bar-chart";
import { TerritoryTypeBarChart } from "@/components/campaigns/statistics/territory-type-bar-chart";
import { seriesLabel } from "@/components/campaigns/statistics/series-label";

vi.mock("recharts", async (importOriginal) =>
  (await import("../mocks/recharts")).rechartsWithFixedSize(
    importOriginal as never
  )
);

const translations = { used: "Utilisés", available: "Restants" };

describe("seriesLabel", () => {
  it("traduit les séries connues et laisse les autres intactes", () => {
    expect(seriesLabel("used", translations)).toBe("Utilisés");
    expect(seriesLabel("available", translations)).toBe("Restants");
    expect(seriesLabel("autre", translations)).toBe("autre");
    expect(seriesLabel(3, translations)).toBe(3);
  });
});

/** Survole le graphique pour afficher l'infobulle (recharts calcule l'élément actif à partir de la position). */
const hover = (container: HTMLElement) => {
  const surface = container.querySelector(".recharts-wrapper") as HTMLElement;
  fireEvent.mouseMove(surface, { clientX: 200, clientY: 150 });
};

describe("Graphiques de campagne", () => {
  it.each([
    ["CityBarChart", CityBarChart, "Territoires par ville"],
    ["TerritoryTypeBarChart", TerritoryTypeBarChart, "Territoires par type"],
  ] as const)(
    "%s : légende et infobulle traduites",
    async (_, Chart, title) => {
      const { container } = render(
        <Chart
          data={
            [
              { name: "Rennes", used: 3, available: 2 },
              { name: "Cesson", used: 1, available: 4 },
            ] as never
          }
          statusTranslations={translations}
        />
      );

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText("Utilisés")).toBeInTheDocument();
      expect(screen.getByText("Restants")).toBeInTheDocument();

      hover(container);
      await waitFor(() =>
        expect(
          container.querySelector(".recharts-tooltip-item-name")
        ).not.toBeNull()
      );
      expect(
        [...container.querySelectorAll(".recharts-tooltip-item-name")]
          .map((e) => e.textContent)
          .sort()
      ).toEqual(["Restants", "Utilisés"]);
    }
  );
});
