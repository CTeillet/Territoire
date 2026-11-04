"use client";

import { Assignment } from "@/models/assignment";
import ActionButton from "@/components/shared/action-button";
import { CalendarCog, Eye, FileDown, Printer } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { canManageAssignments } from "@/models/role";
import EditAssignmentDatesDialog from "@/components/territory/id/edit-assignment-dates-dialog";
import { useLabelPrinter } from "@/hooks/use-label-printer";
import { printAssignmentLabel } from "@/lib/assignment-label";
import { offerAssignmentLabelFile } from "@/components/shared/assignment-label-file";

const AssignmentsList = ({ assignments }: { assignments: Assignment[] }) => {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const labelPrinter = useLabelPrinter();
  const [editedAssignment, setEditedAssignment] = useState<Assignment | null>(
    null
  );

  // Sort assignments: completed assignments first, then campaigns, then current assignments
  const sortedAssignments = [...assignments].sort((a, b) => {
    // If one is current (returnDate is null) and the other is not, the completed one comes first
    if (a.returnDate === null && b.returnDate !== null) return 1;
    if (a.returnDate !== null && b.returnDate === null) return -1;

    // If both are completed or both are current, sort by assignmentDate (most recent first)
    return (
      new Date(b.assignmentDate).getTime() -
      new Date(a.assignmentDate).getTime()
    );
  });

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <h2 className="mb-4 leading-none font-semibold">Historique</h2>
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
                  <br />
                  <span className="text-sm text-gray-600">
                    {new Date(assignment.assignmentDate).toLocaleDateString()} →{" "}
                    {assignment.returnDate
                      ? new Date(assignment.returnDate).toLocaleDateString()
                      : "En cours"}
                    {assignment.returnedVia === "PROLONGATION" && " (prolongé)"}
                  </span>
                </div>
                <TooltipProvider>
                  <div className="flex gap-2">
                    {/* Étiquette perdue, ratée ou à refaire après une modification de l'échéance.
                        Dans Safari sur iPhone, fichier LBX ; dans l'app iOS TMS, impression directe. */}
                    {assignment.person &&
                      assignment.returnDate === null &&
                      canManageAssignments(role) &&
                      (labelPrinter.lbx ? (
                        <ActionButton
                          icon={FileDown}
                          tooltip="Télécharger l'étiquette"
                          onClick={() => offerAssignmentLabelFile(assignment)}
                        />
                      ) : (
                        labelPrinter.connected && (
                          <ActionButton
                            icon={Printer}
                            tooltip="Imprimer l'étiquette"
                            onClick={() =>
                              void printAssignmentLabel(assignment)
                            }
                          />
                        )
                      ))}
                    {/* Les dates d'une campagne suivent celles de la campagne */}
                    {assignment.person && canManageAssignments(role) && (
                      <ActionButton
                        icon={CalendarCog}
                        tooltip="Modifier les dates"
                        onClick={() => setEditedAssignment(assignment)}
                      />
                    )}
                    {assignment.person && (
                      <ActionButton
                        icon={Eye}
                        tooltip="Voir les détails de la personne"
                        href={`/personnes/${assignment.person.id}`}
                      />
                    )}
                  </div>
                </TooltipProvider>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editedAssignment && (
        <EditAssignmentDatesDialog
          assignment={editedAssignment}
          onClose={() => setEditedAssignment(null)}
        />
      )}
    </div>
  );
};

export default AssignmentsList;
