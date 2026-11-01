"use client";
import {
  Building,
  ChartBar,
  Contact,
  Settings,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Inbox,
  Printer,
} from "lucide-react";

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
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import NavUser from "@/components/nav-user";
import { useIsClient } from "@/hooks/use-is-client";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import React, { useEffect, useState } from "react";
import { canSendAccess } from "@/lib/person-access-api";
import {
  fetchPendingTerritoryRequestCount,
  TERRITORY_REQUESTS_CHANGED,
} from "@/lib/territory-request-api";

// Menu items.
const dashboardItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: ChartBar,
  },
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
  },
  {
    title: "Impression des cartes",
    url: "/territoires/impression",
    icon: Printer,
  },
];

// Other items
const otherItems = [
  {
    title: "Personnes",
    url: "/personnes",
    icon: Contact,
  },
  {
    title: "Demandes",
    url: "/demandes",
    icon: Inbox,
  },
  {
    title: "Campagnes",
    url: "/campagnes",
    icon: Calendar,
  },
  {
    title: "Statistiques",
    url: "/statistiques",
    icon: BarChart3,
  },
  {
    title: "Paramètres",
    url: "/parametres",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.auth.user);
  const [territoryExpanded, setTerritoryExpanded] = useState(true);
  // La session n'est connue que du navigateur (cookies) : rien qui en dépende au rendu serveur ni à l'hydratation
  const isClient = useIsClient();
  const canSeeRequests = isClient && canSendAccess(user?.role);
  const pendingRequests = usePendingRequestCount(canSeeRequests, pathname);

  // Check if any territory page is active
  const isTerritoryActive = pathname.startsWith("/territoires");

  // Helper function to check if a menu item is active
  const isItemActive = (itemUrl: string) => {
    // For root path, exact match; for others, check if it's the most specific match
    const allItems = [...dashboardItems, ...territoryItems, ...otherItems];
    return itemUrl === "/"
      ? pathname === "/"
      : pathname.startsWith(itemUrl) &&
          // Make sure no other more specific item matches this path
          !allItems.some(
            (otherItem) =>
              otherItem.url !== itemUrl &&
              pathname.startsWith(otherItem.url) &&
              otherItem.url.startsWith(itemUrl)
          );
  };

  // Render a menu item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMenuItem = (item: { title: string; url: string; icon: any }) => (
    <SidebarMenuItem key={item.title} className="mb-4">
      <SidebarMenuButton asChild>
        <Link
          href={item.url}
          className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200
                        ${isItemActive(item.url) ? "bg-gray-400 text-primary font-bold shadow-sm" : "hover:bg-gray-200"}`}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-base">{item.title}</span>
          {item.url === "/demandes" && pendingRequests > 0 && (
            <span
              className="ml-auto rounded-full bg-blue-600 px-2 text-xs font-semibold text-white"
              aria-label={`${pendingRequests} en attente`}
            >
              {pendingRequests}
            </span>
          )}
        </Link>
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
                  {territoryExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </SidebarMenuItem>

              {/* Territory sub-items */}
              {territoryExpanded && (
                <div className="ml-6 border-l-2 border-gray-400 pl-2">
                  {territoryItems.map(renderMenuItem)}
                </div>
              )}

              {/* Other items */}
              {otherItems
                .filter((item) => item.url !== "/demandes" || canSeeRequests)
                .map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Afficher le footer uniquement si l'utilisateur est connecté */}
        {isClient && user && (
          <SidebarFooter className="p-3 bg-gray-200 border-t">
            <NavUser />
          </SidebarFooter>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

/** Nombre de demandes de territoire en attente, rafraîchi à chaque navigation et après chaque action sur une demande. */
function usePendingRequestCount(enabled: boolean, pathname: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const refresh = () =>
      fetchPendingTerritoryRequestCount()
        .then((value) => !cancelled && setCount(value))
        .catch(() => {
          // Compteur indicatif : une erreur ne doit pas gêner la navigation
        });
    refresh();
    window.addEventListener(TERRITORY_REQUESTS_CHANGED, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(TERRITORY_REQUESTS_CHANGED, refresh);
    };
  }, [enabled, pathname]);

  return enabled ? count : 0;
}
