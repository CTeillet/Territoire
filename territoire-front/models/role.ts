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

/** Attribution, retour, prolongation et correction des dates d'attribution (cf. TerritoryController, AssignmentController). */
export const canManageAssignments = (role?: Role | null): boolean =>
  role === "ADMIN" || role === "SUPERVISEUR" || role === "GESTIONNAIRE";

/** Mise à jour des territoires restants d'une campagne. */
export const canEditCampaignProgress = (role?: Role | null): boolean =>
  canManageCampaigns(role) || role === "GESTIONNAIRE";
