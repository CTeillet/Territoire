import { Card, CardContent } from "@/components/ui/card";
import { Person } from "@/models/person";
import {formatPhoneNumber} from "@/components/utils";

interface PersonDetailsProps {
    person: Person;
}

const PersonDetails = ({ person }: PersonDetailsProps) => {
    return (
        <Card>
            <CardContent>
                <p className={"mt-2"}><strong>Prénom :</strong> {person.firstName}</p>
                <p className={"mt-2"}><strong>Nom :</strong> {person.lastName}</p>
                <p className={"mt-2"}><strong>Email :</strong> {person.email || "N/A"}</p>
                <p className={"mt-2"}><strong>Téléphone :</strong> { (person.phoneNumber)? formatPhoneNumber(person.phoneNumber) : "N/A"}</p>
            </CardContent>
        </Card>
    );
};

export default PersonDetails;
