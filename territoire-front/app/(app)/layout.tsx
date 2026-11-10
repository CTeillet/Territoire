import React from "react";
import Image from "next/image";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { QuickSearch, QuickSearchButton } from "@/components/quick-search";
import { ClientOnly } from "@/components/shared/client-only";
import { WhatsAppStatusBanner } from "@/components/whatsapp-status-banner";

/** Layout de l'application de gestion (sidebar). Les pages publiques (/m/...) n'en héritent pas. */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider id={"sidebar"}>
      <AppSidebar />
      <main className={"bg-canvas min-w-0 flex-1"}>
        {/* Téléphone : barre collée en haut, le bouton du menu ne recouvre plus le contenu au défilement.
            Ordinateur : la barre s'efface (contents) et seul le bouton reste, fixé dans le coin. */}
        <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-border bg-canvas/95 px-2 backdrop-blur md:contents">
          <SidebarTrigger className="size-9 md:fixed md:top-0 md:left-0 md:z-50 md:size-7" />
          <Image
            src="/images/logo-complet.svg"
            alt="TMS"
            width={100}
            height={100}
            className="h-7 w-auto md:hidden"
          />
          <QuickSearchButton className="ml-auto md:hidden" />
        </header>
        <WhatsAppStatusBanner />
        {/* Les pages dépendent de la session, inconnue du serveur : rendues seulement dans le navigateur, sinon
            l'hydratation échoue (ex. onglets des paramètres selon le rôle, pages masquées hors connexion) */}
        <ClientOnly>{children}</ClientOnly>
        <QuickSearch />
      </main>
    </SidebarProvider>
  );
}
