import { ExportExcelButton } from "./export-excel-button";
import { ImportExcelSection } from "./import-excel-section";
import {CheckLateTerritoriesButton} from "@/components/parameters/other-parameter/check-late-territories-button";
import {DeleteAssignmentsSection} from "@/components/parameters/other-parameter/delete-assignments-section";

export default function OtherParameter() {
    return (
        <div className="p-6 border rounded-2xl shadow-lg bg-white space-y-6 w-full max-w-md mx-auto">
            <ExportExcelButton />
            <ImportExcelSection />
            <CheckLateTerritoriesButton />
            <DeleteAssignmentsSection />
        </div>
    );
}
