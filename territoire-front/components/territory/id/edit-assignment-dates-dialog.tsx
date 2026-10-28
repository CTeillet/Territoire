"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addMonths, format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Assignment } from "@/models/assignment";
import { STATUS_TRANSLATIONS } from "@/models/territory-status";
import { AppDispatch } from "@/store/store";
import { updateAssignmentDates } from "@/store/slices/territory-slice";
import { useDurationSettings } from "@/hooks/use-duration-settings";

/** Mêmes contrôles que le back, pour signaler l'erreur avant l'envoi (dates au format yyyy-MM-dd). */
const validate = (
  assignmentDate: string,
  dueDate: string,
  returnDate: string | null,
  today: string
): string | null => {
  if (!assignmentDate || !dueDate || returnDate === "") {
    return "Toutes les dates sont obligatoires";
  }
  if (assignmentDate > today) {
    return "La date d'attribution ne peut pas être dans le futur";
  }
  if (dueDate < assignmentDate) {
    return "L'échéance ne peut pas précéder la date d'attribution";
  }
  if (returnDate !== null && returnDate < assignmentDate) {
    return "La date de retour ne peut pas précéder la date d'attribution";
  }
  if (returnDate !== null && returnDate > today) {
    return "La date de retour ne peut pas être dans le futur";
  }
  return null;
};

interface EditAssignmentDatesDialogProps {
  assignment: Assignment;
  onClose: () => void;
}

const EditAssignmentDatesDialog: React.FC<EditAssignmentDatesDialogProps> = ({
  assignment,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { assignmentDurationMonths } = useDurationSettings();
  const [assignmentDate, setAssignmentDate] = useState(
    assignment.assignmentDate
  );
  const [dueDate, setDueDate] = useState(assignment.dueDate);
  // null : attribution en cours (le retour se fait par l'action « Retour »)
  const [returnDate, setReturnDate] = useState(assignment.returnDate);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const error =
    validate(assignmentDate, dueDate, returnDate, today) ?? serverError;

  // Échéance par défaut d'une attribution : la durée d'attribution des paramètres
  const defaultDueDate = (date: string) =>
    format(addMonths(parseISO(date), assignmentDurationMonths), "yyyy-MM-dd");

  const handleAssignmentDateChange = (value: string) => {
    // Une échéance laissée par défaut suit la date d'attribution
    if (assignmentDate && dueDate === defaultDueDate(assignmentDate) && value) {
      setDueDate(defaultDueDate(value));
    }
    setAssignmentDate(value);
    setServerError(null);
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const updated = await dispatch(
        updateAssignmentDates({
          assignmentId: assignment.id,
          assignmentDate,
          dueDate,
          returnDate,
        })
      ).unwrap();
      toast.success(
        `Dates enregistrées, territoire ${STATUS_TRANSLATIONS[
          updated.territory.status
        ].toLowerCase()}`
      );
      onClose();
    } catch (e) {
      setServerError(
        typeof e === "string"
          ? e
          : "Erreur lors de la modification des dates d'attribution"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les dates</DialogTitle>
          <DialogDescription>
            Le statut du territoire est recalculé à l&apos;enregistrement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="assignment-date">Date d&apos;attribution</Label>
            <Input
              id="assignment-date"
              type="date"
              value={assignmentDate}
              max={today}
              onChange={(e) => handleAssignmentDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="due-date">Échéance</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              min={assignmentDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setServerError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Par défaut : {assignmentDurationMonths} mois après
              l&apos;attribution
            </p>
          </div>
          {returnDate !== null && (
            <div className="space-y-1">
              <Label htmlFor="return-date">Date de retour</Label>
              <Input
                id="return-date"
                type="date"
                value={returnDate}
                min={assignmentDate}
                max={today}
                onChange={(e) => {
                  setReturnDate(e.target.value);
                  setServerError(null);
                }}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleSave}
            disabled={!!error || submitting}
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAssignmentDatesDialog;
