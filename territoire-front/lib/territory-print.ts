import { authFetch } from "@/utils/auth-fetch";
import { Territory } from "@/models/territory";

/** Feuille A4 paysage découpée en 2 × 2 : chaque carte occupe un quart de feuille (A6 paysage). */
export const CARDS_PER_SHEET = 4;

// Téléchargements simultanés : chaque image pèse quelques centaines de ko
const MAX_CONCURRENT_LOADS = 4;

// Un pixel est du fond s'il est transparent ou presque blanc sur chaque canal (tolère le bruit des JPEG)
const WHITE_THRESHOLD = 235;
const MIN_ALPHA = 16;
// Ligne ou colonne comptant moins de pixels utiles : poussière de numérisation, ignorée
const MIN_CONTENT_PIXELS = 2;
// Détection sur une copie réduite de l'image : rapide, et le lissage efface les poussières isolées
const DETECTION_SIZE = 400;
// Marge gardée autour de la partie utile, en fraction du plus grand côté de l'image
const CROP_MARGIN = 0.015;
// Partie utile couvrant presque toute l'image : imprimée telle quelle, sans réencoder l'image
const KEEP_WHOLE_RATIO = 0.95;

/** Rectangle en pixels de l'image. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Carte d'un territoire à imprimer : URL blob: de l'image, sans ses marges blanches. */
export type MapState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

/** Découpe une liste en paquets de `size` éléments (le dernier peut être incomplet). */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Ordre « naturel » des noms : PVP2 avant PVP10. */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });
}

/** Ville d'un territoire : un nom dans le GeoJSON de la liste, un objet City dans le détail. */
export function cityName(territory: Pick<Territory, "city">): string {
  const city = territory.city as Territory["city"] | string | null;
  return typeof city === "string" ? city : (city?.name ?? "");
}

/**
 * Partie utile d'une image RGBA (ImageData.data) : rectangle qui englobe tout ce qui n'est pas du fond blanc.
 * null pour une image entièrement blanche.
 */
export function findContentBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Rect | null {
  const rows = new Uint32Array(height);
  const columns = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const background =
        pixels[i + 3] < MIN_ALPHA ||
        (pixels[i] > WHITE_THRESHOLD &&
          pixels[i + 1] > WHITE_THRESHOLD &&
          pixels[i + 2] > WHITE_THRESHOLD);
      if (!background) {
        rows[y]++;
        columns[x]++;
      }
    }
  }

  const hasContent = (count: number) => count >= MIN_CONTENT_PIXELS;
  const top = rows.findIndex(hasContent);
  const left = columns.findIndex(hasContent);
  if (top < 0 || left < 0) return null;
  let bottom = height - 1;
  while (!hasContent(rows[bottom])) bottom--;
  let right = width - 1;
  while (!hasContent(columns[right])) right--;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Partie utile d'une image chargée, dans le sens d'affichage (orientation EXIF appliquée, comme par le canvas).
 * Toute l'image si la détection est impossible (canvas indisponible) ou ne trouve rien.
 */
export function contentCrop(image: HTMLImageElement): Rect {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const whole = { x: 0, y: 0, width, height };

  const scale = Math.min(1, DETECTION_SIZE / Math.max(width, height));
  const reducedWidth = Math.max(1, Math.round(width * scale));
  const reducedHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = reducedWidth;
  canvas.height = reducedHeight;

  let bounds: Rect | null;
  try {
    const context = canvas.getContext("2d");
    if (!context) return whole;
    context.drawImage(image, 0, 0, reducedWidth, reducedHeight);
    bounds = findContentBounds(
      context.getImageData(0, 0, reducedWidth, reducedHeight).data,
      reducedWidth,
      reducedHeight
    );
  } catch {
    return whole;
  }
  if (!bounds) return whole;

  // Retour aux pixels de l'image d'origine, avec une petite marge
  const margin = Math.max(width, height) * CROP_MARGIN;
  const x = Math.max(0, Math.floor(bounds.x / scale - margin));
  const y = Math.max(0, Math.floor(bounds.y / scale - margin));
  const right = Math.min(
    width,
    Math.ceil((bounds.x + bounds.width) / scale + margin)
  );
  const bottom = Math.min(
    height,
    Math.ceil((bounds.y + bounds.height) / scale + margin)
  );
  return { x, y, width: right - x, height: bottom - y };
}

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image de la carte illisible"));
    image.src = url;
  });
}

/** Partie de l'image découpée en PNG ; null si le canvas est indisponible. */
function cropImage(image: HTMLImageElement, crop: Rect): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  try {
    const context = canvas.getContext("2d");
    if (!context) return Promise.resolve(null);
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Charge la carte d'un territoire (GET /api/territoires/{id}/carte) et renvoie l'URL blob: à imprimer.
 * Certaines cartes sont des A4 numérisés où la carte n'occupe qu'un coin : on n'en garde que la partie utile.
 */
export async function loadPrintableMap(territoryId: string): Promise<string> {
  const response = await authFetch(`/api/territoires/${territoryId}/carte`);
  if (!response.ok) {
    throw new Error(`Carte du territoire introuvable (${response.status})`);
  }
  const url = URL.createObjectURL(await response.blob());
  let image: HTMLImageElement;
  try {
    image = await decodeImage(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  const crop = contentCrop(image);
  const area = image.naturalWidth * image.naturalHeight;
  if (crop.width * crop.height > KEEP_WHOLE_RATIO * area) return url;
  const cropped = await cropImage(image, crop);
  if (!cropped) return url;
  URL.revokeObjectURL(url);
  return URL.createObjectURL(cropped);
}

/**
 * Chargement des cartes à imprimer, au plus MAX_CONCURRENT_LOADS à la fois. Une carte chargée est gardée
 * jusqu'à dispose(), même si son territoire est désélectionné ; une carte encore en file qui n'est plus
 * voulue n'est pas téléchargée.
 */
export function createPrintableMapLoader(
  onChange: (territoryId: string, state: MapState) => void,
  load: (territoryId: string) => Promise<string> = loadPrintableMap
) {
  const requested = new Set<string>();
  const queue: string[] = [];
  const urls: string[] = [];
  let wanted = new Set<string>();
  let active = 0;
  let disposed = false;

  const next = () => {
    while (!disposed && active < MAX_CONCURRENT_LOADS && queue.length > 0) {
      const territoryId = queue.shift()!;
      if (!wanted.has(territoryId)) {
        requested.delete(territoryId);
        continue;
      }
      active++;
      load(territoryId)
        .then(
          (url) => {
            if (disposed) {
              URL.revokeObjectURL(url);
              return;
            }
            urls.push(url);
            onChange(territoryId, { status: "ready", url });
          },
          () => {
            if (!disposed) onChange(territoryId, { status: "error" });
          }
        )
        .finally(() => {
          active--;
          next();
        });
    }
  };

  return {
    /** Territoires sélectionnés : ceux qui n'ont pas encore été demandés partent en chargement. */
    want(territoryIds: string[]) {
      wanted = new Set(territoryIds);
      territoryIds.forEach((territoryId) => {
        if (!requested.has(territoryId)) {
          requested.add(territoryId);
          queue.push(territoryId);
        }
      });
      next();
    },
    /** Page quittée : plus de chargement, images libérées. */
    dispose() {
      disposed = true;
      urls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
