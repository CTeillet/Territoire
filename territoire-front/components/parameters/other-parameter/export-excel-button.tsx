"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";

export const ExportExcelButton = () => {
    const downloadExcel = async () => {
        try {
            const response = await authFetch("/api/excel");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "S-13.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Erreur lors du téléchargement :", error);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Exporter</h2>
            <Button onClick={downloadExcel} className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Exporter en Excel
            </Button>
        </div>
    );
};
