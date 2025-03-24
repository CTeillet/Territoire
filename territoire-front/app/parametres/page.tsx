"use client";

import UserManagement from "@/components/parameters/user-management/user-management";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useState} from "react";
import CityManagement from "@/components/parameters/city-management/city-management";
import OtherParameter from "@/components/parameters/other-parameter";

const ParametersPage = () => {
    const [selectedTab, setSelectedTab] = useState("cities");

    return (
        <div>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value="cities">Villes</TabsTrigger>
                    <TabsTrigger value="users">Gestion des utilisateurs</TabsTrigger>
                    <TabsTrigger value="others">Autres paramètres</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <UserManagement />
                </TabsContent>
                <TabsContent value="cities">
                    <CityManagement/>
                </TabsContent>
                <TabsContent value="others">
                    <OtherParameter/>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default ParametersPage;
