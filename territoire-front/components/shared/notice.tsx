import React from "react";
import { cn } from "@/lib/utils";
import { Tone, toneSurface } from "@/components/shared/tones";

/**
 * Encadré d'information (hors ligne, territoires perdus, attribution impossible...) : le même partout, dans le ton de
 * son message.
 */
export function Notice({
  tone = "info",
  className,
  ...props
}: React.ComponentProps<"div"> & { tone?: Tone }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        toneSurface[tone],
        className
      )}
      {...props}
    />
  );
}
