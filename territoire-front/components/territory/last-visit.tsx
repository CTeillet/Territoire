import { Badge } from "@/components/ui/badge";
import { formatDay, lastVisitDate, timeSince } from "@/lib/dates";

/** Dernier parcours d'un territoire : la date et le temps écoulé depuis, ou « Jamais parcouru ». */
export function LastVisit({ value }: { value?: string | null }) {
  const date = lastVisitDate(value);
  if (!date) return <Badge variant="info">Jamais parcouru</Badge>;
  return (
    <span>
      <span className="block whitespace-nowrap">{formatDay(date)}</span>
      <span className="block text-xs text-muted-foreground">
        {timeSince(date)}
      </span>
    </span>
  );
}
