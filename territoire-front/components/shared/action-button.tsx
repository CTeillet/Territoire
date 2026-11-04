import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ActionButtonProps = {
  icon: React.FC;
  tooltip: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

/** Bouton icône avec infobulle, au contour comme les autres boutons secondaires (pas de couleur propre). */
const ActionButton: React.FC<ActionButtonProps> = ({
  icon: Icon,
  tooltip,
  href,
  onClick,
  className,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button asChild variant="outline" size="icon" className={className}>
            <Link href={href} aria-label={tooltip}>
              <Icon />
            </Link>
          </Button>
        ) : (
          // Bouton icône seule : l'infobulle sert aussi de nom accessible
          <Button
            variant="outline"
            size="icon"
            className={className}
            onClick={onClick}
            aria-label={tooltip}
          >
            <Icon />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

export default ActionButton;
