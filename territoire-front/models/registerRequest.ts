import {Role} from "@/models/role";

export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    role: Role;
}
