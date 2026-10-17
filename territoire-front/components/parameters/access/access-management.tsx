"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAppSelector } from "@/store/store";
import { validateTemplate } from "@/lib/template";
import {
  ACCESS_STATUS_LABELS,
  AccessSettings,
  PersonAccessStatus,
} from "@/models/person-access";
import {
  canManageAccess,
  fetchAccessSettings,
  fetchAllAccesses,
  saveAccessSettings,
  sendPersonAccess,
} from "@/lib/person-access-api";
import {
  ACCESS_STATUS_BADGE,
  formatDateTime,
} from "@/components/person/person-access-card";

export type Filter =
  "ALL" | "WITH_TERRITORIES" | "NEVER_OPENED" | "NO_LINK" | "INACTIVE";

const FILTER_LABELS: Record<Filter, string> = {
  ALL: "Tout le monde",
  WITH_TERRITORIES: "Avec un territoire en cours",
  NEVER_OPENED: "Lien jamais ouvert",
  NO_LINK: "Sans lien actif",
  INACTIVE: "Pas ouvert depuis 30 jours",
};

const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;
/** Pause entre deux envois groupés : limite le risque de blocage du numéro WhatsApp. */
export const BULK_SEND_DELAY_MS = 2000;

export const matchesFilter = (a: PersonAccessStatus, filter: Filter) => {
  switch (filter) {
    case "WITH_TERRITORIES":
      return a.activeTerritories > 0;
    case "NEVER_OPENED":
      return a.status === "ACTIF" && !a.lastUsedAt;
    case "NO_LINK":
      return a.status !== "ACTIF";
    case "INACTIVE":
      return (
        a.status === "ACTIF" &&
        (!a.lastUsedAt ||
          Date.now() - new Date(a.lastUsedAt).getTime() > THIRTY_DAYS_MS)
      );
    default:
      return true;
  }
};

export const canBeSent = (a: PersonAccessStatus) =>
  a.hasPhone && (a.status === "ACTIF" || a.status === "AUCUN");

export default function AccessManagement() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [accesses, setAccesses] = useState<PersonAccessStatus[]>([]);
  const [filter, setFilter] = useState<Filter>("WITH_TERRITORIES");
  const [sending, setSending] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAccesses(await fetchAllAccesses());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => accesses.filter((a) => matchesFilter(a, filter)),
    [accesses, filter]
  );
  const sendable = visible.filter(canBeSent);

  const replace = (status: PersonAccessStatus) =>
    setAccesses((list) =>
      list.map((a) => (a.personId === status.personId ? status : a))
    );

  const send = async (personId: string) => {
    setSending(personId);
    try {
      replace(await sendPersonAccess(personId));
      toast.success("Lien envoyé par WhatsApp");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(null);
    }
  };

  const sendToAll = async () => {
    let failures = 0;
    for (let i = 0; i < sendable.length; i++) {
      setBulkProgress(`${i + 1} / ${sendable.length}`);
      try {
        replace(await sendPersonAccess(sendable[i].personId));
      } catch {
        failures++;
      }
      if (i < sendable.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BULK_SEND_DELAY_MS));
      }
    }
    setBulkProgress(null);
    if (failures === 0) {
      toast.success(`${sendable.length} lien(s) envoyé(s)`);
    } else {
      toast.error(`${failures} envoi(s) en échec sur ${sendable.length}`);
    }
  };

  const copy = async (link: string | null) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {canManageAccess(role) && <AccessSettingsForm />}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Liens personnels</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FILTER_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={sendable.length === 0 || bulkProgress !== null}>
                <Send className="h-4 w-4" />
                {bulkProgress
                  ? `Envoi ${bulkProgress}...`
                  : `Envoyer à la sélection (${sendable.length})`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Envoyer {sendable.length} lien(s) ?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Un message WhatsApp sera envoyé à chaque personne de la
                  sélection ayant un numéro, avec une pause de quelques secondes
                  entre chaque envoi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={sendToAll}>
                  Envoyer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personne</TableHead>
                <TableHead>État</TableHead>
                <TableHead>En cours</TableHead>
                <TableHead>Dernier envoi</TableHead>
                <TableHead>Dernière ouverture</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Personne dans cette sélection
                  </TableCell>
                </TableRow>
              )}
              {visible.map((a) => (
                <TableRow key={a.personId}>
                  <TableCell>
                    <Link
                      href={`/personnes/${a.personId}`}
                      className="underline"
                    >
                      {a.personName}
                    </Link>
                    {!a.hasPhone && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (sans numéro)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${ACCESS_STATUS_BADGE[a.status]} text-white`}
                    >
                      {ACCESS_STATUS_LABELS[a.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.activeTerritories}</TableCell>
                  <TableCell>{formatDateTime(a.lastSentAt)}</TableCell>
                  <TableCell>{formatDateTime(a.lastUsedAt)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {a.link && (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Copier le lien"
                        onClick={() => copy(a.link)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={
                        !canBeSent(a) ||
                        sending === a.personId ||
                        bulkProgress !== null
                      }
                      onClick={() => send(a.personId)}
                    >
                      <Send className="h-4 w-4" />
                      Envoyer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function AccessSettingsForm() {
  const [settings, setSettings] = useState<AccessSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccessSettings()
      .then(setSettings)
      .catch((e: Error) => toast.error(e.message));
  }, []);

  if (!settings) return null;

  const save = async () => {
    for (const template of [
      settings.assignmentMessage,
      settings.accessLinkMessage,
    ]) {
      const error = validateTemplate(template);
      if (error) {
        toast.error(`Gabarit invalide : ${error}`);
        return;
      }
    }
    setSaving(true);
    try {
      setSettings(await saveAccessSettings(settings));
      toast.success("Réglages enregistrés");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Réglages</h2>
      <div className="flex items-center gap-3">
        <Checkbox
          id="assignment-notification"
          checked={settings.assignmentNotificationEnabled}
          onCheckedChange={(checked) =>
            setSettings({
              ...settings,
              assignmentNotificationEnabled: Boolean(checked),
            })
          }
        />
        <Label htmlFor="assignment-notification">
          Envoyer automatiquement un message WhatsApp avec le lien à chaque
          attribution (si la personne a un numéro)
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="assignment-message">
          Message envoyé à l&apos;attribution
        </Label>
        <Textarea
          id="assignment-message"
          rows={7}
          value={settings.assignmentMessage}
          onChange={(e) =>
            setSettings({ ...settings, assignmentMessage: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Variables : <code>{"{{ person.firstName }}"}</code>,{" "}
          <code>{"{{ person.name }}"}</code>,{" "}
          <code>{"{{ territory.name }}"}</code>,{" "}
          <code>{"{{ territory.city }}"}</code>,{" "}
          <code>{"{{ territory.dueDate }}"}</code>, <code>{"{{ link }}"}</code>.
          Laisser vide pour revenir au message par défaut.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="access-link-message">
          Message d&apos;envoi du lien
        </Label>
        <Textarea
          id="access-link-message"
          rows={7}
          value={settings.accessLinkMessage}
          onChange={(e) =>
            setSettings({ ...settings, accessLinkMessage: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Variables : <code>{"{{ person.firstName }}"}</code>,{" "}
          <code>{"{{ person.name }}"}</code>, <code>{"{{ link }}"}</code>.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="territory-request-phone">
          Numéro WhatsApp prévenu des demandes de territoire
        </Label>
        <PhoneInput
          id="territory-request-phone"
          className="max-w-sm"
          defaultCountry="FR"
          placeholder="Personne n'est prévenu"
          value={settings.territoryRequestPhone ?? ""}
          onChange={(value) =>
            setSettings({ ...settings, territoryRequestPhone: value || null })
          }
        />
        <p className="text-xs text-muted-foreground">
          Un message est envoyé à ce numéro à chaque demande faite depuis un
          lien personnel. Les demandes se traitent dans le menu « Demandes ».
        </p>
      </div>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les réglages"}
        </Button>
      </div>
    </section>
  );
}
