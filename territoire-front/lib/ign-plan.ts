/**
 * Plan IGN vectoriel, dessiné dans le navigateur depuis les tuiles de la Géoplateforme : fond des cartes de
 * l'application (cf. components/map/ign-base-layer.tsx) et plan de la carte physique. On y montre ou cache des
 * thèmes (maisons, végétation…), ce que les tuiles images ne permettent pas, et les noms de rue gardent leur taille
 * quel que soit le zoom. Le style est celui du Plan IGN, dont on retire les couches des thèmes cachés.
 */
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { CardMapLayout } from "@/models/card-map-layout";
import type { PlanTheme } from "@/models/plan-theme";

export const IGN_PLAN_STYLE_URL =
  "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json";

/** Le plan est dessiné à deux pixels par pixel CSS du cadre : la résolution de la carte imprimée. */
const PIXEL_RATIO = 2;
/** Au-delà, le plan est tenu pour inaccessible : l'IGN répond d'ordinaire en une ou deux secondes. */
const RENDER_TIMEOUT_MS = 30_000;

export const PLAN_ERROR =
  "Le plan IGN n'a pas pu être chargé en entier : réessayez dans un instant";

/** Attribution du fond, affichée sur les cartes (licence ouverte Etalab). */
export const IGN_ATTRIBUTION =
  '&copy; <a href="https://www.ign.fr/">IGN</a> – Plan IGN';

/**
 * Zoom maximal des cartes Leaflet. Le fond IGN n'arrive qu'après la création de la carte : sans ce plafond, cadrer
 * un seul point (le centre d'une ville, sur la fiche d'un territoire sans pâté) donnerait un zoom infini.
 */
export const MAP_MAX_ZOOM = 19;

const VEGETATION_SOURCES = [
  "ocs_vegetation_surf",
  "ocs_nature_sol_surf",
  "toponyme_ocs_ponc",
  "toponyme_ocs_lin",
];
const LIMIT_SOURCES = ["limite_lin", "toponyme_limite_ponc", "bati_lin"];
const PLACE_SOURCES = [
  "toponyme_localite_ponc",
  "toponyme_bati_ponc",
  "bati_ponc",
];

/** Thème d'une couche du style Plan IGN, d'après ses données (« source-layer ») ; null si elle reste toujours. */
export function themeOf(layer: {
  id: string;
  "source-layer"?: string;
}): PlanTheme | null {
  const source = layer["source-layer"] ?? "";
  // Les maisons sont le bâti « quelconque » ; mairies, écoles, gares… restent des repères
  if (source === "bati_surf")
    return layer.id.startsWith("bati surfacique quelconque")
      ? "HOUSES"
      : "BUILDINGS";
  // Zones d'activité et d'intérêt : les vertes sont des parcs
  if (source === "bati_zai")
    return layer.id.includes("Vert") ? "VEGETATION" : "ZONES";
  if (source === "bati_zone_surf") return "ZONES";
  if (VEGETATION_SOURCES.includes(source)) return "VEGETATION";
  if (LIMIT_SOURCES.includes(source)) return "LIMITS";
  if (source.startsWith("oro_") || source.startsWith("toponyme_oro_"))
    return "RELIEF";
  if (source === "toponyme_parcellaire_adresse_ponc") return "NUMBERS";
  if (
    source.startsWith("parcellaire_") ||
    source.startsWith("toponyme_parcellaire_")
  )
    return "CADASTRE";
  if (PLACE_SOURCES.includes(source)) return "PLACES";
  return null;
}

/** Données des noms de rue du Plan IGN : abrégés (« AV DES MARRONNIERS ») jusqu'au zoom 17, en entier au-delà. */
const STREET_NAMES_SOURCE = "toponyme_routier_odonyme_lin";
/**
 * Sur la carte imprimée (A6), le cadre du plan fait 14 cm pour 828 pixels CSS : les noms de rue du Plan IGN, en 10 et
 * 11 pixels, n'y font que 1,7 mm. On les grossit et on les passe en semi-gras pour qu'ils se lisent, même en noir et
 * blanc. Plus gros, ils se gêneraient : sur le plan large de S148, déjà trois noms de rue n'ont plus de place.
 */
const CARD_STREET_NAME_SCALE = 1.4;
const CARD_STREET_NAME_FONT = ["Source Sans Pro Semibold"];
/** Taille du texte quand le style n'en donne pas (valeur par défaut de MapLibre). */
const DEFAULT_TEXT_SIZE = 16;

/**
 * Taille de texte multipliée, fixe ou par paliers de zoom (les deux formes du style Plan IGN) ; null si le style
 * l'écrit autrement, en expression par exemple.
 */
function scaleTextSize(size: unknown, scale: number) {
  if (size === undefined) return DEFAULT_TEXT_SIZE * scale;
  if (typeof size === "number") return size * scale;
  if (size !== null && typeof size === "object" && "stops" in size) {
    const fn = size as { stops: [number, number][] };
    return {
      ...fn,
      stops: fn.stops.map(([zoom, value]) => [zoom, value * scale]),
    };
  }
  return null;
}

/**
 * Noms de rue du plan de la carte physique, grossis et en semi-gras. Une rue courte (souvent celle qui longe le
 * territoire) n'a pas toujours la place d'écrire son nom en grand : une copie à la taille d'origine, placée sous la
 * couche grossie, le lui écrit en petit. MapLibre place d'abord les couches du dessus, et ne garde la copie que là
 * où elle ne chevauche aucun nom déjà écrit.
 */
export function enlargeStreetNames(
  style: StyleSpecification
): StyleSpecification {
  return {
    ...style,
    layers: style.layers.flatMap((layer: LayerSpecification) => {
      if (
        layer.type !== "symbol" ||
        layer["source-layer"] !== STREET_NAMES_SOURCE
      )
        return [layer];
      const size = scaleTextSize(
        layer.layout?.["text-size"],
        CARD_STREET_NAME_SCALE
      );
      const semibold = {
        ...layer,
        layout: { ...layer.layout, "text-font": CARD_STREET_NAME_FONT },
      };
      if (size === null) return [semibold];
      return [
        { ...semibold, id: `${layer.id} - repli` },
        {
          ...semibold,
          layout: { ...semibold.layout, "text-size": size },
        } as LayerSpecification,
      ];
    }),
  };
}

/** Style Plan IGN sans les couches des thèmes cachés. */
export function filterStyle(
  style: StyleSpecification,
  shownThemes: readonly PlanTheme[]
): StyleSpecification {
  return {
    ...style,
    layers: style.layers.filter((layer: LayerSpecification) => {
      const theme = themeOf(layer as { id: string; "source-layer"?: string });
      return theme === null || shownThemes.includes(theme);
    }),
  };
}

let stylePromise: Promise<StyleSpecification> | null = null;

/** Style Plan IGN, chargé une fois par page (et de nouveau après un échec). */
export function loadIgnStyle(): Promise<StyleSpecification> {
  stylePromise ??= fetch(IGN_PLAN_STYLE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(PLAN_ERROR);
      return response.json() as Promise<StyleSpecification>;
    })
    .catch((error) => {
      stylePromise = null;
      throw error;
    });
  return stylePromise;
}

/**
 * Dessine le plan IGN sur l'emprise de la carte, hors de l'écran, et le renvoie en PNG. Échoue si une tuile manque
 * (la carte imprimée aurait un trou) ou si l'IGN ne répond pas.
 */
export async function renderIgnPlan(
  layout: CardMapLayout,
  shownThemes: readonly PlanTheme[]
): Promise<Blob> {
  const [{ default: maplibregl }, style] = await Promise.all([
    import("@/lib/maplibre"),
    loadIgnStyle(),
  ]);

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  });
  document.body.appendChild(container);

  const map = new maplibregl.Map({
    container,
    style: enlargeStreetNames(filterStyle(style, shownThemes)),
    bounds: [
      [layout.west, layout.south],
      [layout.east, layout.north],
    ],
    pixelRatio: PIXEL_RATIO,
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    // Pour relire l'image une fois le plan dessiné
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });
  try {
    // MapLibre avance d'image en image : onglet en arrière-plan, il attend qu'on y revienne (ou le délai)
    await new Promise<void>((resolve, reject) => {
      // Première erreur de MapLibre (tuile, police, icône…), gardée comme cause pour la console
      let failure: unknown = null;
      const timer = setTimeout(
        () => reject(new Error(PLAN_ERROR, { cause: "délai dépassé" })),
        RENDER_TIMEOUT_MS
      );
      map.on("error", (event) => {
        failure ??= event.error ?? event;
      });
      map.once("idle", () => {
        clearTimeout(timer);
        if (failure) reject(new Error(PLAN_ERROR, { cause: failure }));
        else resolve();
      });
    });
    return await new Promise<Blob>((resolve, reject) =>
      map
        .getCanvas()
        .toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error(PLAN_ERROR))),
          "image/png"
        )
    );
  } finally {
    map.remove();
    container.remove();
  }
}
