"use client";

import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";
import { toast } from "sonner";

type Props = { showTitle?: boolean };

export const CheckLateTerritoriesButton = ({ showTitle = true }: Props) => {
    const checkLateTerritories = async () => {
        const response = await authFetch("/api/attributions/verification-retard", { method: "PUT" });

        if (response.ok) {
            toast.success("Vérification des retards terminée !");
        } else {
            toast.error("Erreur lors de la vérification des retards.");
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {showTitle && <h2 className="text-lg font-semibold">Vérifications</h2>}
            <Button onClick={checkLateTerritories} variant="secondary" className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Vérification des retards
            </Button>
        </div>
    );
};
