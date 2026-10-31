import { Person } from "@/models/person";
import { apiRequest as request } from "@/utils/api-request";

export const fetchPersonsForPhones = () =>
  request<Person[]>(
    "/api/personnes",
    {},
    "Impossible de charger les personnes"
  );

/** La modification remplace toute la fiche : les autres champs sont renvoyés tels quels. */
export const savePersonPhone = (person: Person, phoneNumber: string) =>
  request<Person>(
    `/api/personnes/${person.id}`,
    { method: "PUT", body: JSON.stringify({ ...person, phoneNumber }) },
    "Échec de la mise à jour du numéro"
  );
