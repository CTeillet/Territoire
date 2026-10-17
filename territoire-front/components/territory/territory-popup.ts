import {
  STATUS_TRANSLATIONS,
  TerritoryStatus,
} from "@/models/territory-status";
import { getBadgeColor } from "@/components/utils";

/**
 * Contenu statique du popup d'un territoire sur la carte (nom + statut) et emplacement où React insère les boutons.
 * Construit avec le DOM et textContent : le nom d'un territoire est une saisie utilisateur et ne doit jamais être
 * interprété comme du HTML (XSS).
 */
export function buildTerritoryPopup(
  id: string,
  name: string,
  status: TerritoryStatus
): HTMLDivElement {
  const container = document.createElement("div");

  const title = document.createElement("div");
  title.className = "text-center";
  const heading = document.createElement("h2");
  heading.className = "text-lg font-bold";
  heading.textContent = name;
  title.appendChild(heading);

  const badgeWrapper = document.createElement("div");
  badgeWrapper.className = "flex justify-center mt-2 mb-5";
  const badge = document.createElement("span");
  badge.className = `${getBadgeColor(status)} text-white px-2 py-1 rounded w-full text-center`;
  badge.textContent = STATUS_TRANSLATIONS[status] || status;
  badgeWrapper.appendChild(badge);

  const reactSlot = document.createElement("div");
  reactSlot.id = `react-popup-${id}`;

  container.append(title, badgeWrapper, reactSlot);
  return container;
}
