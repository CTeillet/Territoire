"use client";
import {Building, ChartBar, Contact, Settings, Calendar, Clock, MapPin, ChevronDown, ChevronRight} from "lucide-react"

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
import React, {useState} from "react";

// Menu items.
const dashboardItems = [
    {
        title: "Dashboard",
        url: "/",
        icon: ChartBar,
    }
];

// Territory-related items
const territoryItems = [
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
        title: "Territoires non parcourus",
        url: "/territoires/non-parcourus",
        icon: MapPin,
    }
];

// Other items
const otherItems = [
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
    }
];

export function AppSidebar() {
    const pathname = usePathname();
    const user = useSelector((state: RootState) => state.auth.user);
    const [territoryExpanded, setTerritoryExpanded] = useState(true);

    // Check if any territory page is active
    const isTerritoryActive = pathname.startsWith('/territoires');

    // Helper function to check if a menu item is active
    const isItemActive = (itemUrl: string) => {
        // For root path, exact match; for others, check if it's the most specific match
        const allItems = [...dashboardItems, ...territoryItems, ...otherItems];
        return itemUrl === "/" 
            ? pathname === "/" 
            : pathname.startsWith(itemUrl) && 
              // Make sure no other more specific item matches this path
              !allItems.some(otherItem => 
                otherItem.url !== itemUrl && 
                pathname.startsWith(otherItem.url) && 
                otherItem.url.startsWith(itemUrl)
              );
    };

    // Render a menu item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderMenuItem = (item: { title: string; url: string; icon: any; }) => (
        <SidebarMenuItem key={item.title} className="mb-4">
            <SidebarMenuButton asChild>
                <a
                    href={item.url}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200
                        ${isItemActive(item.url) ? "bg-gray-400 text-primary font-bold shadow-sm" : "hover:bg-gray-200"}`}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="text-base">{item.title}</span>
                </a>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );

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
                            {/* Dashboard item */}
                            {dashboardItems.map(renderMenuItem)}
                            
                            {/* Territoire collapsible group */}
                            <SidebarMenuItem className="mb-4">
                                <button 
                                    onClick={() => setTerritoryExpanded(!territoryExpanded)}
                                    className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors duration-200
                                        ${isTerritoryActive ? "bg-gray-400 text-primary font-bold shadow-sm" : "hover:bg-gray-200"}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Building className="h-5 w-5" />
                                        <span className="text-base">Territoire</span>
                                    </div>
                                    {territoryExpanded ? 
                                        <ChevronDown className="h-4 w-4" /> : 
                                        <ChevronRight className="h-4 w-4" />
                                    }
                                </button>
                            </SidebarMenuItem>
                            
                            {/* Territory sub-items */}
                            {territoryExpanded && (
                                <div className="ml-6 border-l-2 border-gray-400 pl-2">
                                    {territoryItems.map(renderMenuItem)}
                                </div>
                            )}
                            
                            {/* Other items */}
                            {otherItems.map(renderMenuItem)}
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
