"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, RefreshCw, Send, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAppSelector } from "@/store/store";
import {
  ACCESS_STATUS_LABELS,
  AccessStatus,
  PersonAccessStatus,
} from "@/models/person-access";
import {
  canManageAccess,
  canSendAccess,
  fetchPersonAccess,
  regeneratePersonAccess,
  revokePersonAccess,
  sendPersonAccess,
  updatePersonAccessExpiration,
} from "@/lib/person-access-api";

export const ACCESS_STATUS_BADGE: Record<AccessStatus, string> = {
  AUCUN: "bg-gray-400",
  ACTIF: "bg-green-600",
  EXPIRE: "bg-orange-500",
  REVOQUE: "bg-red-600",
};

export const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "jamais";

/**
 * Lien personnel d'une personne : consultation, envoi par WhatsApp, copie, régénération, révocation et expiration.
 */
export default function PersonAccessCard({ personId }: { personId: string }) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [access, setAccess] = useState<PersonAccessStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    try {
      const status = await fetchPersonAccess(personId);
      setAccess(status);
      setExpiresAt(status.expiresAt ?? "");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [personId]);

  useEffect(() => {
    if (canSendAccess(role)) {
      load();
    }
  }, [load, role]);

  if (!canSendAccess(role)) return null;

  const run = async (
    action: () => Promise<PersonAccessStatus>,
    success: string
  ) => {
    setBusy(true);
    try {
      const status = await action();
      setAccess(status);
      setExpiresAt(status.expiresAt ?? "");
      toast.success(success);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!access?.link) return;
    try {
      await navigator.clipboard.writeText(access.link);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const manage = canManageAccess(role);
  const status = access?.status ?? "AUCUN";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <KeyRound className="h-5 w-5" />
          Accès numérique
          <Badge className={`${ACCESS_STATUS_BADGE[status]} text-white`}>
            {ACCESS_STATUS_LABELS[status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Lien personnel pour consulter ses territoires en cours (carte,
          adresses à ne pas visiter) et les rendre. Ne montre jamais
          l&apos;historique.
        </p>

        {access && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Territoires en cours</dt>
              <dd>{access.activeTerritories}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dernier envoi</dt>
              <dd>{formatDateTime(access.lastSentAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dernière ouverture</dt>
              <dd>{formatDateTime(access.lastUsedAt)}</dd>
            </div>
          </dl>
        )}

        {access?.link && (
          <div className="flex gap-2">
            <Input readOnly value={access.link} className="font-mono text-xs" />
            <Button variant="outline" onClick={copyLink} title="Copier le lien">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              busy ||
              !access?.hasPhone ||
              status === "REVOQUE" ||
              status === "EXPIRE"
            }
            title={
              access?.hasPhone
                ? undefined
                : "Aucun numéro : copiez le lien pour le transmettre"
            }
            onClick={() =>
              run(() => sendPersonAccess(personId), "Lien envoyé par WhatsApp")
            }
          >
            <Send className="h-4 w-4" />
            Envoyer par WhatsApp
          </Button>

          {manage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={busy}>
                  <RefreshCw className="h-4 w-4" />
                  {status === "AUCUN" ? "Générer le lien" : "Régénérer"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {status === "AUCUN"
                      ? "Générer le lien ?"
                      : "Régénérer le lien ?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {status === "AUCUN"
                      ? "Un lien personnel sera créé. Il ne sera pas envoyé automatiquement."
                      : "L'ancien lien cessera immédiatement de fonctionner. Pensez à envoyer le nouveau."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      run(
                        () => regeneratePersonAccess(personId),
                        "Nouveau lien généré"
                      )
                    }
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {manage && status !== "AUCUN" && status !== "REVOQUE" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy}>
                  <ShieldOff className="h-4 w-4" />
                  Révoquer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Révoquer le lien ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La personne ne pourra plus consulter ses territoires tant
                    qu&apos;un nouveau lien n&apos;est pas généré.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      run(() => revokePersonAccess(personId), "Lien révoqué")
                    }
                  >
                    Révoquer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {manage && status !== "AUCUN" && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor={`expires-${personId}`}>
                Expire le (facultatif)
              </Label>
              <Input
                id={`expires-${personId}`}
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-48"
              />
            </div>
            <Button
              variant="outline"
              disabled={busy || expiresAt === (access?.expiresAt ?? "")}
              onClick={() =>
                run(
                  () =>
                    updatePersonAccessExpiration(personId, expiresAt || null),
                  expiresAt
                    ? "Date d'expiration enregistrée"
                    : "Expiration supprimée"
                )
              }
            >
              Enregistrer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
