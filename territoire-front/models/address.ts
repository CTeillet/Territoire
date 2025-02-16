import {Territory} from "@/models/territory";

export interface Address {
    id?: string;
    street: string;
    number: string;
    zipCode: string;
    city: string;
    territory?: Territory;
}
