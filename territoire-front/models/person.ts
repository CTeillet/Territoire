import { compareNames } from "@/lib/utils";

export interface Person {
  id: string | null;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  /** Personne partie (archivée) : absente des listes, son historique reste. */
  archivedAt?: string | null;
  /** Nom remplacé et coordonnées effacées (après archivage). */
  anonymizedAt?: string | null;
}

/** Ordre alphabétique : par nom, puis par prénom. */
export function comparePersons(a: Person, b: Person): number {
  return (
    compareNames(a.lastName, b.lastName) ||
    compareNames(a.firstName, b.firstName)
  );
}

export function personToString(person?: Person): string {
  if (!person) {
    return "N/A";
  }
  return `${person.firstName} ${person.lastName}`;
}
