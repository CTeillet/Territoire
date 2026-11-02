import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Territoire perdu : sa carte papier a disparu, il est proposé à la réimpression. */
export function LostBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn("bg-orange-500 text-white px-2 py-1 rounded", className)}
    >
      Perdu
    </Badge>
  );
}
