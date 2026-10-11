import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

/** Layout de l'application de gestion (sidebar). Les pages publiques (/m/...) n'en héritent pas. */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider id={"sidebar"}>
      <AppSidebar />
      <main className={"bg-gray-200 w-screen"}>
        <SidebarTrigger className={"fixed top-0 left-0 z-50"} />
        {children}
      </main>
    </SidebarProvider>
  );
}
