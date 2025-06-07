"use client";

import {Assignment} from "@/models/assignment";
import ActionButton from "@/components/shared/action-button";
import {Eye} from "lucide-react";
import {TooltipProvider} from "@/components/ui/tooltip";

const AssignmentsList = ({assignments}: { assignments: Assignment[] }) => {
    // Sort assignments: completed assignments first, then campaigns, then current assignments
    const sortedAssignments = [...assignments].sort((a, b) => {
        // If one is current (returnDate is null) and the other is not, the completed one comes first
        if (a.returnDate === null && b.returnDate !== null) return 1;
        if (a.returnDate !== null && b.returnDate === null) return -1;

        // If both are completed or both are current, sort by assignmentDate (most recent first)
        return new Date(b.assignmentDate).getTime() - new Date(a.assignmentDate).getTime();
    });

    return (
        <div className="mt-6 border border-gray-200 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">📋 Historique</h2>
            {sortedAssignments.length === 0 ? (
                <p className="text-gray-500">Pas d&#39;historique pour ce territoire</p>
            ) : (
                <ul>
                    {sortedAssignments.map((assignment) => (
                        <li key={assignment.id} className="p-2 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <strong>
                                        {assignment.person 
                                            ? `${assignment.person.firstName} ${assignment.person.lastName}`
                                            : assignment.campaign 
                                                ? `Campagne: ${assignment.campaign.name}` 
                                                : "N/A"}
                                    </strong>
                                    <br/>
                                    <span className="text-sm text-gray-600">
                                        📅 {new Date(assignment.assignmentDate).toLocaleDateString()} →{" "}
                                        {assignment.returnDate ? new Date(assignment.returnDate).toLocaleDateString() : "En cours"}
                                    </span>
                                </div>
                                {assignment.person && (
                                    <TooltipProvider>
                                        <ActionButton
                                            icon={Eye}
                                            tooltip="Voir les détails de la personne"
                                            href={`/personnes/${assignment.person.id}`}
                                            className="bg-gray-500 hover:bg-gray-600 text-white"
                                        />
                                    </TooltipProvider>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AssignmentsList;
