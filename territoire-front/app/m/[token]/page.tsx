"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  MapPinOff,
  RefreshCw,
  Undo2,
  WifiOff,
} from "lucide-react";
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
import {
  clearOfflineView,
  isOfflineResponse,
  keepPageForOffline,
  readOfflineView,
  saveOfflineView,
} from "@/lib/public-access-offline";

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
  /** `offlineSince` : vue gardée sur l'appareil, affichée faute de réseau (date de sa réception). */
  | { kind: "ready"; data: PublicAccess; offlineSince?: string };

const NO_NETWORK = "Pas de connexion réseau. Réessayez plus tard.";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (value: string | null) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
        dateStyle: "long",
      })
    : "—";

export default function MyTerritoriesPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  // Vue à jour : affichée et gardée sur l'appareil pour la consulter sans réseau
  const showFresh = useCallback(
    (data: PublicAccess) => {
      saveOfflineView(token, data);
      setState({ kind: "ready", data });
    },
    [token]
  );

  const showOffline = useCallback(() => {
    const view = readOfflineView(token);
    setState(
      view
        ? { kind: "ready", data: view.data, offlineSince: view.savedAt }
        : { kind: "error", message: NO_NETWORK }
    );
  }, [token]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/acces/${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        showFresh(await res.json());
        keepPageForOffline();
      } else if (isOfflineResponse(res)) {
        showOffline();
      } else {
        // Lien révoqué ou expiré : plus rien ne doit rester consultable sur l'appareil
        if (res.status === 404) clearOfflineView(token);
        setState({ kind: "error", message: await errorFrom(res) });
      }
    } catch {
      showOffline();
    }
  }, [token, showFresh, showOffline]);

  useEffect(() => {
    load();
    // Le réseau revient : la vue se met à jour d'elle-même
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [load]);

  const returnTerritory = async (territory: PublicTerritory) => {
    try {
      const res = await fetch(
        `/api/public/acces/${encodeURIComponent(token)}/territoires/${territory.id}/retour`,
        { method: "POST", cache: "no-store" }
      );
      if (!res.ok) {
        toast.error(
          isOfflineResponse(res)
            ? "Pas de connexion réseau : le territoire n'a pas été rendu."
            : await errorFrom(res)
        );
        return;
      }
      showFresh(await res.json());
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
  const offline = state.offlineSince !== undefined;

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

      {offline && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <WifiOff aria-hidden="true" className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1">
            Hors ligne : informations du {formatDateTime(state.offlineSince!)}.
            Rendre un territoire ou en demander un reprendra avec le réseau.
          </p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      )}

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
                <Button className="w-full sm:w-auto" disabled={offline}>
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

      {!offline && (
        <TerritoryRequestCard
          token={token}
          cities={cities ?? []}
          pendingRequest={pendingRequest ?? null}
          hasTerritories={territories.length > 0}
          onUpdated={showFresh}
        />
      )}

      <p className="pt-4 text-center text-xs text-muted-foreground">
        Ce lien t&apos;est personnel : merci de ne pas le partager.
      </p>
    </div>
  );
}
