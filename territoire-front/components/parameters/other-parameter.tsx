import {Button} from "@/components/ui/button";
import {authFetch} from "@/utils/auth-fetch";
import {useState} from "react";

const OtherParameter = () => {

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadMessage, setUploadMessage] = useState<string | null>(null);


    const downloadExcel = async () => {
        console.log("Téléchargement du fichier Excel");
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
        <div className="p-4 border rounded-lg shadow-md space-y-4">
            <div>
                <Button onClick={downloadExcel}>
                    Exporter en Excel
                </Button>
            </div>

            <div className="space-y-2">
                <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="block"
                />
                <Button onClick={uploadFile} disabled={!selectedFile}>
                    Importer un fichier Excel
                </Button>
                {uploadMessage && (
                    <p className="text-sm mt-2">{uploadMessage}</p>
                )}
            </div>
        </div>
    );
};
export default OtherParameter;
