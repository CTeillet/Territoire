"use client";

import { Liquid } from "liquidjs";

// Liquid ne donne accès qu'aux données passées au rendu (pas à JavaScript) :
// les gabarits édités par un SUPERVISEUR ne peuvent pas exécuter de code chez l'ADMIN.
const engine = new Liquid({
  outputEscape: undefined, // texte brut (WhatsApp) : pas d'échappement HTML
  ownPropertyOnly: true, // jamais de propriétés héritées (constructor, __proto__...)
  strictVariables: false,
  strictFilters: false,
  parseLimit: 100_000, // taille maximale du gabarit (caractères)
  renderLimit: 1_000, // durée maximale de rendu (ms)
  memoryLimit: 1_000_000, // mémoire maximale allouée au rendu (octets)
});

export function renderTemplate(template: string, data: unknown): string {
  return engine.parseAndRenderSync(
    template,
    (data ?? {}) as Record<string, unknown>
  );
}

/** Retourne un message d'erreur si le gabarit est invalide, sinon null. */
export function validateTemplate(template: string): string | null {
  try {
    engine.parse(template);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Gabarit invalide";
  }
}
