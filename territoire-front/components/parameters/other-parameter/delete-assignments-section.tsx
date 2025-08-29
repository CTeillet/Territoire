"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Building2, Trash2 } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";

type Props = { showTitle?: boolean };

export const DeleteAssignmentsSection = ({ showTitle = true }: Props) => {
    const { cities } = useSelector((state: RootState) => state.cities);
    const user = useSelector((state: RootState) => state.auth.user);
    const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);

    const handleDelete = async () => {
        if (selectedCity === undefined) {
            toast.warning("Veuillez sélectionner une ville ou 'Toutes les villes' avant de supprimer.");
            return;
        }

        let url = "/api/attributions";

        if (selectedCity !== "ALL") {
            url += `/${encodeURIComponent(selectedCity)}`;
        }

        const options: RequestInit = {
            method: "DELETE",
            headers: {},
        };

        const response = await authFetch(url, options);

        if (response.ok) {
            toast.success("Assignations supprimées avec succès !");
        } else {
            toast.error("Erreur lors de la suppression des assignations.");
        }
    };

    if (!(user?.role === "ADMIN" || user?.role === "SUPERVISEUR")) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            {showTitle && <h2 className="text-lg font-semibold">Suppression</h2>}
            <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <Select value={selectedCity} onValueChange={(value) => setSelectedCity(value)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir une ville" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Toutes les villes</SelectItem>
                        {cities.map((city) => (
                            <SelectItem key={city.name} value={city.name}>
                                {city.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!selectedCity} className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Supprimer les assignations
                    </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedCity === "ALL"
                                ? "Cela va supprimer toutes les assignations. Cette action est irréversible."
                                : `Cela va supprimer toutes les assignations pour ${selectedCity}. Cette action est irréversible.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                            Confirmer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
