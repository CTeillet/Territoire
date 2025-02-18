import {Territory} from "@/models/territory";
import {Person} from "@/models/person";

export interface Assignment {
    id: string;
    territory: Territory;
    person: Person;
    assignmentDate: Date;
    dueDate: Date;
    returnDate: Date | null;
}
