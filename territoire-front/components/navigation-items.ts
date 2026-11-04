import {
  BarChart3,
  Building,
  Calendar,
  ChartBar,
  Clock,
  Contact,
  Inbox,
  MapPin,
  Printer,
  Settings,
} from "lucide-react";

/** Rubriques de l'application de gestion : menu latéral et recherche rapide (Ctrl+K). */
// Menu items.
export const dashboardItems = [
  {
    title: "Tableau de bord",
    url: "/",
    icon: ChartBar,
  },
];

// Territory-related items
export const territoryItems = [
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
export const otherItems = [
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
