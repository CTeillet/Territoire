import { toast } from "sonner";
import { Assignment } from "@/models/assignment";
import { Bitmap, DOTS_PER_MM } from "@/lib/ptouch";
import {
  getLabelPrinter,
  isAutoPrintEnabled,
  isLabelPrintingSupported,
  printLabel,
} from "@/lib/label-printer";
import { buildLabelLbx } from "@/lib/lbx";
import { safeFileName } from "@/lib/file-share";
import {
  isNativeApp,
  nativePrintLabel,
  openNativePrinterSettings,
} from "@/lib/native-app";

/** Étiquette d'une attribution, collée sur la carte du territoire : à qui il est confié et pour quand. */
export interface LabelText {
  /** Prénom et initiale du nom : « Corentin T. » */
  name: string;
  /** « À rendre le 03/03/2027 » */
  dueDate: string;
}

const FONT_FAMILY = "Arial, Helvetica, sans-serif";
// Le nom est plus grand que la date ; un petit espace les sépare
const NAME_TO_DATE_RATIO = 1.3;
const LINE_GAP_RATIO = 0.04;
const PADDING_MM = 2;
// Repli pour les navigateurs sans fontBoundingBox* : proportions d'Arial
const DEFAULT_ASCENT = 0.905;
const DEFAULT_DESCENT = 0.212;

// Date du backend (AAAA-MM-JJ) recopiée telle quelle : sans objet Date, pas de décalage de fuseau horaire
const formatDay = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

/** Prénom, initiale du nom et échéance ; null pour une attribution sans personne (campagne). */
export function assignmentLabelText(
  assignment: Pick<Assignment, "person" | "dueDate"> | null | undefined
): LabelText | null {
  const person = assignment?.person;
  if (!person || !assignment.dueDate) return null;
  const initial = person.lastName.trim().charAt(0).toLocaleUpperCase("fr");
  return {
    name: [person.firstName.trim(), initial && `${initial}.`]
      .filter(Boolean)
      .join(" "),
    dueDate: `À rendre le ${formatDay(assignment.dueDate)}`,
  };
}

/**
 * Dessine l'étiquette sur `height` points de haut (largeur imprimable du ruban) : le nom en gras, la date
 * dessous, centrés, avec 2 mm de marge à chaque bout.
 */
export function renderLabel(text: LabelText, height: number): Bitmap {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Dessin de l'étiquette impossible");

  const nameFont = (size: number) => `bold ${size}px ${FONT_FAMILY}`;
  const dateFont = (size: number) => `${size}px ${FONT_FAMILY}`;

  // Hauteur d'une ligne : ascendante + descendante de la police, communes à tous les textes
  context.font = nameFont(100);
  const metrics = context.measureText(text.name);
  const ascent = (metrics.fontBoundingBoxAscent ?? 100 * DEFAULT_ASCENT) / 100;
  const descent =
    (metrics.fontBoundingBoxDescent ?? 100 * DEFAULT_DESCENT) / 100;
  const gap = Math.round(height * LINE_GAP_RATIO);
  const dateSize =
    (height - gap) / ((ascent + descent) * (1 + NAME_TO_DATE_RATIO));
  const nameSize = dateSize * NAME_TO_DATE_RATIO;

  const padding = Math.round(PADDING_MM * DOTS_PER_MM);
  context.font = nameFont(nameSize);
  const nameWidth = context.measureText(text.name).width;
  context.font = dateFont(dateSize);
  const dateWidth = context.measureText(text.dueDate).width;
  const width = Math.ceil(Math.max(nameWidth, dateWidth)) + 2 * padding;

  // Redimensionner le canvas réinitialise le contexte (police, couleurs)
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.font = nameFont(nameSize);
  context.fillText(text.name, width / 2, ascent * nameSize);
  context.font = dateFont(dateSize);
  context.fillText(
    text.dueDate,
    width / 2,
    (ascent + descent) * nameSize + gap + ascent * dateSize
  );

  // Seuil à mi-gris : le lissage des lettres devient des points pleins ou vides
  const pixels = context.getImageData(0, 0, width, height).data;
  const ink = new Uint8Array(width * height);
  for (let i = 0; i < ink.length; i++) {
    const luminance =
      0.299 * pixels[i * 4] +
      0.587 * pixels[i * 4 + 1] +
      0.114 * pixels[i * 4 + 2];
    ink[i] = luminance < 128 ? 1 : 0;
  }
  return { width, height, ink };
}

/** Étiquette d'une attribution en fichier LBX, pour P-touch Design&Print 2. */
export interface LabelFile {
  text: LabelText;
  file: File;
}

/** Fichier LBX de l'étiquette ; null pour une attribution sans personne (campagne). */
export function assignmentLabelFile(
  assignment: Pick<Assignment, "person" | "dueDate"> | null | undefined
): LabelFile | null {
  const text = assignmentLabelText(assignment);
  if (!assignment || !text) return null;
  const bytes = buildLabelLbx(text) as Uint8Array<ArrayBuffer>;
  const name = safeFileName(
    `etiquette ${text.name} ${assignment.dueDate.slice(0, 10)}`,
    "lbx"
  );
  // Type générique : iOS reconnaît le fichier à son extension et propose Design&Print 2
  return {
    text,
    file: new File([bytes], name, { type: "application/octet-stream" }),
  };
}

/** Étiquette confiée à l'app iOS (lien tmsprint ou pont de l'app TMS), qui la dessine elle-même. */
export interface NativeLabel {
  /** Identifiant du travail : l'app n'envoie jamais deux fois le même à l'imprimante. */
  id: string;
  name: string;
  /** AAAA-MM-JJ */
  dueDate: string;
}

/** Mêmes contrôles que l'app iOS ; null pour une attribution sans personne (campagne). */
export function nativeLabel(
  assignment: Pick<Assignment, "person" | "dueDate">,
  id: string = crypto.randomUUID()
): NativeLabel | null {
  const text = assignmentLabelText(assignment);
  if (!text) return null;
  const name = text.name.replace(/\s+/gu, " ").trim();
  const dueDate = assignment.dueDate.slice(0, 10);
  if (
    !name ||
    Array.from(name).length > 128 ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dueDate)
  ) {
    throw new Error("Le nom ou la date de l'étiquette est invalide.");
  }
  return { id, name, dueDate };
}

/**
 * Imprime l'étiquette d'une attribution, avec un message de suivi (et « Réessayer » en cas d'échec) : par l'app
 * iOS TMS quand le site y est affiché, sinon par Web Serial.
 */
export async function printAssignmentLabel(
  assignment: Pick<Assignment, "person" | "dueDate">
): Promise<void> {
  const text = assignmentLabelText(assignment);
  if (!text) return;
  const app = isNativeApp();
  const id = toast.loading(`Impression de l'étiquette de ${text.name}…`);
  try {
    if (app) await nativePrintLabel(nativeLabel(assignment)!);
    else await printLabel((height) => renderLabel(text, height));
    toast.success(`Étiquette de ${text.name} imprimée`, { id });
  } catch (error) {
    toast.error((error as Error).message, {
      id,
      action: {
        label: "Réessayer",
        onClick: () => void printAssignmentLabel(assignment),
      },
      // Imprimante éteinte, non appairée ou plusieurs P710BT : l'écran de l'app permet de s'en occuper
      ...(app
        ? {
            cancel: {
              label: "Imprimante",
              onClick: openNativePrinterSettings,
            },
          }
        : {}),
    });
  }
}

/**
 * Après une attribution : l'étiquette s'imprime si cet appareil a une imprimante et l'impression automatique
 * activée. Sinon rien ne se passe.
 */
export async function autoPrintAssignmentLabel(
  assignment: Pick<Assignment, "person" | "dueDate"> | null | undefined
): Promise<void> {
  if (!assignment || !isLabelPrintingSupported() || !isAutoPrintEnabled()) {
    return;
  }
  if (!(await getLabelPrinter())) return;
  await printAssignmentLabel(assignment);
}
