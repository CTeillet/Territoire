import {BookUser, Building, Calendar, ChartBar, Contact, Inbox, Search, Send, Settings} from "lucide-react"

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

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "#",
        icon: ChartBar,
    },
    {
        title: "Territoires",
        url: "#",
        icon: Building,
    },
    {
        title: "Personnes",
        url: "#",
        icon: Contact,
    },
    // {
    //     title: "Affectations",
    //     url: "#",
    //     icon: Send,
    // },
    {
        title: "Settings",
        url: "#",
        icon: Settings,
    },
]

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarContent className={"bg-gray-300"}>
                <SidebarGroup className={"mt-5 ml-5"}>
                    <SidebarGroupLabel className={"text-2xl"}>Gestion Territoire</SidebarGroupLabel>
                    <SidebarGroupContent className={"mt-10"}>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title} className={"mb-3"}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
