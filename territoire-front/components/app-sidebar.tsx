"use client";
import {Building, ChartBar, Contact, Settings} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {usePathname} from "next/navigation";

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
    const pathname = usePathname(); // Récupération du chemin actuel

    return (
        <Sidebar>
            <SidebarContent className={"bg-gray-300"}>
                <SidebarGroup className={"mt-5 ml-5"}>
                    <SidebarGroupLabel className={"text-2xl text-primary"}>Gestion Territoire</SidebarGroupLabel>
                    <SidebarGroupContent className={"mt-10"}>
                        <SidebarMenu>
                            {items.map((item) => {
                                const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);

                                return (
                                    <SidebarMenuItem
                                        key={item.title}
                                        className="mb-3"
                                    >
                                        <SidebarMenuButton asChild>
                                            <a
                                                href={item.url}
                                                className={`flex items-center space-x-2 p-2 rounded-lg 
                                                    ${isActive ? "bg-gray-400 text-primary font-bold" : ""}`}
                                            >

                                                <item.icon />
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
