import { describe, it, expect } from "vitest";
import type { StyleSpecification } from "maplibre-gl";
import { enlargeStreetNames, filterStyle, themeOf } from "@/lib/ign-plan";
import { DEFAULT_MAP_THEMES } from "@/models/map-view";

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

    const ids = filterStyle(style, DEFAULT_MAP_THEMES.CARD).layers.map(
      (l) => l.id
    );

    expect(ids).toEqual(["bckgrd", "bati surfacique mairie - Zoom 14"]);
  });
});

describe("Noms de rue de la carte physique", () => {
  /** Couches des noms de rue du style Plan IGN, telles que l'IGN les publie. */
  const streetNames = (id: string, size: unknown) => ({
    id,
    type: "symbol",
    source: "plan_ign",
    "source-layer": "toponyme_routier_odonyme_lin",
    layout: {
      "symbol-placement": "line",
      "text-field": "{nom_gauche}",
      "text-size": size,
      "text-font": ["Source Sans Pro Regular"],
    },
  });
  const styleOf = (...layers: object[]) =>
    ({ version: 8, sources: {}, layers }) as unknown as StyleSpecification;
  const layout = (style: StyleSpecification, id: string) =>
    (style.layers.find((l) => l.id === id) as { layout: object }).layout;

  it("grossit les noms de rue et les passe en semi-gras", () => {
    const style = enlargeStreetNames(
      styleOf(streetNames("toponyme - odonyme abrégé", 10))
    );

    expect(layout(style, "toponyme - odonyme abrégé")).toMatchObject({
      "text-size": 14,
      "text-font": ["Source Sans Pro Semibold"],
      "text-field": "{nom_gauche}",
    });
  });

  it("garde, sous les noms grossis, une copie à la taille d'origine pour les rues courtes", () => {
    const style = enlargeStreetNames(
      styleOf(
        layer("bckgrd", "fond_opaque"),
        streetNames("toponyme - odonyme abrégé", 10),
        layer("toponyme bati ponc gare", "toponyme_bati_ponc")
      )
    );

    // MapLibre place d'abord la couche du dessus : les noms grossis passent avant la copie
    expect(style.layers.map((l) => l.id)).toEqual([
      "bckgrd",
      "toponyme - odonyme abrégé - repli",
      "toponyme - odonyme abrégé",
      "toponyme bati ponc gare",
    ]);
    expect(layout(style, "toponyme - odonyme abrégé - repli")).toMatchObject({
      "text-size": 10,
      "text-font": ["Source Sans Pro Semibold"],
    });
  });

  it("grossit aussi une taille qui varie selon le zoom", () => {
    const style = enlargeStreetNames(
      styleOf(
        streetNames("toponyme - odonyme desabrégé", {
          stops: [
            [15, 10],
            [17, 15],
          ],
        })
      )
    );

    expect(layout(style, "toponyme - odonyme desabrégé")).toMatchObject({
      "text-size": {
        stops: [
          [15, 14],
          [17, 21],
        ],
      },
    });
  });

  it("ne touche ni aux autres textes ni au style d'origine", () => {
    const original = styleOf(
      streetNames("toponyme - odonyme abrégé", 10),
      layer("toponyme bati ponc gare", "toponyme_bati_ponc")
    );
    const copy = structuredClone(original);

    const style = enlargeStreetNames(original);

    expect(style.layers.at(-1)).toEqual(original.layers[1]);
    // Le style chargé une fois par page sert aussi au fond des cartes de l'application
    expect(original).toEqual(copy);
  });
});
