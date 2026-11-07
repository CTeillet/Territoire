/**
 * Plan IGN d'une carte physique, dessiné dans le navigateur depuis les tuiles vectorielles de la Géoplateforme : on
 * y montre ou cache des thèmes (maisons, végétation…), ce que les tuiles images ne permettent pas, et les noms de rue
 * gardent leur taille quel que soit le cadrage. Le style est celui du Plan IGN, dont on retire les couches cachées.
 */
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { CardMapLayout } from "@/models/card-map-layout";

export const IGN_PLAN_STYLE_URL =
  "https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json";

/** Le plan est dessiné à deux pixels par pixel CSS du cadre : la résolution de la carte imprimée. */
const PIXEL_RATIO = 2;
/** Au-delà, le plan est tenu pour inaccessible : l'IGN répond d'ordinaire en une ou deux secondes. */
const RENDER_TIMEOUT_MS = 30_000;

export const PLAN_ERROR =
  "Le plan IGN n'a pas pu être chargé en entier : réessayez dans un instant";

/**
 * Thèmes du plan qu'on peut montrer ou cacher. Les rues, leurs noms, l'eau et les voies ferrées restent toujours :
 * c'est ce qui sert à trouver le territoire.
 */
export const PLAN_THEMES = [
  { id: "PLACES", label: "Noms de lieux et repères", shownByDefault: true },
  {
    id: "BUILDINGS",
    label: "Bâtiments publics et commerciaux",
    shownByDefault: true,
  },
  { id: "HOUSES", label: "Maisons", shownByDefault: false },
  { id: "VEGETATION", label: "Végétation et parcs", shownByDefault: false },
  {
    id: "ZONES",
    label: "Zones (écoles, parkings, activités)",
    shownByDefault: false,
  },
  {
    id: "LIMITS",
    label: "Limites de commune, clôtures et murs",
    shownByDefault: false,
  },
  { id: "RELIEF", label: "Relief", shownByDefault: false },
  { id: "CADASTRE", label: "Cadastre", shownByDefault: false },
  { id: "NUMBERS", label: "Numéros de rue", shownByDefault: false },
] as const;

export type PlanTheme = (typeof PLAN_THEMES)[number]["id"];

export const DEFAULT_PLAN_THEMES: PlanTheme[] = PLAN_THEMES.filter(
  (theme) => theme.shownByDefault
).map((theme) => theme.id);

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
function loadStyle(): Promise<StyleSpecification> {
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
    import("maplibre-gl"),
    loadStyle(),
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
    style: filterStyle(style, shownThemes),
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
