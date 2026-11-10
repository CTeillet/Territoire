import { apiRequest } from "@/utils/api-request";

/** Ligne du journal des actions (cf. AuditEvent). */
export interface AuditEvent {
  id: string;
  occurredAt: string;
  /** E-mail de l'utilisateur, ou « Lien personnel ». */
  actor: string;
  action: string;
  territoryId: string | null;
  territoryName: string | null;
  personId: string | null;
  personName: string | null;
  details: string | null;
}

/** Libellés des actions du journal (cf. AuditAction). */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  TERRITOIRE_CREE: "Territoire créé",
  TERRITOIRE_MODIFIE: "Territoire modifié",
  TERRITOIRE_SUPPRIME: "Territoire supprimé",
  TERRITOIRE_ARCHIVE: "Territoire archivé",
  TERRITOIRE_RESTAURE: "Territoire restauré",
  TERRITOIRE_PERDU: "Signalé perdu",
  TERRITOIRE_RETROUVE: "Retiré des perdus",
  TERRITOIRE_REMIS_DISPONIBLE: "Rendu disponible",
  CARTE_REMPLACEE: "Carte remplacée",
  CARTE_REMISE: "Carte précédente remise",
  ATTRIBUTION: "Attribution",
  RETOUR: "Retour",
  RETOUR_PAR_LIEN: "Retour par le lien personnel",
  PROLONGATION: "Prolongation",
  ANNULATION: "Attribution annulée",
  DATES_MODIFIEES: "Dates modifiées",
  PERSONNE_CREEE: "Personne créée",
  PERSONNE_MODIFIEE: "Personne modifiée",
  PERSONNE_SUPPRIMEE: "Personne supprimée",
  PERSONNE_ARCHIVEE: "Personne partie",
  PERSONNE_RESTAUREE: "Personne restaurée",
  PERSONNE_ANONYMISEE: "Personne anonymisée",
  UTILISATEUR_CREE: "Compte créé",
  ROLE_MODIFIE: "Rôle modifié",
  MOT_DE_PASSE_REINITIALISE: "Mot de passe réinitialisé",
  UTILISATEUR_SUPPRIME: "Compte supprimé",
};

/** Actions les plus récentes d'abord : d'un territoire, d'une personne, ou de toute l'application. */
export const fetchAuditLog = (
  filter: { territoryId?: string; personId?: string } = {}
) => {
  const query = new URLSearchParams(
    Object.entries(filter).filter(([, value]) => !!value) as [string, string][]
  ).toString();
  return apiRequest<AuditEvent[]>(
    `/api/journal${query ? `?${query}` : ""}`,
    {},
    "Impossible de charger le journal des actions"
  );
};
