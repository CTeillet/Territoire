"use client";

import {Assignment} from "@/models/assignment";
import ActionButton from "@/components/shared/action-button";
import {Calendar, Edit, Eye, Check, X} from "lucide-react";
import {TooltipProvider} from "@/components/ui/tooltip";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {useDispatch} from "react-redux";
import {AppDispatch} from "@/store/store";
import {updateAssignmentDate} from "@/store/slices/territory-slice";

const AssignmentsList = ({assignments}: { assignments: Assignment[] }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
    const [tempDate, setTempDate] = useState<string>("");

    // Sort assignments: completed assignments first, then campaigns, then current assignments
    const sortedAssignments = [...assignments].sort((a, b) => {
        // If one is current (returnDate is null) and the other is not, the completed one comes first
        if (a.returnDate === null && b.returnDate !== null) return 1;
        if (a.returnDate !== null && b.returnDate === null) return -1;

        // If both are completed or both are current, sort by assignmentDate (most recent first)
        return new Date(b.assignmentDate).getTime() - new Date(a.assignmentDate).getTime();
    });

    const handleEditClick = (assignment: Assignment) => {
        setEditingAssignmentId(assignment.id);
        setTempDate(assignment.assignmentDate);
    };

    const handleSave = (territoryId: string) => {
        if (editingAssignmentId) {
            dispatch(updateAssignmentDate({ territoryId, assignmentDate: tempDate }));
            setEditingAssignmentId(null);
        }
    };

    const handleCancel = () => {
        setEditingAssignmentId(null);
    };

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
                                        📅 {editingAssignmentId === assignment.id ? (
                                            <div className="inline-flex items-center gap-2">
                                                <Input 
                                                    type="date" 
                                                    value={tempDate} 
                                                    onChange={(e) => setTempDate(e.target.value)}
                                                    className="w-40 h-8 text-sm"
                                                />
                                                <button onClick={() => handleSave(assignment.territory.territoryId)} className="text-green-600 hover:text-green-800">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={handleCancel} className="text-red-600 hover:text-red-800">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {new Date(assignment.assignmentDate).toLocaleDateString()}
                                                {assignment.returnDate === null && (
                                                    <button 
                                                        onClick={() => handleEditClick(assignment)} 
                                                        className="ml-2 text-blue-500 hover:text-blue-700"
                                                        title="Modifier la date d'attribution"
                                                    >
                                                        <Edit className="w-3 h-3 inline" />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {" "}→{" "}
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
