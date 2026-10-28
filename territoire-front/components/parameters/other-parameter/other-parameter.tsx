import { ExportExcelButton } from "./export-excel-button";
import { ImportExcelSection } from "./import-excel-section";
import { CheckLateTerritoriesButton } from "@/components/parameters/other-parameter/check-late-territories-button";
import { CheckAvailableTerritoriesButton } from "@/components/parameters/other-parameter/check-available-territories-button";
import { ExportTerritoriesMapButton } from "@/components/parameters/other-parameter/export-map-button";
import { PublishersCountSection } from "@/components/parameters/other-parameter/publishers-count-section";
import { LateReminderMessage } from "@/components/parameters/other-parameter/late-reminder-message";
import { WhatsAppTestSection } from "@/components/parameters/other-parameter/whatsapp-test-section";
import { LateReportSection } from "@/components/parameters/other-parameter/late-report-section";
import { DurationsSection } from "@/components/parameters/other-parameter/durations-section";
import { useAppSelector } from "@/store/store";

export default function OtherParameter() {
  const role = useAppSelector((state) => state.auth.user?.role);

  return (
    <div className="p-6 space-y-8">
      <section className="border rounded-2xl shadow-sm bg-white p-4">
        <PublishersCountSection />
      </section>

      {(role === "ADMIN" || role === "SUPERVISEUR") && (
        <section className="border rounded-2xl shadow-sm bg-white p-4">
          <h2 className="text-xl font-bold mb-4">Durées</h2>
          <DurationsSection showTitle={false} />
        </section>
      )}

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

      {(role === "ADMIN" || role === "SUPERVISEUR") && (
        <section className="border rounded-2xl shadow-sm bg-white p-4">
          <h2 className="text-xl font-bold mb-4">
            Récapitulatif des retards par e-mail
          </h2>
          <LateReportSection showTitle={false} />
        </section>
      )}

      {role === "ADMIN" && (
        <section className="border rounded-2xl shadow-sm bg-white p-4">
          <h2 className="text-xl font-bold mb-4">Test WhatsApp</h2>
          <WhatsAppTestSection showTitle={false} />
        </section>
      )}

      <section className="border rounded-2xl shadow-sm bg-white p-4">
        <h2 className="text-xl font-bold mb-4">Export cartographique</h2>
        <ExportTerritoriesMapButton showTitle={false} />
      </section>
    </div>
  );
}
