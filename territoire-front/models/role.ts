import { z } from "zod";

export const ROLES = ["ADMIN", "UTILISATEUR", "GESTIONNAIRE", "SUPERVISEUR"] as const;
export type Role = (typeof ROLES)[number];
export const RoleSchema = z.enum(ROLES);
