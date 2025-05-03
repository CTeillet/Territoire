"use client";

import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";

export const CheckAvailableTerritoriesButton = () => {
    const checkAvailableTerritories = async () => {
        const response = await authFetch("/api/territoires/verification-disponible", { method: "PUT" });

        if (response.ok) {
            toast.success("Vérification des territoires en attente terminée !");
        } else {
            toast.error("Erreur lors de la vérification des territoires en attente.");
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Vérifications</h2>
            <Button onClick={checkAvailableTerritories} variant="secondary" className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Vérification des territoires en attente
            </Button>
        </div>
    );
};
