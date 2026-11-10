/** Résultat d'un envoi WhatsApp de test (cf. WhatsAppTestResultDto). */
export interface WhatsAppTestResult {
  sent: boolean;
  recipient: string;
  phoneNumber: string;
  /** Cause de l'échec renvoyée par le serveur ; null si le message est parti. */
  error: string | null;
}

/** État des envois WhatsApp (cf. WhatsAppStatusDto) : `failing` quand le dernier envoi a échoué. */
export interface WhatsAppStatus {
  failing: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailure: string | null;
}
