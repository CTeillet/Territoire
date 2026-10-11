const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";

/** Longueur minimale exigée par le backend (RegisterRequest.PASSWORD_MIN_LENGTH). */
export const PASSWORD_MIN_LENGTH = 10;

/**
 * Génère un mot de passe aléatoire avec un générateur cryptographique
 * (Math.random() est prévisible et ne doit pas servir à produire des secrets).
 * Le tirage par rejet évite le biais du modulo.
 */
export const generatePassword = (length: number = 12): string => {
  const max = Math.floor(256 / CHARSET.length) * CHARSET.length;
  const result: string[] = [];
  const buffer = new Uint8Array(length * 2);

  while (result.length < length) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (byte < max) {
        result.push(CHARSET[byte % CHARSET.length]);
        if (result.length === length) break;
      }
    }
  }
  return result.join("");
};
