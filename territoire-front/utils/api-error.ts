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
