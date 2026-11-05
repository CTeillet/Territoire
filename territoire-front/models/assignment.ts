import { Person, personToString } from "@/models/person";
import { SimplifiedTerritory } from "@/models/territory";
import { Campaign } from "@/models/campaign";
import { compareNames } from "@/lib/utils";

export interface Assignment {
  id: string;
  territory: SimplifiedTerritory;
  person?: Person;
  campaign?: Campaign;
  assignmentDate: string;
  dueDate: string;
  returnDate: string | null;
  /** Origine du retour : null pour une attribution en cours ou un retour antérieur à cette information. */
  returnedVia?: "RESPONSABLE" | "LIEN" | "PROLONGATION" | null;
}

/** Qui a le territoire : la personne, ou la campagne pendant laquelle il a été parcouru. */
export function assignmentHolder(assignment: Assignment): string {
  if (assignment.person) return personToString(assignment.person);
  if (assignment.campaign) return `Campagne: ${assignment.campaign.name}`;
  return "N/A";
}

// Dates ISO (aaaa-mm-jj) : l'ordre des chaînes est celui des dates
const compareDates = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Historique (d'un territoire, d'une personne) : les attributions en cours d'abord, puis de la plus récente à la
 * plus ancienne.
 */
export function compareByMostRecent(a: Assignment, b: Assignment): number {
  const aRunning = a.returnDate === null;
  const bRunning = b.returnDate === null;
  if (aRunning !== bRunning) return aRunning ? -1 : 1;
  return (
    compareDates(b.assignmentDate, a.assignmentDate) ||
    compareDates(b.returnDate ?? "", a.returnDate ?? "") ||
    compareNames(a.territory.name, b.territory.name)
  );
}

/** Dernier mouvement d'une attribution : son retour s'il a eu lieu, sinon son début. */
const lastMovementDate = (assignment: Assignment) =>
  assignment.returnDate ?? assignment.assignmentDate;

/**
 * Actualités : du dernier mouvement (attribution ou retour) au plus ancien ; les mouvements d'un même jour sont
 * regroupés par personne.
 */
export function compareByLatestMovement(a: Assignment, b: Assignment): number {
  return (
    compareDates(lastMovementDate(b), lastMovementDate(a)) ||
    compareNames(assignmentHolder(a), assignmentHolder(b)) ||
    compareNames(a.territory.name, b.territory.name)
  );
}
