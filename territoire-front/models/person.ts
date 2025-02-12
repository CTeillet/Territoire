export interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;

}

export function personToString(person: Person):string {
    return `${person.firstName} ${person.lastName}`;
}
