import type { Assignment } from "@/models/assignment";
import { nativeLabel } from "@/lib/assignment-label";

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
  const label = nativeLabel(assignment, requestID);
  if (!label) return null;
  // encodeURIComponent utilise %20 pour les espaces : URLComponents côté iOS
  // ne traite pas le signe + comme le ferait un formulaire HTML.
  const parameters = { v: "1", ...label };
  return `tmsprint://print?${Object.entries(parameters)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&")}`;
}
