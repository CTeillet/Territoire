import {Role} from "@/models/role";

export interface User {
    id: string; // UUID
    email: string;
    username: string;
    role: Role
}
