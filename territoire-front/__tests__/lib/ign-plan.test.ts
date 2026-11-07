import { describe, it, expect } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import { DEFAULT_PLAN_THEMES, filterStyle, themeOf } from "@/lib/ign-plan";

/** Couches réelles du style Plan IGN (identifiant et données). */
const layer = (id: string, source?: string) =>
  ({ id, "source-layer": source }) as { id: string; "source-layer"?: string };

describe("Thèmes du plan IGN", () => {
  it("sépare les maisons des bâtiments qui servent de repères", () => {
    expect(
      themeOf(layer("bati surfacique quelconque - Zoom 16,17,18", "bati_surf"))
    ).toBe("HOUSES");
    expect(
      themeOf(layer("bati surfacique mairie - Zoom 15,16,17,18", "bati_surf"))
    ).toBe("BUILDINGS");
  });

  it("range les parcs avec la végétation et les autres zones à part", () => {
    expect(
      themeOf(layer("ocs - vegetation - forêt ouverte", "ocs_vegetation_surf"))
    ).toBe("VEGETATION");
    expect(themeOf(layer("bati ZAI - Vert clair 14à18", "bati_zai"))).toBe(
      "VEGETATION"
    );
    expect(themeOf(layer("bati ZAI - Gris clair", "bati_zai"))).toBe("ZONES");
  });

  it("classe limites, relief, cadastre, numéros et noms de lieux", () => {
    expect(themeOf(layer("Limite - cloture", "limite_lin"))).toBe("LIMITS");
    expect(themeOf(layer("oro - courbe", "oro_courbe"))).toBe("RELIEF");
    expect(
      themeOf(layer("parcellaire - parcelle bordure", "parcellaire_parcelle"))
    ).toBe("CADASTRE");
    expect(
      themeOf(
        layer(
          "toponyme - parcellaire - adresse",
          "toponyme_parcellaire_adresse_ponc"
        )
      )
    ).toBe("NUMBERS");
    expect(themeOf(layer("toponyme quartier", "toponyme_localite_ponc"))).toBe(
      "PLACES"
    );
  });

  it("garde toujours le fond, les rues, leurs noms et l'eau", () => {
    expect(themeOf(layer("bckgrd", "fond_opaque"))).toBeNull();
    expect(themeOf(layer("routier route - filet", "routier_route"))).toBeNull();
    expect(
      themeOf(
        layer("toponyme - odonyme abrégé", "toponyme_routier_odonyme_lin")
      )
    ).toBeNull();
    expect(themeOf(layer("hydro surfacique", "hydro_surf"))).toBeNull();
  });

  it("retire du style les couches des thèmes cachés", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [
        layer("bckgrd", "fond_opaque"),
        layer("bati surfacique quelconque - Zoom 15", "bati_surf"),
        layer("bati surfacique mairie - Zoom 14", "bati_surf"),
        layer("ocs - vegetation - vigne", "ocs_vegetation_surf"),
      ],
    } as unknown as StyleSpecification;

    const ids = filterStyle(style, DEFAULT_PLAN_THEMES).layers.map((l) => l.id);

    expect(ids).toEqual(["bckgrd", "bati surfacique mairie - Zoom 14"]);
  });
});
