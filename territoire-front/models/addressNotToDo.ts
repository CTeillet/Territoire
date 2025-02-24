import {Territory} from "@/models/territory";

export interface AddressNotToDo {
    id?: string;
    street: string;
    number: string;
    zipCode: string;
    city: string;
    date?: string;
    territory?: Territory;
}
