/** Durées en mois d'une attribution et de la mise en attente d'un territoire rendu (cf. DurationSettingsDto). */
export interface DurationSettings {
  assignmentDurationMonths: number;
  pendingDurationMonths: number;
}

/** Valeurs du back tant que les durées n'ont pas été réglées. */
export const DEFAULT_DURATION_SETTINGS: DurationSettings = {
  assignmentDurationMonths: 4,
  pendingDurationMonths: 4,
};
