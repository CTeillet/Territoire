import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Person } from "@/models/person";
import { formatPhoneNumber } from "@/components/utils";

interface PersonInfoCardProps {
  person: Person;
}

const PersonInfoCard = ({ person }: PersonInfoCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="mb-3">
              <strong className="text-gray-700">Prénom :</strong>{" "}
              {person.firstName}
            </p>
            <p className="mb-3">
              <strong className="text-gray-700">Nom :</strong> {person.lastName}
            </p>
          </div>
          <div>
            <p className="mb-3">
              <strong className="text-gray-700">Email :</strong>{" "}
              {person.email || "N/A"}
            </p>
            <p className="mb-3">
              <strong className="text-gray-700">Téléphone :</strong>{" "}
              {person.phoneNumber
                ? formatPhoneNumber(person.phoneNumber)
                : "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonInfoCard;
