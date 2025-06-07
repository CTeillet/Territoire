import { Card, CardContent } from "@/components/ui/card";
import { Assignment } from "@/models/assignment";
import TerritoryItem from "./territory-item";

interface AssignedTerritoriesListProps {
    assignedTerritories: Assignment[];
    loadingAssignedTerritories: boolean;
}

const AssignedTerritoriesList = ({ 
    assignedTerritories, 
    loadingAssignedTerritories 
}: AssignedTerritoriesListProps) => {
    
    // Sort territories: current ones first, then by most recent assignment date
    const sortedTerritories = [...assignedTerritories].sort((a, b) => {
        // First sort by whether the territory is currently assigned (null returnDate means it's current)
        if (a.returnDate === null && b.returnDate !== null) return -1;
        if (a.returnDate !== null && b.returnDate === null) return 1;

        // Then sort by assignment date (most recent first)
        return new Date(b.assignmentDate).getTime() - new Date(a.assignmentDate).getTime();
    });

    return (
        <Card className="border-2 border-gray-200 shadow-sm">
            <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Territoires assignés</h3>
                {loadingAssignedTerritories ? (
                    <p className="text-center py-4">Chargement des territoires...</p>
                ) : sortedTerritories.length > 0 ? (
                    <ul className="space-y-4">
                        {sortedTerritories.map((assignment) => (
                            <TerritoryItem key={assignment.id} assignment={assignment} />
                        ))}
                    </ul>
                ) : (
                    <p className="text-center py-4 text-gray-500">Aucun territoire assigné</p>
                )}
            </CardContent>
        </Card>
    );
};

export default AssignedTerritoriesList;