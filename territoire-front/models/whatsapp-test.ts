/** Résultat d'un envoi WhatsApp de test (cf. WhatsAppTestResultDto). */
export interface WhatsAppTestResult {
  sent: boolean;
  recipient: string;
  phoneNumber: string;
  /** Cause de l'échec renvoyée par le serveur ; null si le message est parti. */
  error: string | null;
}
