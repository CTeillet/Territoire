/** Réglages du récapitulatif hebdomadaire des retards (cf. LateReportSettingsDto). */
export interface LateReportSettings {
  recipients: string[];
  /** Un serveur SMTP est configuré sur le serveur ; sans lui, rien n'est envoyé. */
  mailConfigured: boolean;
}

/** Résultat d'un envoi immédiat du récapitulatif (cf. LateReportSendResultDto). */
export interface LateReportSendResult {
  lateTerritories: number;
  recipients: string[];
}
