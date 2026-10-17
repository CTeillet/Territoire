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
          <Link href={href} aria-label={tooltip}>
            <Button className={className} tabIndex={-1}>
              <Icon />
            </Button>
          </Link>
        ) : (
          // Bouton icône seule : l'infobulle sert aussi de nom accessible
          <Button className={className} onClick={onClick} aria-label={tooltip}>
            <Icon />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

export default ActionButton;
