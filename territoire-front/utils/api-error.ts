/** Motif renvoyé par l'API ({ error }, cf. GlobalExceptionHandler) ou message par défaut. */
export async function apiErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Comme {@link apiErrorMessage}, pour un endpoint qui répond aussi en texte brut (ex. import Excel) :
 * motif JSON ({ error }), sinon le texte s'il est court et lisible, sinon `fallback`.
 */
export async function apiErrorText(
  res: Response,
  fallback: string
): Promise<string> {
  let text: string;
  try {
    text = (await res.text()).trim();
  } catch {
    return fallback;
  }
  try {
    const body = JSON.parse(text);
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    // Texte brut : affiché, sauf vide, trop long ou page HTML (ex. erreur du proxy)
    return text && !text.startsWith("<") && text.length <= 300
      ? text
      : fallback;
  }
}
