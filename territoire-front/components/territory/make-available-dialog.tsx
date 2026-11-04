import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React from "react";

interface MakeAvailableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Remise à disposition d'un territoire en attente, avant la fin de la durée d'attente des paramètres. */
const MakeAvailableDialog: React.FC<MakeAvailableDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rendre le territoire disponible</DialogTitle>
          <DialogDescription>
            Ce territoire est en attente depuis son dernier retour. Il pourra
            être attribué tout de suite, sans attendre la fin de la durée
            d&apos;attente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onConfirm}>Rendre disponible</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MakeAvailableDialog;
