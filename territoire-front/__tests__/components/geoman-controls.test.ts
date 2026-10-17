import { describe, it, expect, vi } from "vitest";
import type * as L from "leaflet";
import { GeomanControl } from "@/components/territory/id/geoman-controls";

// createControlComponent renvoie directement la fabrique : on teste le contrôle Leaflet lui-même
vi.mock("@react-leaflet/core", () => ({
  createControlComponent: (create: unknown) => create,
}));
vi.mock("@geoman-io/leaflet-geoman-free", () => ({}));

const createControl = GeomanControl as unknown as (props: {
  position: L.ControlPosition;
}) => {
  options: object;
  addTo: (map: unknown) => void;
};

describe("GeomanControl", () => {
  it("n'active que le dessin de polygones, sans magnétisme", () => {
    const pm = { addControls: vi.fn(), setGlobalOptions: vi.fn() };

    const control = createControl({ position: "topleft" });
    control.addTo({ pm });

    expect(control.options).toEqual(
      expect.objectContaining({ position: "topleft" })
    );
    expect(pm.addControls).toHaveBeenCalledWith(
      expect.objectContaining({
        position: "topleft",
        drawPolygon: true,
        drawMarker: false,
        drawCircle: false,
        editMode: false,
        removalMode: false,
      })
    );
    expect(pm.setGlobalOptions).toHaveBeenCalledWith({ snappable: false });
  });

  it("ne fait rien si Geoman n'est pas chargé sur la carte", () => {
    expect(() =>
      createControl({ position: "topright" }).addTo({})
    ).not.toThrow();
  });
});
