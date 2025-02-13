import {useState} from "react";
import {Download, Eye, Upload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import Link from "next/link";
import AssignTerritoryDialog from "@/components/territory/assign-territory-dialog";

interface TerritoryDataActionButtonsProps {
    id: string;
    people: { id: string; firstName: string; lastName: string }[];
}

export function TerritoryDataActionButtons({id, people}: TerritoryDataActionButtonsProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAssign = (personId: string | null, newPerson?: { firstName: string; lastName: string }) => {
        if (personId) {
            console.log(`Assignation du territoire ${id} à la personne existante ${personId}`);
        } else if (newPerson?.firstName && newPerson?.lastName) {
            console.log(`Création et assignation à ${newPerson.firstName} ${newPerson.lastName}`);
        }
    };

    return (
        <TooltipProvider>
            <div className="flex justify-center space-x-2">
                {/* Bouton Voir */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={`/territoires/${id}`}>
                            <Button className="bg-gray-500 hover:bg-gray-600 text-white">
                                <Eye/>
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>Voir les détails</TooltipContent>
                </Tooltip>

                {/* Bouton Importer */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                            <Download/>
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
                            <Upload/>
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
            </div>
        </TooltipProvider>
    );
}
