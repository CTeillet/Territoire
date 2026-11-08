import React from "react";
import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Cadre commun des pages de l'application : mêmes marges et même espacement entre les blocs partout.
 */
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-6 p-4 md:p-6", className)} {...props} />;
}

/** Retour à la liste d'où vient une fiche, au même endroit sur toutes les fiches. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2.5">
      <Link href={href}>
        <ArrowLeft aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Boutons de la page (créer, modifier...), à droite du titre ; dessous sur téléphone. */
  actions?: React.ReactNode;
  /** Retour à la liste d'où vient une fiche. */
  back?: { href: string; label: string };
}

/** En-tête de page : titre, description et actions, au même format sur toutes les pages. */
export function PageHeader({
  title,
  description,
  actions,
  back,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {back && <BackLink {...back} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold break-words md:text-3xl">
            {title}
          </h1>
          {description && (
            <div className="text-muted-foreground">{description}</div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

/** Chargement d'une page ou d'un bloc. */
export function LoadingState({
  message = "Chargement...",
}: {
  message?: string;
}) {
  return (
    <p
      role="status"
      className="flex h-64 items-center justify-center text-muted-foreground"
    >
      {message}
    </p>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Action ou aide sous le message (ex. créer le premier élément). */
  children?: React.ReactNode;
}

/** Liste vide : icône, message et, au besoin, de quoi en sortir. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="h-12 w-12 text-muted-foreground"
          />
        )}
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="max-w-md text-muted-foreground">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </CardContent>
    </Card>
  );
}
