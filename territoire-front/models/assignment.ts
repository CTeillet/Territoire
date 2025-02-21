import {Person} from "@/models/person";
import {SimplifiedTerritory} from "@/models/territory";

export interface Assignment {
    id: string;
    territory: SimplifiedTerritory;
    person: Person;
    assignmentDate: string;
    dueDate: string;
    returnDate: string | null;
}
