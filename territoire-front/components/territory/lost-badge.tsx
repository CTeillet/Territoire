import { Badge } from "@/components/ui/badge";

/** Territoire perdu : sa carte papier a disparu, il est proposé à la réimpression. */
export function LostBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={className}>
      Perdu
    </Badge>
  );
}
