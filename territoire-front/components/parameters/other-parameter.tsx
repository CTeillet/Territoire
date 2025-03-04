import {Button} from "@/components/ui/button";
import {authFetch} from "@/utils/auth-fetch";

const OtherParameter = () => {

    const downloadExcel = async () => {
        console.log("Téléchargement du fichier Excel");
        try {
            const response = await authFetch("/api/excel/telecharger");
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
        <div className="p-4 border rounded-lg shadow-md">
            <Button onClick={downloadExcel}>
                Exporter en Excel
            </Button>
        </div>
    );
};
export default OtherParameter;
