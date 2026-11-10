"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Person } from "@/models/person";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchPersons } from "@/store/slices/person-slice";
import { fetchTerritories } from "@/store/slices/territory-slice";
import {
  anonymizePerson,
  ArchivedTerritory,
  fetchArchivedPersons,
  fetchArchivedTerritories,
  restorePerson,
  restoreTerritory,
} from "@/lib/archive-api";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "";

/**
 * Territoires archivés et personnes parties : les restaurer, et anonymiser une personne partie (administrateur). Leur
 * historique d'attributions est toujours gardé.
 */
export function ArchivesSection() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((state) => state.auth.user?.role);
  const [territories, setTerritories] = useState<ArchivedTerritory[] | null>(
    null
  );
  const [persons, setPersons] = useState<Person[] | null>(null);
  // Incrémenté pour recharger les listes après une action
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchArchivedTerritories(), fetchArchivedPersons()])
      .then(([archivedTerritories, archivedPersons]) => {
        if (cancelled) return;
        setTerritories(archivedTerritories);
        setPersons(archivedPersons);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setTerritories([]);
        setPersons([]);
        toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [reloads]);

  const run = async (
    key: string,
    action: () => Promise<unknown>,
    success: string
  ) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      setReloads((count) => count + 1);
      // Listes de l'application à jour (territoires et personnes restaurés)
      dispatch(fetchTerritories());
      dispatch(fetchPersons());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (territories === null || persons === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-semibold">Territoires archivés</h3>
        {territories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun territoire archivé.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Territoire</TableHead>
                <TableHead>Archivé le</TableHead>
                <TableHead>Attributions</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {territories.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <span className="font-medium">{t.name}</span>{" "}
                    <span className="text-muted-foreground">
                      ({t.cityName})
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(t.archivedAt)}</TableCell>
                  <TableCell className="tabular-nums">
                    {t.assignments}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy !== null}
                      onClick={() =>
                        run(
                          t.id,
                          () => restoreTerritory(t.id),
                          `Territoire ${t.name} restauré`
                        )
                      }
                    >
                      Restaurer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Personnes parties</h3>
        {persons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune personne partie.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personne</TableHead>
                <TableHead>Partie le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map((p) => {
                const id = p.id as string;
                const name = `${p.firstName} ${p.lastName}`;
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">
                      {name}{" "}
                      {p.anonymizedAt && (
                        <Badge variant="neutral">anonymisée</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(p.archivedAt)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {!p.anonymizedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy !== null}
                          onClick={() =>
                            run(
                              id,
                              () => restorePerson(id),
                              `${name} restauré(e)`
                            )
                          }
                        >
                          Restaurer
                        </Button>
                      )}
                      {role === "ADMIN" && !p.anonymizedAt && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive-outline"
                              size="sm"
                              disabled={busy !== null}
                            >
                              Anonymiser
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Anonymiser {name} ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Son nom est remplacé par « Personne anonymisée »
                                et ses coordonnées, son lien personnel et les
                                commentaires de ses demandes sont effacés. Son
                                historique d&apos;attributions reste compté,
                                sans la nommer. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() =>
                                  run(
                                    id,
                                    () => anonymizePerson(id),
                                    `${name} anonymisée`
                                  )
                                }
                              >
                                Anonymiser
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
