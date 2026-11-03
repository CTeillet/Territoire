import { PublishersCountSection } from "@/components/parameters/other-parameter/publishers-count-section";
import { DurationsSection } from "@/components/parameters/other-parameter/durations-section";
import { LateReminderMessage } from "@/components/parameters/other-parameter/late-reminder-message";
import { LateReportSection } from "@/components/parameters/other-parameter/late-report-section";
import {
  ParameterGroup,
  ParameterItem,
} from "@/components/parameters/other-parameter/parameter-group";

/** Onglet « Réglages » : règles de l'assemblée, réservées aux administrateurs et superviseurs. */
export default function SettingsTab() {
  return (
    <div className="space-y-6">
      <ParameterGroup title="Territoires">
        <ParameterItem title="Durées">
          <DurationsSection showTitle={false} />
        </ParameterItem>
        <ParameterItem title="Proclamateurs">
          <PublishersCountSection />
        </ParameterItem>
      </ParameterGroup>

      <ParameterGroup title="Relances">
        <ParameterItem title="Message de relance">
          <LateReminderMessage showTitle={false} />
        </ParameterItem>
        <ParameterItem title="Récapitulatif des retards par e-mail">
          <LateReportSection showTitle={false} />
        </ParameterItem>
      </ParameterGroup>
    </div>
  );
}
