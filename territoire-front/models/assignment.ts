import {Person} from "@/models/person";
import {SimplifiedTerritory} from "@/models/territory";
import {Campaign} from "@/models/campaign";

export interface Assignment {
    id: string;
    territory: SimplifiedTerritory;
    person?: Person;
    campaign?: Campaign;
    assignmentDate: string;
    dueDate: string;
    returnDate: string | null;
}
