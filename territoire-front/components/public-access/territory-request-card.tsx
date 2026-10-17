"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Hourglass, MapPinPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  PublicAccess,
  PublicCity,
  PublicTerritoryRequest,
  REQUEST_COMMENT_MAX_LENGTH,
} from "@/models/person-access";
import {
  cancelTerritoryRequest,
  requestNewTerritory,
} from "@/lib/public-access-api";

/** Valeur du choix « peu importe » (Radix Select n'accepte pas de valeur vide). */
const ANY_CITY = "peu-importe";

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { dateStyle: "long" });

type Props = {
  token: string;
  cities: PublicCity[];
  pendingRequest: PublicTerritoryRequest | null;
  hasTerritories: boolean;
  onUpdated: (data: PublicAccess) => void;
};

/** Demande d'un nouveau territoire au responsable, ou suivi de la demande en attente. */
export default function TerritoryRequestCard({
  token,
  cities,
  pendingRequest,
  hasTerritories,
  onUpdated,
}: Props) {
  return pendingRequest ? (
    <PendingRequest
      token={token}
      request={pendingRequest}
      onUpdated={onUpdated}
    />
  ) : (
    <NewRequest
      token={token}
      cities={cities}
      hasTerritories={hasTerritories}
      onUpdated={onUpdated}
    />
  );
}

function PendingRequest({
  token,
  request,
  onUpdated,
}: {
  token: string;
  request: PublicTerritoryRequest;
  onUpdated: (data: PublicAccess) => void;
}) {
  const cancel = async () => {
    try {
      onUpdated(await cancelTerritoryRequest(token, request.id));
      toast.success("Demande annulée");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hourglass className="h-5 w-5" />
          Demande de territoire envoyée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          Envoyée le {formatDay(request.createdAt)}. Ton responsable va
          t&apos;attribuer un territoire : il apparaîtra sur cette page.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Ville</dt>
          <dd>{request.cityName ?? "Peu importe"}</dd>
          {request.comment && (
            <>
              <dt className="text-muted-foreground">Commentaire</dt>
              <dd className="whitespace-pre-line">{request.comment}</dd>
            </>
          )}
        </dl>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Annuler ma demande
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler ta demande ?</AlertDialogTitle>
              <AlertDialogDescription>
                Ton responsable ne la verra plus. Tu pourras en refaire une
                ensuite.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Garder ma demande</AlertDialogCancel>
              <AlertDialogAction onClick={cancel}>
                Annuler la demande
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function NewRequest({
  token,
  cities,
  hasTerritories,
  onUpdated,
}: {
  token: string;
  cities: PublicCity[];
  hasTerritories: boolean;
  onUpdated: (data: PublicAccess) => void;
}) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(ANY_CITY);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const data = await requestNewTerritory(token, {
        cityId: city === ANY_CITY ? null : city,
        comment: comment.trim() || null,
      });
      setOpen(false);
      setCity(ANY_CITY);
      setComment("");
      onUpdated(data);
      toast.success("Demande envoyée à ton responsable, merci !");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPinPlus className="h-5 w-5" />
          {hasTerritories
            ? "Besoin d'un autre territoire ?"
            : "Besoin d'un territoire ?"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Fais une demande à ton responsable : choisis une ville si tu as une
          préférence.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">Demander un territoire</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Demander un territoire</DialogTitle>
                <DialogDescription>
                  Ton responsable recevra ta demande et t&apos;attribuera un
                  territoire.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="request-city">Ville souhaitée</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger id="request-city" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_CITY}>Peu importe</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-comment">
                  Commentaire (facultatif)
                </Label>
                <Textarea
                  id="request-comment"
                  rows={4}
                  maxLength={REQUEST_COMMENT_MAX_LENGTH}
                  placeholder="Ex. : plutôt des maisons, près de chez moi, disponible le samedi…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {comment.length} / {REQUEST_COMMENT_MAX_LENGTH}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? "Envoi..." : "Envoyer la demande"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
