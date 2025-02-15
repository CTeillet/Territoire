import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React from "react";

interface ReturnConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ReturnConfirmationDialog: React.FC<ReturnConfirmationDialogProps> = ({ isOpen, onClose, onConfirm }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmer le retour</DialogTitle>
                </DialogHeader>
                <p>Êtes-vous sûr de vouloir retourner ce territoire dans le stock ?</p>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={onConfirm}
                    >
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReturnConfirmationDialog;
