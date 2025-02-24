"use client";
import {Building, ChartBar, Contact, Settings} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {usePathname} from "next/navigation";
import Image from "next/image";
import NavUser from "@/components/nav-user";
import {useSelector} from "react-redux";
import {RootState} from "@/store/store";
import React from "react";

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/",
        icon: ChartBar,
    },
    {
        title: "Territoires",
        url: "/territoires",
        icon: Building,
    },
    {
        title: "Personnes",
        url: "/personnes",
        icon: Contact,
    },
    {
        title: "Paramètres",
        url: "/parametres",
        icon: Settings,
    },
]

export function AppSidebar() {
    const pathname = usePathname();
    const user = useSelector((state: RootState) => state.auth.user);

    return (
        <Sidebar>
            {/* Utilisation de flex pour positionner NavUser en bas */}
            <SidebarContent className="bg-gray-300 flex flex-col h-full justify-between">
                <SidebarGroup className="mt-5">
                    <SidebarGroupLabel className="flex justify-center">
                        <Image
                            src="/images/logo-complet.svg"
                            alt="Logo de l'application"
                            width={100}
                            height={100}
                            className="w-24 h-auto block mx-auto"
                        />
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="mt-10">
                        <SidebarMenu>
                            {items.map((item) => {
                                const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);

                                return (
                                    <SidebarMenuItem key={item.title} className="mb-3">
                                        <SidebarMenuButton asChild>
                                            <a
                                                href={item.url}
                                                className={`flex items-center space-x-2 p-2 rounded-lg 
                                                    ${isActive ? "bg-gray-400 text-primary font-bold" : ""}`}
                                            >
                                                <item.icon/>
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Afficher le footer uniquement si l'utilisateur est connecté */}
                {user && (
                    <SidebarFooter className="p-3 bg-gray-200 border-t">
                        <NavUser />
                    </SidebarFooter>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
