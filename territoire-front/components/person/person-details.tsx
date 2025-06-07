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
        <div className="space-y-6">
            {/* Carte des informations personnelles */}
            <Card className="border-2 border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Informations personnelles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="mb-3"><strong className="text-gray-700">Prénom :</strong> {person.firstName}</p>
                            <p className="mb-3"><strong className="text-gray-700">Nom :</strong> {person.lastName}</p>
                        </div>
                        <div>
                            <p className="mb-3"><strong className="text-gray-700">Email :</strong> {person.email || "N/A"}</p>
                            <p className="mb-3"><strong className="text-gray-700">Téléphone :</strong> {(person.phoneNumber) ? formatPhoneNumber(person.phoneNumber) : "N/A"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Carte des territoires assignés */}
            <Card className="border-2 border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Territoires assignés</h3>
                    {loadingAssignedTerritories ? (
                        <p className="text-center py-4">Chargement des territoires...</p>
                    ) : assignedTerritories.length > 0 ? (
                        <ul className="space-y-4">
                            {assignedTerritories.map((assignment) => (
                                <li key={assignment.id} className="p-3 bg-gray-50 rounded-md">
                                    <div className="font-medium text-gray-800">
                                        <strong>Territoire :</strong> {assignment.territory.name}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        <span>Assigné le : {new Date(assignment.assignmentDate).toLocaleDateString()}</span>
                                        {assignment.returnDate && (
                                            <span className="ml-2 pl-2 border-l border-gray-300"> Retourné le : {new Date(assignment.returnDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center py-4 text-gray-500">Aucun territoire assigné</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PersonDetails;
