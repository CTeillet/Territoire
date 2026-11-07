import { z } from "zod";

export const ROLES = [
  "ADMIN",
  "UTILISATEUR",
  "GESTIONNAIRE",
  "SUPERVISEUR",
] as const;
export type Role = (typeof ROLES)[number];
export const RoleSchema = z.enum(ROLES);

/** Création, clôture et suppression de campagnes (cf. CampaignController). */
export const canManageCampaigns = (role?: Role | null): boolean =>
  role === "ADMIN" || role === "SUPERVISEUR";

/**
 * Attribution, retour, prolongation, correction des dates d'attribution, territoires perdus et remise à
 * disposition d'un territoire en attente (cf. TerritoryController, AssignmentController).
 */
export const canManageAssignments = (role?: Role | null): boolean =>
  role === "ADMIN" || role === "SUPERVISEUR" || role === "GESTIONNAIRE";

/**
 * Carte d'un territoire : import d'une image et génération de la carte physique
 * (cf. TerritoryController, TerritoryCardController).
 */
export const canManageTerritoryCards = (role?: Role | null): boolean =>
  role === "ADMIN" || role === "SUPERVISEUR";

/** Création, modification et suppression de personnes (cf. PersonController). */
export const canManagePersons = (role?: Role | null): boolean =>
  role === "ADMIN" || role === "SUPERVISEUR";

/**
 * Réglages de l'assemblée, récapitulatif des retards et vérifications manuelles
 * (cf. SettingController, LateTerritoryReportController, AssignmentController).
 */
export const canManageSettings = (role?: Role | null): boolean =>
  role === "ADMIN" || role === "SUPERVISEUR";

/** Mise à jour des territoires restants d'une campagne. */
export const canEditCampaignProgress = (role?: Role | null): boolean =>
  canManageCampaigns(role) || role === "GESTIONNAIRE";
