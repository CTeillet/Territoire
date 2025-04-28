"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUp } from "lucide-react";
import { authFetch } from "@/utils/auth-fetch";

export const ImportExcelSection = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadMessage, setUploadMessage] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const uploadFile = async () => {
        if (!selectedFile) {
            setUploadMessage("Veuillez sélectionner un fichier.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await authFetch("/api/excel", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.text();
                setUploadMessage("✅ " + result);
            } else {
                const errorText = await response.text();
                setUploadMessage("❌ Erreur : " + errorText);
            }
        } catch (error) {
            console.error("Erreur lors de l'import :", error);
            setUploadMessage("❌ Erreur réseau ou serveur.");
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Importer</h2>
            <Input type="file" accept=".xlsx" onChange={handleFileChange} />
            <Button onClick={uploadFile} disabled={!selectedFile} className="flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Importer un fichier Excel
            </Button>
            {uploadMessage && (
                <p className="text-sm text-muted-foreground">{uploadMessage}</p>
            )}
        </div>
    );
};
