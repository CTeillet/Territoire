import {useState} from "react";
import {Download, Eye, Upload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import Link from "next/link";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";

interface TerritoryDataActionButtonsProps {
    id: string;
    people: { id: string; firstName: string; lastName: string }[];
}

export function TerritoryDataActionButtons({id, people}: TerritoryDataActionButtonsProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

    // Fonction pour gérer l'assignation d'un territoire
    const handleAssign = (personId) => {
        console.log(`Territoire ${id} assigné à la personne ${personId}`);
        setIsDialogOpen(false);
    };

    // Fonction pour gérer le retour du territoire dans le stock
    const handleReturn = () => {
        console.log(`Territoire ${id} retourné dans le stock`);
        setIsReturnDialogOpen(false);
    };

    return (
        <TooltipProvider>
            <div className="flex justify-center space-x-2">
                {/* Bouton Voir */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={`/territoires/${id}`}>
                            <Button className="bg-gray-500 hover:bg-gray-600 text-white">
                                <Eye />
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>Voir les détails</TooltipContent>
                </Tooltip>

                {/* Bouton Importer (Retour) */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={() => setIsReturnDialogOpen(true)}
                        >
                            <Download />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retour du territoire dans le stock</TooltipContent>
                </Tooltip>

                {/* Bouton Exporter (Assignation) */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => setIsDialogOpen(true)}
                        >
                            <Upload />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Assignation du territoire</TooltipContent>
                </Tooltip>

                {/* Fenêtre de dialogue d'assignation */}
                <AssignTerritoryDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    people={people}
                    onAssign={handleAssign}
                />

                {/* Fenêtre de dialogue de confirmation de retour */}
                <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmer le retour</DialogTitle>
                        </DialogHeader>
                        <p>Êtes-vous sûr de vouloir retourner ce territoire dans le stock ?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Annuler</Button>
                            <Button
                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                onClick={handleReturn}
                            >
                                Confirmer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
