import { ExportExcelButton } from "./export-excel-button";
import { ImportExcelSection } from "./import-excel-section";
import { CheckLateTerritoriesButton } from "@/components/parameters/other-parameter/check-late-territories-button";
import { CheckAvailableTerritoriesButton } from "@/components/parameters/other-parameter/check-available-territories-button";
import { DeleteAssignmentsSection } from "@/components/parameters/other-parameter/delete-assignments-section";
import { ExportTerritoriesMapButton } from "@/components/parameters/other-parameter/export-map-button";
import { PublishersCountSection } from "@/components/parameters/other-parameter/publishers-count-section";
import { LateReminderMessage } from "@/components/parameters/other-parameter/late-reminder-message";

export default function OtherParameter() {
    return (
        <div className="p-6 space-y-8">
            <section className="border rounded-2xl shadow-sm bg-white p-4">
                <PublishersCountSection />
            </section>

            <section className="border rounded-2xl shadow-sm bg-white p-4">
                <h2 className="text-xl font-bold mb-4">Données Excel</h2>
                <div className="space-y-4">
                    <ExportExcelButton showTitle={false} />
                    <ImportExcelSection showTitle={false} />
                </div>
            </section>

            <section className="border rounded-2xl shadow-sm bg-white p-4">
                <h2 className="text-xl font-bold mb-4">Vérifications</h2>
                <div className="space-y-4">
                    <CheckLateTerritoriesButton showTitle={false} />
                    <CheckAvailableTerritoriesButton showTitle={false} />
                </div>
            </section>

            <section className="border rounded-2xl shadow-sm bg-white p-4">
                <h2 className="text-xl font-bold mb-4">Messages types</h2>
                <LateReminderMessage showTitle={false} />
            </section>

            <section className="border rounded-2xl shadow-sm bg-white p-4">
                <h2 className="text-xl font-bold mb-4">Maintenance</h2>
                <DeleteAssignmentsSection showTitle={false} />
            </section>

            <section className="border rounded-2xl shadow-sm bg-white p-4">
                <h2 className="text-xl font-bold mb-4">Export cartographique</h2>
                <ExportTerritoriesMapButton showTitle={false} />
            </section>
        </div>
    );
}
