"use client";

import UserManagement from "@/components/parameters/user-management/user-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReactNode, useState } from "react";
import CityManagement from "@/components/parameters/city-management/city-management";
import SettingsTab from "@/components/parameters/other-parameter/settings-tab";
import DataTab from "@/components/parameters/other-parameter/data-tab";
import { LabelPrinterSection } from "@/components/parameters/other-parameter/label-printer-section";
import { ParameterGroup } from "@/components/parameters/other-parameter/parameter-group";
import AccessManagement from "@/components/parameters/access/access-management";
import { MapThemesSection } from "@/components/parameters/map-settings/map-themes-section";
import { useAppSelector } from "@/store/store";
import { canSendAccess } from "@/lib/person-access-api";
import { PageContainer, PageHeader } from "@/components/shared/page-layout";
import { canManageAssignments, canManageSettings } from "@/models/role";

type Section = { value: string; label: string; content: ReactNode };

const ParametersPage = () => {
  const [selectedTab, setSelectedTab] = useState("cities");
  const role = useAppSelector((state) => state.auth.user?.role);

  const sections: Section[] = [
    { value: "cities", label: "Villes", content: <CityManagement /> },
    { value: "users", label: "Utilisateurs", content: <UserManagement /> },
    ...(canSendAccess(role)
      ? [
          {
            value: "access",
            label: "Accès numériques",
            content: <AccessManagement />,
          },
        ]
      : []),
    ...(canManageSettings(role)
      ? [
          { value: "settings", label: "Réglages", content: <SettingsTab /> },
          {
            value: "maps",
            label: "Cartes",
            content: (
              <ParameterGroup title="Fond des cartes">
                <MapThemesSection />
              </ParameterGroup>
            ),
          },
        ]
      : []),
    ...(canManageAssignments(role)
      ? [
          {
            value: "printer",
            label: "Imprimante",
            content: (
              <ParameterGroup title="Imprimante d'étiquettes">
                <LabelPrinterSection showTitle={false} />
              </ParameterGroup>
            ),
          },
        ]
      : []),
    { value: "data", label: "Données", content: <DataTab /> },
  ];

  return (
    <PageContainer>
      <PageHeader title="Paramètres" />
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        {/* Téléphone et tablette (barre latérale ouverte) : les onglets ne tiennent pas sur la largeur, une liste déroulante les remplace */}
        <Select value={selectedTab} onValueChange={setSelectedTab}>
          <SelectTrigger aria-label="Section" className="w-full lg:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TabsList className="hidden lg:inline-flex">
          {sections.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sections.map(({ value, content }) => (
          <TabsContent key={value} value={value}>
            {content}
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
};

export default ParametersPage;
