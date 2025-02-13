import {Territory} from "@/models/territory";

export interface Address {
    id: string;
    street: string;
    number: string;
    postalCode: string;
    city: string;
    territory?: Territory;
}
