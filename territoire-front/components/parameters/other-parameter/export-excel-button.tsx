"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";

type Props = { showTitle?: boolean };

export const ExportExcelButton = ({ showTitle = true }: Props) => {
    const [year, setYear] = React.useState<number>(() => {
        const now = new Date();
        const y = now.getFullYear();
        return (now.getMonth() + 1) >= 9 ? y : y - 1; // année scolaire (septembre)
    });

    const downloadExcel = async () => {
        try {
            const response = await authFetch(`/api/excel?year=${year}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const today = new Date();
            const formattedDate = today.getFullYear() + '-' + 
                String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                String(today.getDate()).padStart(2, '0');
            a.download = `S-13_${year}-${year + 1}_${formattedDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Erreur lors du téléchargement :", error);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {showTitle && <h2 className="text-lg font-semibold">Exporter</h2>}
            <div className="flex items-center gap-2">
                <label htmlFor="school-year" className="text-sm">Année scolaire (début):</label>
                <input
                    id="school-year"
                    type="number"
                    className="border rounded px-2 py-1 w-24"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value || "0", 10))}
                />
                <span className="text-sm text-gray-600">{year} - {year + 1}</span>
            </div>
            <Button onClick={downloadExcel} className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Exporter en Excel
            </Button>
        </div>
    );
};
