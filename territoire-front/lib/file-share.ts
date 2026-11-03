/**
 * Fichier généré dans le navigateur, remis à l'utilisateur. Ces fonctions sont à appeler depuis un clic : Safari
 * refuse un partage, et peut bloquer un téléchargement, qui ne part pas d'un geste de l'utilisateur.
 */

/** Nom de fichier sûr et lisible : lettres sans accents, chiffres et tirets, en minuscules. */
export function safeFileName(base: string, extension: string): string {
  const name = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return `${name || "fichier"}.${extension}`;
}

/** Téléchargement par le navigateur (sur iPhone : dossier Téléchargements de l'app Fichiers). */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari lit le fichier après le clic : l'adresse reste valable une minute
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Le navigateur accepte de partager ce fichier (feuille de partage d'iOS ou d'Android). */
export function canShareFile(file: File): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

/**
 * Feuille de partage du système avec le fichier. Faux si l'utilisateur la ferme sans rien choisir ; rejette si
 * le navigateur refuse le partage (le téléchargement reste possible).
 */
export async function shareFile(file: File): Promise<boolean> {
  try {
    await navigator.share({ files: [file] });
    return true;
  } catch (error) {
    if ((error as Error).name === "AbortError") return false;
    throw error;
  }
}
