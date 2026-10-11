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

/** Mise à jour des territoires restants d'une campagne. */
export const canEditCampaignProgress = (role?: Role | null): boolean =>
  canManageCampaigns(role) || role === "GESTIONNAIRE";
