"use client";
import {Building, ChartBar, Contact, Settings, Calendar, Clock} from "lucide-react"

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
        title: "Territoires en retard",
        url: "/territoires/retards",
        icon: Clock,
    },
    {
        title: "Personnes",
        url: "/personnes",
        icon: Contact,
    },
    {
        title: "Campagnes",
        url: "/campagnes",
        icon: Calendar,
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
                <SidebarGroup className="mt-8">
                    <SidebarGroupLabel className="flex justify-center mb-6">
                        <Image
                            src="/images/logo-complet.svg"
                            alt="Logo de l'application"
                            width={100}
                            height={100}
                            className="w-28 h-auto block mx-auto"
                        />
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="mt-12">
                        <SidebarMenu>
                            {items.map((item) => {
                                // For root path, exact match; for others, check if it's the most specific match
                                const isActive = item.url === "/" 
                                    ? pathname === "/" 
                                    : pathname.startsWith(item.url) && 
                                      // Make sure no other more specific item matches this path
                                      !items.some(otherItem => 
                                        otherItem !== item && 
                                        pathname.startsWith(otherItem.url) && 
                                        otherItem.url.startsWith(item.url)
                                      );

                                return (
                                    <SidebarMenuItem key={item.title} className="mb-4">
                                        <SidebarMenuButton asChild>
                                            <a
                                                href={item.url}
                                                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200
                                                    ${isActive ? "bg-gray-400 text-primary font-bold shadow-sm" : "hover:bg-gray-200"}`}
                                            >
                                                <item.icon className="h-5 w-5" />
                                                <span className="text-base">{item.title}</span>
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
