"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Copy,
  EyeOff,
  Inbox,
  Link2,
  LucideIcon,
  MapPin,
  MessageSquareText,
  PhoneOff,
  Send,
  Settings,
  Unlink,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
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
import { cn } from "@/lib/utils";
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

const FILTER_ICONS: Record<Filter, LucideIcon> = {
  ALL: Users,
  WITH_TERRITORIES: MapPin,
  NEVER_OPENED: EyeOff,
  NO_LINK: Unlink,
  INACTIVE: Clock,
};

const FILTERS = Object.keys(FILTER_LABELS) as Filter[];

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

/** En-tête d'une section de l'onglet, posé sur le fond gris de la page. */
function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

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

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [
          f,
          accesses.filter((a) => matchesFilter(a, f)).length,
        ])
      ) as Record<Filter, number>,
    [accesses]
  );
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
    <div className="flex flex-col gap-10 pt-2">
      {canManageAccess(role) && <AccessSettingsForm />}

      <section className="flex flex-col gap-4">
        <SectionHeader
          icon={Link2}
          title="Liens personnels"
          description="Chaque personne consulte et rend ses territoires en cours depuis son lien."
          action={
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={sendable.length === 0 || bulkProgress !== null}
                >
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
                    sélection ayant un numéro, avec une pause de quelques
                    secondes entre chaque envoi.
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
          }
        />

        <div
          role="group"
          aria-label="Filtrer les personnes"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {FILTERS.map((f) => {
            const Icon = FILTER_ICONS[f];
            return (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-all outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  filter === f && "border-primary ring-1 ring-primary"
                )}
              >
                <span className="flex items-start justify-between gap-2 text-xs font-medium text-muted-foreground">
                  {FILTER_LABELS[f]}
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="text-2xl font-semibold tabular-nums">
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Personne</TableHead>
                <TableHead>État</TableHead>
                <TableHead>En cours</TableHead>
                <TableHead>Dernier envoi</TableHead>
                <TableHead>Dernière ouverture</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Personne dans cette sélection
                  </TableCell>
                </TableRow>
              )}
              {visible.map((a) => (
                <TableRow key={a.personId}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/personnes/${a.personId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {a.personName}
                    </Link>
                    {!a.hasPhone && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <PhoneOff className="h-3 w-3" />
                        sans numéro
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
                  <TableCell className="tabular-nums">
                    {a.activeTerritories}
                  </TableCell>
                  <TableCell
                    className={cn(!a.lastSentAt && "text-muted-foreground")}
                  >
                    {formatDateTime(a.lastSentAt)}
                  </TableCell>
                  <TableCell
                    className={cn(!a.lastUsedAt && "text-muted-foreground")}
                  >
                    {formatDateTime(a.lastUsedAt)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-2">
                      {a.link && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Copier le lien"
                          onClick={() => copy(a.link)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}

/** Carte d'un réglage : titre avec icône, description facultative, puis le champ. */
function SettingCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {children}
      </CardContent>
    </Card>
  );
}

function TemplateVariables({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      Variables :
      {names.map((name) => (
        <code
          key={name}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground"
        >
          {`{{ ${name} }}`}
        </code>
      ))}
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
      <SectionHeader
        icon={Settings}
        title="Réglages"
        description="Messages WhatsApp envoyés avec les liens personnels."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingCard
          icon={Zap}
          title="Envoi automatique"
          description="Prévenir la personne dès qu'un territoire lui est attribué."
        >
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
            <Checkbox
              id="assignment-notification"
              className="mt-0.5"
              checked={settings.assignmentNotificationEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  assignmentNotificationEnabled: Boolean(checked),
                })
              }
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="assignment-notification" className="leading-snug">
                Envoyer automatiquement un message WhatsApp avec le lien à
                chaque attribution
              </Label>
              <p className="text-xs text-muted-foreground">
                Seulement si la personne a un numéro.
              </p>
            </div>
          </div>
        </SettingCard>

        <SettingCard
          icon={Inbox}
          title="Demandes de territoire"
          description="Un message est envoyé à ce numéro à chaque demande faite depuis un lien personnel."
        >
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
            Les demandes se traitent dans le menu « Demandes ».
          </p>
        </SettingCard>

        <SettingCard
          icon={MessageSquareText}
          title={
            <Label htmlFor="assignment-message" className="text-base">
              Message envoyé à l&apos;attribution
            </Label>
          }
          description="Laisser vide pour revenir au message par défaut."
        >
          <Textarea
            id="assignment-message"
            rows={7}
            className="flex-1"
            value={settings.assignmentMessage}
            onChange={(e) =>
              setSettings({ ...settings, assignmentMessage: e.target.value })
            }
          />
          <TemplateVariables
            names={[
              "person.firstName",
              "person.name",
              "territory.name",
              "territory.city",
              "territory.dueDate",
              "link",
            ]}
          />
        </SettingCard>

        <SettingCard
          icon={MessageSquareText}
          title={
            <Label htmlFor="access-link-message" className="text-base">
              Message d&apos;envoi du lien
            </Label>
          }
          description="Envoyé depuis cet onglet ou la fiche d'une personne."
        >
          <Textarea
            id="access-link-message"
            rows={7}
            className="flex-1"
            value={settings.accessLinkMessage}
            onChange={(e) =>
              setSettings({ ...settings, accessLinkMessage: e.target.value })
            }
          />
          <TemplateVariables
            names={["person.firstName", "person.name", "link"]}
          />
        </SettingCard>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer les réglages"}
        </Button>
      </div>
    </section>
  );
}
