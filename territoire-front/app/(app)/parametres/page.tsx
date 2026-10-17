"use client";

import UserManagement from "@/components/parameters/user-management/user-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import CityManagement from "@/components/parameters/city-management/city-management";
import OtherParameter from "@/components/parameters/other-parameter/other-parameter";
import AccessManagement from "@/components/parameters/access/access-management";
import { useAppSelector } from "@/store/store";
import { canSendAccess } from "@/lib/person-access-api";

const ParametersPage = () => {
  const [selectedTab, setSelectedTab] = useState("cities");
  const role = useAppSelector((state) => state.auth.user?.role);

  return (
    <div className="p-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="cities">Villes</TabsTrigger>
          <TabsTrigger value="users">Gestion des utilisateurs</TabsTrigger>
          {canSendAccess(role) && (
            <TabsTrigger value="access">Accès numériques</TabsTrigger>
          )}
          <TabsTrigger value="others">Autres paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="cities">
          <CityManagement />
        </TabsContent>
        {canSendAccess(role) && (
          <TabsContent value="access">
            <AccessManagement />
          </TabsContent>
        )}
        <TabsContent value="others">
          <OtherParameter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ParametersPage;
