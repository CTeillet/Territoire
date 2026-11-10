import { ExportExcelButton } from "@/components/parameters/other-parameter/export-excel-button";
import { ImportExcelSection } from "@/components/parameters/other-parameter/import-excel-section";
import { CheckLateTerritoriesButton } from "@/components/parameters/other-parameter/check-late-territories-button";
import { CheckAvailableTerritoriesButton } from "@/components/parameters/other-parameter/check-available-territories-button";
import { ExportTerritoriesMapButton } from "@/components/parameters/other-parameter/export-map-button";
import { WhatsAppTestSection } from "@/components/parameters/other-parameter/whatsapp-test-section";
import { ContactsPhoneSection } from "@/components/parameters/other-parameter/contacts-phone-section";
import {
  ParameterGroup,
  ParameterItem,
} from "@/components/parameters/other-parameter/parameter-group";
import { useAppSelector } from "@/store/store";
import {
  canManageAssignments,
  canManagePersons,
  canManageSettings,
} from "@/models/role";
import { ArchivesSection } from "@/components/parameters/other-parameter/archives-section";

/** Onglet « Données » : exports, imports et outils rarement utiles, selon ce que le serveur permet au rôle. */
export default function DataTab() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const canImportExcel = role === "ADMIN";
  const canImportContacts = canManagePersons(role);

  return (
    <div className="space-y-6">
      <ParameterGroup title="Exports">
        <ParameterItem title="Tableau S-13 (Excel)">
          <ExportExcelButton showTitle={false} />
        </ParameterItem>
        {canManageAssignments(role) && (
          <ParameterItem title="Carte des territoires (PNG)">
            <ExportTerritoriesMapButton showTitle={false} />
          </ParameterItem>
        )}
      </ParameterGroup>

      {(canImportExcel || canImportContacts) && (
        <ParameterGroup title="Imports">
          {canImportExcel && (
            <ParameterItem title="Fichier Excel">
              <ImportExcelSection showTitle={false} />
            </ParameterItem>
          )}
          {canImportContacts && (
            <ParameterItem title="Numéros de téléphone">
              <ContactsPhoneSection showTitle={false} />
            </ParameterItem>
          )}
        </ParameterGroup>
      )}

      {canManagePersons(role) && (
        <ParameterGroup title="Archives">
          <ParameterItem title="Territoires archivés et personnes parties">
            <ArchivesSection />
          </ParameterItem>
        </ParameterGroup>
      )}

      {canManageSettings(role) && (
        <details className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
          <summary className="cursor-pointer text-xl font-bold">
            Outils avancés
          </summary>
          <div className="mt-4 divide-y *:py-5 *:first:pt-0 *:last:pb-0">
            <ParameterItem title="Vérifications de nuit">
              <p className="text-sm text-muted-foreground">
                Faites automatiquement chaque nuit ; à relancer seulement après
                une correction.
              </p>
              <div className="flex flex-wrap gap-2">
                <CheckLateTerritoriesButton showTitle={false} />
                <CheckAvailableTerritoriesButton showTitle={false} />
              </div>
            </ParameterItem>
            {role === "ADMIN" && (
              <ParameterItem title="Test WhatsApp">
                <WhatsAppTestSection showTitle={false} />
              </ParameterItem>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
