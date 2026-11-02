import { Person } from "@/models/person";
import { SimplifiedTerritory } from "@/models/territory";
import { Campaign } from "@/models/campaign";

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
