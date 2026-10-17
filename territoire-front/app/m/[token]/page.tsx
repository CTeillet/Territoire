"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, MapPinOff, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import TerritoryRequestCard from "@/components/public-access/territory-request-card";
import { PublicAccess, PublicTerritory } from "@/models/person-access";
import { publicErrorMessage as errorFrom } from "@/lib/public-access-api";

const PublicTerritoryMap = dynamic(
  () => import("@/components/public-access/public-territory-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 rounded-md bg-gray-200 animate-pulse" />
    ),
  }
);

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: PublicAccess };

const formatDate = (value: string | null) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
        dateStyle: "long",
      })
    : "—";

export default function MyTerritoriesPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/acces/${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      setState(
        res.ok
          ? { kind: "ready", data: await res.json() }
          : { kind: "error", message: await errorFrom(res) }
      );
    } catch {
      setState({
        kind: "error",
        message: "Pas de connexion réseau. Réessayez plus tard.",
      });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const returnTerritory = async (territory: PublicTerritory) => {
    try {
      const res = await fetch(
        `/api/public/acces/${encodeURIComponent(token)}/territoires/${territory.id}/retour`,
        { method: "POST", cache: "no-store" }
      );
      if (!res.ok) {
        toast.error(await errorFrom(res));
        return;
      }
      setState({ kind: "ready", data: await res.json() });
      toast.success(`Territoire ${territory.name} rendu, merci !`);
    } catch {
      toast.error("Pas de connexion réseau : le territoire n'a pas été rendu.");
    }
  };

  if (state.kind === "loading") {
    return (
      <p className="p-6 text-center text-muted-foreground">Chargement...</p>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            {state.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { firstName, territories, cities, pendingRequest } = state.data;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Bonjour {firstName}</h1>
        <p className="text-muted-foreground">
          {territories.length === 0
            ? "Tu n'as aucun territoire en cours."
            : `Tu as ${territories.length} territoire${territories.length > 1 ? "s" : ""} en cours.`}
        </p>
      </header>

      {territories.map((territory) => (
        <Card key={territory.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {territory.name}
              {territory.cityName && (
                <span className="text-base font-normal text-muted-foreground">
                  {territory.cityName}
                </span>
              )}
              {territory.late && (
                <Badge className="bg-pink-600 text-white">En retard</Badge>
              )}
            </CardTitle>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" />À rendre avant le{" "}
              {formatDate(territory.dueDate)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {territory.note && (
              <p className="rounded-md bg-yellow-50 p-3 text-sm whitespace-pre-line">
                {territory.note}
              </p>
            )}

            <PublicTerritoryMap geojson={territory.geojson} />

            <section className="space-y-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <MapPinOff className="h-4 w-4" />
                Adresses à ne pas visiter
              </h2>
              {territory.addressesNotToDo.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune adresse signalée.
                </p>
              ) : (
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  {territory.addressesNotToDo.map((address, index) => (
                    <li key={index}>
                      {[address.number, address.street]
                        .filter(Boolean)
                        .join(" ")}
                      {address.city &&
                        `, ${[address.zipCode, address.city].filter(Boolean).join(" ")}`}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Undo2 className="h-4 w-4" />
                  Rendre ce territoire
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rendre {territory.name} ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le territoire ne te sera plus attribué et disparaîtra de
                    cette page. Fais-le quand tu as terminé ou si tu ne
                    l&apos;utilises plus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => returnTerritory(territory)}>
                    Rendre
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ))}

      <TerritoryRequestCard
        token={token}
        cities={cities ?? []}
        pendingRequest={pendingRequest ?? null}
        hasTerritories={territories.length > 0}
        onUpdated={(data) => setState({ kind: "ready", data })}
      />

      <p className="pt-4 text-center text-xs text-muted-foreground">
        Ce lien t&apos;est personnel : merci de ne pas le partager.
      </p>
    </div>
  );
}
