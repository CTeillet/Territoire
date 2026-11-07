import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IgnBaseLayer } from "@/components/map/ign-base-layer";

vi.mock("react-leaflet", () => ({
  useMap: () => ({}),
  TileLayer: ({ url }: { url: string }) => (
    <div data-testid="tiles" data-url={url} />
  ),
}));

describe("Fond IGN d'une carte", () => {
  it("garde le fond OpenStreetMap là où MapLibre ne peut pas dessiner (sans WebGL)", async () => {
    // jsdom n'a pas WebGL, comme un vieux téléphone
    render(<IgnBaseLayer themes={["PLACES"]} />);

    expect(await screen.findByTestId("tiles")).toHaveAttribute(
      "data-url",
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    );
  });
});
