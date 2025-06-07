import { Card, CardContent } from "@/components/ui/card";
import { Person } from "@/models/person";
import { formatPhoneNumber } from "@/components/utils";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "@/store/store";
import { fetchAssignedTerritories } from "@/store/slices/person-slice";

interface PersonDetailsProps {
    person: Person;
}

const PersonDetails = ({ person }: PersonDetailsProps) => {
    const dispatch = useAppDispatch();
    const { assignedTerritories, loadingAssignedTerritories } = useSelector((state: RootState) => state.persons);

    useEffect(() => {
        if (person.id) {
            dispatch(fetchAssignedTerritories(person.id));
        }
    }, [dispatch, person.id]);

    return (
        <Card>
            <CardContent>
                <p className={"mt-2"}><strong>Prénom :</strong> {person.firstName}</p>
                <p className={"mt-2"}><strong>Nom :</strong> {person.lastName}</p>
                <p className={"mt-2"}><strong>Email :</strong> {person.email || "N/A"}</p>
                <p className={"mt-2"}><strong>Téléphone :</strong> { (person.phoneNumber)? formatPhoneNumber(person.phoneNumber) : "N/A"}</p>

                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Territoires assignés</h3>
                    {loadingAssignedTerritories ? (
                        <p>Chargement des territoires...</p>
                    ) : assignedTerritories.length > 0 ? (
                        <ul className="list-disc pl-5">
                            {assignedTerritories.map((assignment) => (
                                <li key={assignment.id} className="mb-2">
                                    <div>
                                        <strong>Territoire :</strong> {assignment.territory.name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <span>Assigné le : {new Date(assignment.assignmentDate).toLocaleDateString()}</span>
                                        {assignment.returnDate && (
                                            <span> | Retourné le : {new Date(assignment.returnDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Aucun territoire assigné</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default PersonDetails;
