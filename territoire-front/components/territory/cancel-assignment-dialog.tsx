import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React from "react";

interface CancelAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const CancelAssignmentDialog: React.FC<CancelAssignmentDialogProps> = ({ isOpen, onClose, onConfirm }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmer l&apos;annulation</DialogTitle>
                </DialogHeader>
                <p>Êtes-vous sûr de vouloir annuler l&apos;assignation de ce territoire et le remettre disponible ?</p>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={onConfirm}
                    >
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CancelAssignmentDialog;
