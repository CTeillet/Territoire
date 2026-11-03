import type { Assignment } from "@/models/assignment";
import { assignmentLabelText } from "@/lib/assignment-label";

const NATIVE_PRINT_KEY = "labelPrinter.iosNative";

/** Choix local du navigateur ; ne permet pas de détecter si l'app iOS est installée. */
export function isNativeLabelPrintingEnabled(): boolean {
  try {
    return localStorage.getItem(NATIVE_PRINT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setNativeLabelPrintingEnabled(enabled: boolean): boolean {
  try {
    localStorage.setItem(NATIVE_PRINT_KEY, String(enabled));
    return enabled;
  } catch {
    return false;
  }
}

/** Lien destiné à l'app TMS Impression 1.1+ ; aucun identifiant de compte ni commande raster. */
export function nativeAssignmentLabelURL(
  assignment: Pick<Assignment, "person" | "dueDate">,
  requestID: string = crypto.randomUUID()
): string | null {
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
  // encodeURIComponent utilise %20 pour les espaces : URLComponents côté iOS
  // ne traite pas le signe + comme le ferait un formulaire HTML.
  const parameters = { v: "1", id: requestID, name, dueDate };
  return `tmsprint://print?${Object.entries(parameters)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&")}`;
}
