import { Assignment } from "@/models/assignment";

interface TerritoryItemProps {
    assignment: Assignment;
}

const TerritoryItem = ({ assignment }: TerritoryItemProps) => {
    const isCurrentAssignment = assignment.returnDate === null;
    
    return (
        <li className={`p-3 rounded-md ${isCurrentAssignment ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50'}`}>
            <div className="font-medium text-gray-800">
                <strong>Territoire :</strong> {assignment.territory.name}
                {isCurrentAssignment && (
                    <span className="ml-2 text-sm font-medium text-blue-600 px-2 py-0.5 rounded-full bg-blue-100">En cours</span>
                )}
            </div>
            <div className="text-sm text-gray-600 mt-1">
                <span>Assigné le : {new Date(assignment.assignmentDate).toLocaleDateString()}</span>
                {assignment.returnDate && (
                    <span className="ml-2 pl-2 border-l border-gray-300"> Retourné le : {new Date(assignment.returnDate).toLocaleDateString()}</span>
                )}
            </div>
        </li>
    );
};

export default TerritoryItem;