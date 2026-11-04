import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_TRANSLATIONS,
  TerritoryStatus,
} from "@/models/territory-status";
import { territoryStatusStyle } from "@/components/territory/territory-status";

/**
 * Statut d'un territoire, partout le même : teinte du statut et pastille de la couleur des polygones de la carte.
 */
export function TerritoryStatusBadge({
  status,
  className,
}: {
  status: TerritoryStatus;
  className?: string;
}) {
  const { color, badge } = territoryStatusStyle(status);
  return (
    <Badge className={cn(badge, className)}>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {STATUS_TRANSLATIONS[status] ?? status}
    </Badge>
  );
}
