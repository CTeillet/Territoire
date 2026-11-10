"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import AssignFromRequestDialog from "@/components/territory-request/assign-from-request-dialog";
import { formatDateTime } from "@/components/person/person-access-card";
import { useAuth } from "@/hooks/use-auth";
import { useAppSelector } from "@/store/store";
import { canSendAccess } from "@/lib/person-access-api";
import { PageContainer, PageHeader } from "@/components/shared/page-layout";
import {
  closeTerritoryRequest,
  fetchTerritoryRequests,
  notifyTerritoryRequestsChanged,
} from "@/lib/territory-request-api";
import {
  TERRITORY_REQUEST_STATUS_LABELS,
  TerritoryRequest,
  TerritoryRequestStatus,
} from "@/models/territory-request";

const STATUS_BADGE: Record<
  TerritoryRequestStatus,
  "info" | "success" | "neutral"
> = {
  EN_ATTENTE: "info",
  ATTRIBUEE: "success",
  CLOTUREE: "neutral",
  ANNULEE: "neutral",
};

/** Demandes de nouveau territoire faites par les personnes depuis leur lien personnel. */
export default function TerritoryRequestsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const role = useAppSelector((state) => state.auth.user?.role);
  const allowed = canSendAccess(role);
  const [withHistory, setWithHistory] = useState(false);
  const [requests, setRequests] = useState<TerritoryRequest[] | null>(null);
  const [assigning, setAssigning] = useState<TerritoryRequest | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Incrémenté pour recharger la liste après une action
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !allowed) return;
    let cancelled = false;
    fetchTerritoryRequests(withHistory)
      .then((list) => {
        if (!cancelled) setRequests(list);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setRequests([]);
        toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, allowed, withHistory, reloads]);

  const refresh = () => {
    setReloads((count) => count + 1);
    notifyTerritoryRequestsChanged();
  };

  const close = async (request: TerritoryRequest) => {
    try {
      await closeTerritoryRequest(request.id);
      toast.success(`Demande de ${request.personName} clôturée`);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!isAuthenticated) return null;

  if (!allowed) {
    return (
      <p className="p-6 text-muted-foreground">
        Les demandes de territoire sont réservées aux responsables.
      </p>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Demandes de territoire"
        description="Faites par les personnes depuis leur lien personnel. Attribuer un territoire à la personne clôture sa demande."
        actions={
          <div className="flex items-center gap-2">
            <Checkbox
              id="with-history"
              className="bg-white"
              checked={withHistory}
              onCheckedChange={(checked) => setWithHistory(Boolean(checked))}
            />
            <Label htmlFor="with-history">Afficher les demandes traitées</Label>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Personne</TableHead>
              <TableHead>Ville souhaitée</TableHead>
              <TableHead>Commentaire</TableHead>
              <TableHead>En cours</TableHead>
              <TableHead className="text-right">
                {withHistory ? "Suivi" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests === null && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Chargement...
                </TableCell>
              </TableRow>
            )}
            {requests?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {withHistory
                    ? "Aucune demande pour le moment"
                    : "Aucune demande en attente"}
                </TableCell>
              </TableRow>
            )}
            {requests?.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(request.createdAt)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/personnes/${request.personId}`}
                    className="underline"
                  >
                    {request.personName}
                  </Link>
                </TableCell>
                <TableCell>
                  {request.cityName ?? (
                    <span className="text-muted-foreground">Peu importe</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs whitespace-pre-line">
                  {request.comment ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{request.activeTerritories}</TableCell>
                <TableCell className="text-right">
                  {request.status === "EN_ATTENTE" ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => setAssigning(request)}>
                        Attribuer
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Clôturer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Clôturer la demande de {request.personName} ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              La demande disparaîtra de sa page sans
                              attribution. Pensez à prévenir la personne.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => close(request)}>
                              Clôturer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={STATUS_BADGE[request.status]}>
                        {TERRITORY_REQUEST_STATUS_LABELS[request.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {request.territoryId && request.territoryName && (
                          <>
                            <Link
                              href={`/territoires/${request.territoryId}`}
                              className="underline"
                            >
                              {request.territoryName}
                            </Link>
                            {" · "}
                          </>
                        )}
                        {formatDateTime(request.closedAt)}
                      </span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AssignFromRequestDialog
        request={assigning}
        onOpenChange={(open) => !open && setAssigning(null)}
        onAssigned={refresh}
      />
    </PageContainer>
  );
}
