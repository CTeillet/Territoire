import {Person} from "@/models/person";
import {SimplifiedTerritory} from "@/models/territory";

export interface Assignment {
    id: string;
    territory: SimplifiedTerritory;
    person: Person;
    assignmentDate: Date;
    dueDate: Date;
    returnDate: Date | null;
}
