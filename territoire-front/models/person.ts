export interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string | null;

}

export function personToString(person: Person):string {
    return `${person.firstName} ${person.lastName}`;
}
