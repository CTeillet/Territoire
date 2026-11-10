"use client";

import { ReactNode } from "react";
import { useIsClient } from "@/hooks/use-is-client";

/**
 * Rend ses enfants seulement dans le navigateur, une fois l'hydratation faite. La session (cookies, lus dans le
 * store au chargement) n'existe pas au rendu serveur : tout ce qui en dépend (connexion, rôle) y rendrait autre
 * chose que dans le navigateur, et l'hydratation échouerait.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  return useIsClient() ? children : null;
}
