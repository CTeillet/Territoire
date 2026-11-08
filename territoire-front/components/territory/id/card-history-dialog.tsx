"use client";

import React, { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/page-layout";
import {
  CardVersion,
  fetchCardHistory,
  fetchCardVersionImage,
  restoreCardVersion,
} from "@/lib/card-history-api";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });

/** Aperçu d'une carte précédente, chargé avec la session (l'image n'est pas publique). */
function CardVersionImage({
  territoryId,
  version,
}: {
  territoryId: string;
  version: CardVersion;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchCardVersionImage(territoryId, version.id)
      .then((created) => {
        objectUrl = created;
        if (cancelled) URL.revokeObjectURL(created);
        else setUrl(created);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [territoryId, version.id]);

  if (failed) {
    return <p className="text-sm text-muted-foreground">Aperçu indisponible</p>;
  }
  if (!url) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Carte remplacée le ${formatDateTime(version.replacedAt)}`}
      className="max-h-72 w-full rounded-md border object-contain"
    />
  );
}

/**
 * Cartes précédentes d'un territoire (remplacées par une carte générée ou importée) : les revoir et en remettre une.
 * La carte actuelle n'est jamais perdue : remise de côté, elle rejoint la liste.
 */
export function CardHistoryDialog({
  territoryId,
  territoryName,
  onRestored,
}: {
  territoryId: string;
  territoryName: string;
  onRestored: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<CardVersion[] | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchCardHistory(territoryId)
      .then((list) => {
        if (!cancelled) setVersions(list);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setVersions([]);
        toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, territoryId]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setVersions(null);
  };

  const restore = async (version: CardVersion) => {
    setRestoring(version.id);
    try {
      await restoreCardVersion(territoryId, version.id);
      toast.success(
        `Carte du ${formatDateTime(version.replacedAt)} remise pour ${territoryName}`
      );
      changeOpen(false);
      onRestored();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History aria-hidden="true" />
          Cartes précédentes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cartes précédentes</DialogTitle>
          <DialogDescription>
            Les cartes remplacées du territoire {territoryName}, la plus récente
            d&apos;abord. Remettre l&apos;une d&apos;elles garde la carte
            actuelle dans cette liste.
          </DialogDescription>
        </DialogHeader>

        {versions === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Chargement...
          </p>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucune carte précédente"
            description="Une carte générée ou importée garde ici celle qu'elle remplace."
          />
        ) : (
          <ul className="space-y-4">
            {versions.map((version) => (
              <li key={version.id} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    Remplacée le{" "}
                    <span className="font-medium">
                      {formatDateTime(version.replacedAt)}
                    </span>
                    {version.fileName && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({version.fileName})
                      </span>
                    )}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={restoring !== null}
                      >
                        {restoring === version.id && (
                          <Loader2
                            aria-hidden="true"
                            className="animate-spin"
                          />
                        )}
                        Remettre cette carte
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remettre cette carte ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Elle redevient la carte du territoire, celle
                          qu&apos;imprime la page « Impression des cartes ». La
                          carte actuelle est gardée dans les cartes précédentes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => restore(version)}>
                          Remettre
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardVersionImage territoryId={territoryId} version={version} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
