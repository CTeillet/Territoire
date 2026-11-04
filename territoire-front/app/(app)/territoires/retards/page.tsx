"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Territory } from "@/models/territory";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  extendTerritory,
  fetchTerritories,
} from "@/store/slices/territory-slice";
import { createReminder, fetchReminders } from "@/store/slices/reminder-slice";
import Link from "next/link";
import {
  EmptyState,
  LoadingState,
  PageContainer,
  PageHeader,
} from "@/components/shared/page-layout";
import { ReminderStatusBadge } from "@/components/late-territory/reminder-status-badge";
import { TerritoryNameLink } from "@/components/territory/territory-name-link";
import { fetchPersons } from "@/store/slices/person-slice";
import { authFetch } from "@/utils/auth-fetch";
import { ReminderDialog } from "@/components/late-territory/reminder-dialog";
import ExtendConfirmationDialog from "@/components/territory/extend-confirmation-dialog";
import { Person } from "@/models/person";
import { Assignment } from "@/models/assignment";
import { canManageAssignments } from "@/models/role";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
// Noms comparés sans casse, accents, espaces ni tirets (« Jean-Pierre » = « jean pierre »)
import { normalizeSearchText } from "@/lib/search";

// Territoires en retard d'une même personne
type Group = {
  personId: string;
  personName: string;
  firstName: string;
  // Faux quand le nom ne correspond à aucune personne : pas de fiche à ouvrir
  hasProfile: boolean;
  phone?: string;
  territories: Territory[];
  oldest?: string;
};

type SortKey =
  "name-asc" | "name-desc" | "oldest" | "newest" | "most" | "to-remind";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Nom (A → Z)" },
  { value: "name-desc", label: "Nom (Z → A)" },
  { value: "oldest", label: "Plus ancien retard d'abord" },
  { value: "newest", label: "Plus récent retard d'abord" },
  { value: "most", label: "Plus de territoires d'abord" },
  { value: "to-remind", label: "À rappeler d'abord" },
];

const SORT_STORAGE_KEY = "lateTerritoriesSort";

function readStoredSort(): SortKey {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (SORT_OPTIONS.some((o) => o.value === stored)) return stored as SortKey;
  } catch {
    // Stockage indisponible : tri par défaut
  }
  return "name-asc";
}

function compareNames(a: Group, b: Group): number {
  return a.personName.localeCompare(b.personName, "fr", {
    sensitivity: "base",
  });
}

// Les groupes sans date d'échéance restent en dernier, quel que soit le sens
function compareDates(a?: string, b?: string, direction: 1 | -1 = 1): number {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return direction * (new Date(a).getTime() - new Date(b).getTime());
}

// À critère égal, les groupes sont départagés par le nom
function sortGroups(
  groups: Group[],
  sortKey: SortKey,
  isFullyReminded: (g: Group) => boolean
): Group[] {
  const compare = (a: Group, b: Group): number => {
    switch (sortKey) {
      case "name-desc":
        return compareNames(b, a);
      case "oldest":
        return compareDates(a.oldest, b.oldest);
      case "newest":
        return compareDates(a.oldest, b.oldest, -1);
      case "most":
        return b.territories.length - a.territories.length;
      case "to-remind":
        return Number(isFullyReminded(a)) - Number(isFullyReminded(b));
      default:
        return 0;
    }
  };
  return [...groups].sort((a, b) => compare(a, b) || compareNames(a, b));
}

// Recherche une personne soit par son ID (UUID), soit par son nom complet
function findPerson(
  personList: Person[],
  key?: string | null
): Person | undefined {
  if (!key || !personList?.length) return undefined;

  const byId = personList.find((p) => p.id === key);
  if (byId) return byId;

  const normKey = normalizeSearchText(key);

  return personList.find((p) => {
    const firstLast = normalizeSearchText(`${p.firstName} ${p.lastName}`);
    const lastFirst = normalizeSearchText(`${p.lastName} ${p.firstName}`);
    return firstLast === normKey || lastFirst === normKey;
  });
}

function territoryCount(count: number): string {
  return count === 1 ? "1 territoire" : `${count} territoires`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Comme côté serveur, seuls comptent les rappels datés d'après le premier jour
// de l'attribution en cours : un rappel de ce jour-là concerne l'attribution
// précédente (close par une prolongation, par exemple).
function isDuringCurrentAssignment(
  reminderDate?: string | null,
  assignedOn?: string | null
): boolean {
  // Sans attribution en cours (« N/A » ou vide), aucun rappel ne compte
  if (!reminderDate || !assignedOn || !ISO_DATE.test(assignedOn)) {
    return false;
  }
  return reminderDate > assignedOn;
}

export default function LateTerritoriesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const territoriesData = useAppSelector(
    (state) => state.territories.territoriesGeojson
  );
  const territoriesLoading = useAppSelector(
    (state) => state.territories.loading
  );
  const reminders = useAppSelector((state) => state.reminders.reminders);
  const remindersLoading = useAppSelector((state) => state.reminders.loading);
  const persons = useAppSelector((state) => state.persons.persons);
  const user = useAppSelector((state) => state.auth.user);

  // Filter late territories from the store using useMemo
  const territories = useMemo(() => {
    if (!territoriesData?.features) {
      return [];
    }

    // More flexible filtering to handle potential issues
    return territoriesData.features
      .filter((feature) => {
        // Get the status, handling potential undefined/null values
        const status = feature.properties?.status || "";
        return status == "LATE";
      })
      .map((feature) => ({
        id: feature.properties.id,
        name: feature.properties.name,
        status: feature.properties.status,
        city: feature.properties.city,
        assignedTo: feature.properties.assignedTo,
        assignedOn: feature.properties.assignedOn,
        waitedFor: feature.properties.waitedFor,
      })) as Territory[];
  }, [territoriesData]);

  // Fetch territories and reminders from Redux store when component mounts
  useEffect(() => {
    try {
      // Fetch territories, reminders and persons using Redux
      dispatch(fetchTerritories());
      dispatch(fetchReminders());
      dispatch(fetchPersons());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Impossible de récupérer les données");
    }
  }, [dispatch]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  };

  // Vérifie si un territoire a déjà un rappel pour la personne pendant son attribution en cours
  const hasReminder = (territory: Territory, personKey: string) => {
    const person = findPerson(persons, personKey);
    const personId = person?.id || personKey;
    const normKey = normalizeSearchText(personKey);

    return reminders.some((reminder) => {
      const matchesPerson =
        reminder.personId === personId ||
        reminder.personId === personKey ||
        (reminder.personName &&
          normalizeSearchText(reminder.personName) === normKey);

      const matchesTerritory =
        (Array.isArray(reminder.territoryIds) &&
          reminder.territoryIds.includes(territory.id)) ||
        reminder.territoryId === territory.id;

      return (
        matchesPerson &&
        matchesTerritory &&
        isDuringCurrentAssignment(reminder.reminderDate, territory.assignedOn)
      );
    });
  };

  const canExtend = canManageAssignments(user?.role);

  // Territoires dont on choisit la durée de prolongation (une ligne ou tout un groupe)
  const [extendTarget, setExtendTarget] = useState<{
    title: string;
    territories: Territory[];
  } | null>(null);

  const askExtension = (territories: Territory[]) =>
    setExtendTarget({
      title:
        territories.length === 1
          ? `Prolongation du territoire ${territories[0].name}`
          : `Prolongation des territoires ${territories.map((t) => t.name).join(", ")}`,
      territories,
    });

  // Prolongé, un territoire redevient attribué : le store le retire de la liste des retards
  const handleExtend = async (dueDate?: string) => {
    const target = extendTarget;
    // Fenêtre fermée avant les appels : un second clic enverrait la prolongation deux fois
    setExtendTarget(null);
    if (!target) return;

    const extendedNames: string[] = [];
    let newDueDate: string | null = null;
    for (const t of target.territories) {
      try {
        const extended: Assignment = await dispatch(
          extendTerritory({ territoryId: t.id, dueDate })
        ).unwrap();
        extendedNames.push(t.name);
        newDueDate = extended.dueDate;
      } catch (error) {
        toast.error(`Territoire ${t.name} non prolongé : ${String(error)}`);
      }
    }
    if (extendedNames.length === 0) return;
    toast.success(
      extendedNames.length === 1
        ? `Territoire ${extendedNames[0]} prolongé jusqu'au ${formatDate(newDueDate)}`
        : `Territoires ${extendedNames.join(", ")} prolongés jusqu'au ${formatDate(newDueDate)}`
    );
  };

  // "DAVID" -> "David", "JEAN-PIERRE" -> "Jean-Pierre"
  function capitalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(
        /(^|[\s-])(\p{L})/gu,
        (_, sep: string, c: string) => sep + c.toUpperCase()
      );
  }

  function earlierIso(a?: string, b?: string): string | undefined {
    if (!a) return b;
    if (!b) return a;
    return new Date(a) <= new Date(b) ? a : b;
  }

  const groups = useMemo<Group[]>(() => {
    if (!territories?.length) return [];

    const map = new Map<string, Group>();

    for (const t of territories) {
      const person = findPerson(persons, t.assignedTo);
      const personId = person?.id || t.assignedTo;
      const displayName = person
        ? `${person.firstName} ${person.lastName}`
        : t.assignedTo;
      const firstName = person?.firstName
        ? capitalizeName(person.firstName)
        : displayName;
      const phone = person?.phoneNumber;

      const existing = map.get(personId);

      const next: Group = existing ?? {
        personId: personId,
        personName: displayName,
        firstName: firstName,
        hasProfile: !!person,
        phone: phone,
        territories: [],
        oldest: undefined,
      };

      next.territories.push(t);
      next.oldest = earlierIso(next.oldest, t.waitedFor);

      if (!next.phone && phone) next.phone = phone;
      if (!next.personName) next.personName = displayName;

      map.set(personId, next);
    }

    return Array.from(map.values());
  }, [territories, persons]);

  // Tri choisi, gardé d'une visite à l'autre
  const [sortKey, setSortKey] = useState<SortKey>(readStoredSort);
  const handleSortChange = (value: string) => {
    setSortKey(value as SortKey);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, value);
    } catch {
      // Stockage indisponible : le tri vaut pour cette visite seulement
    }
  };

  const isFullyReminded = (g: Group) =>
    g.territories.every((t) => hasReminder(t, g.personId));

  const sortedGroups = sortGroups(groups, sortKey, isFullyReminded);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (pid: string) =>
    setOpenGroups((prev) => ({ ...prev, [pid]: !prev[pid] }));

  const group = (pid: string | null) => groups.find((g) => g.personId === pid);

  // Territoires du groupe choisis dans la boîte de dialogue
  const selectedTerritories = (g: Group, territoryIds: string[]) =>
    g.territories.filter((t) => territoryIds.includes(t.id));

  const handleGroupManualReminders = async (
    personId: string,
    territoryIds: string[]
  ) => {
    if (!personId) return;
    const g = group(personId);
    if (!g) return;

    // Seuls les territoires sélectionnés pas encore rappelés reçoivent un rappel
    const toRemind = selectedTerritories(g, territoryIds).filter(
      (t) => !hasReminder(t, g.personId)
    );
    if (toRemind.length === 0) {
      toast.info("Les territoires sélectionnés ont déjà été rappelés");
      return;
    }

    for (const t of toRemind) {
      const resultAction = await dispatch(
        createReminder({ territoryId: t.id, personId: g.personId })
      );
      if (createReminder.rejected.match(resultAction)) {
        const msg = (resultAction.payload as string) || `Échec pour ${t.name}`;
        toast.error(msg);
      }
    }
    toast.success("Rappels enregistrés pour ce groupe");
    dispatch(fetchReminders());
  };

  const handleGroupWhatsApp = async (
    personId: string,
    msg: string,
    territoryIds: string[]
  ) => {
    if (!personId) return;
    const g = group(personId);
    if (!g) return;
    const selected = selectedTerritories(g, territoryIds);
    // Si tout ce qui est sélectionné est déjà rappelé, on bloque (comme le serveur)
    if (selected.every((t) => hasReminder(t, g.personId))) {
      toast.info("Les territoires sélectionnés ont déjà été rappelés");
      return;
    }
    let failures = 0;
    try {
      const url = `/api/territory-reminders/whatsapp?territoryIds=${selected.map((value) => value.id)}&personId=${g.personId}`;
      const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: msg,
      });
      if (!res.ok) {
        failures++;
      }
    } catch {
      failures++;
    }
    if (failures === 0) {
      toast.success("Messages WhatsApp envoyés et rappels enregistrés");
    } else {
      toast.error(`Certains envois ont échoué (${failures})`);
    }
    dispatch(fetchReminders());
  };

  return (
    <PageContainer>
      <PageHeader
        title="Territoires en retard"
        description="Gérez les territoires en retard et envoyez des rappels"
      />

      {territoriesLoading || remindersLoading || !territoriesData ? (
        <LoadingState message="Chargement des territoires en retard..." />
      ) : territories.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Aucun territoire en retard"
          description="Un territoire passe en retard quand sa date de retour est dépassée. Tous sont à jour."
        >
          <Button asChild variant="outline">
            <Link href="/territoires">Voir tous les territoires</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <label
              htmlFor="late-sort-select"
              className="text-sm font-medium whitespace-nowrap"
            >
              Trier par
            </label>
            <Select value={sortKey} onValueChange={handleSortChange}>
              <SelectTrigger
                id="late-sort-select"
                className="w-full max-w-[240px] bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Accordion per person */}
          <div className="space-y-3">
            {sortedGroups.map((g) => (
              <div
                key={g.personId}
                className="rounded-xl border bg-card shadow-sm"
              >
                {/* Tout l'en-tête déplie le groupe ; sur téléphone, les actions passent dessous en pleine largeur */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.personId)}
                    aria-expanded={!!openGroups[g.personId]}
                    aria-controls={`group-${g.personId}`}
                    className="flex min-w-48 flex-1 items-center gap-3 rounded-md p-1 text-left outline-none hover:bg-gray-50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        openGroups[g.personId] ? "rotate-180" : ""
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{g.personName}</span>
                      <span className="block text-sm text-muted-foreground">
                        {territoryCount(g.territories.length)} · plus ancien
                        retard le{" "}
                        {g.oldest
                          ? format(new Date(g.oldest), "dd MMM yyyy", {
                              locale: fr,
                            })
                          : "N/A"}
                      </span>
                      {isFullyReminded(g) && (
                        <span className="block text-sm text-green-700">
                          Tout est déjà rappelé
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex w-full gap-2 md:w-auto">
                    {canExtend && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1 md:h-9 md:flex-none"
                        onClick={() => askExtension(g.territories)}
                      >
                        <CalendarPlus />
                        Prolonger
                      </Button>
                    )}
                    <ReminderDialog
                      title="Rappeler"
                      triggerClassName="h-11 flex-1 md:h-9 md:flex-none"
                      description="Choisissez les territoires à rappeler, puis envoyez un message WhatsApp à cette personne ou enregistrez simplement les rappels."
                      canSendWhatsApp={!!g.phone}
                      triggerDisabled={isFullyReminded(g)}
                      onManualReminders={(territoryIds) =>
                        handleGroupManualReminders(g.personId, territoryIds)
                      }
                      onSendWhatsApp={handleGroupWhatsApp}
                      data={{
                        person: {
                          id: g.personId,
                          name: g.personName,
                          firstName: g.firstName,
                          phone: g.phone ?? null,
                        },
                        territories: g.territories.map((t) => ({
                          id: t.id,
                          name: t.name,
                          assignedOn: t.assignedOn,
                          waitedFor: t.waitedFor,
                          reminded: hasReminder(t, g.personId),
                        })),
                      }}
                    />
                  </div>
                </div>
                {/* Liste simple : la personne est déjà dans l'en-tête, du plus ancien retard au plus récent */}
                {openGroups[g.personId] && (
                  <div id={`group-${g.personId}`} className="border-t px-3">
                    <ul className="divide-y">
                      {[...g.territories]
                        .sort((a, b) => compareDates(a.waitedFor, b.waitedFor))
                        .map((t) => (
                          <li
                            key={t.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                          >
                            <TerritoryNameLink id={t.id} name={t.name} />
                            <span className="text-sm text-muted-foreground">
                              À rendre le {formatDate(t.waitedFor)}
                            </span>
                            <ReminderStatusBadge
                              hasReminder={hasReminder(t, t.assignedTo)}
                            />
                            {canExtend && (
                              <Button
                                type="button"
                                variant="outline"
                                className="ml-auto h-11 md:h-8"
                                aria-label={`Prolonger le territoire ${t.name}`}
                                onClick={() => askExtension([t])}
                              >
                                <CalendarPlus />
                                Prolonger
                              </Button>
                            )}
                          </li>
                        ))}
                    </ul>
                    {g.hasProfile && (
                      <Link
                        href={`/personnes/${g.personId}`}
                        className="flex items-center gap-1 border-t py-3 text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
                      >
                        Voir la fiche de la personne
                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <ExtendConfirmationDialog
            isOpen={extendTarget !== null}
            onClose={() => setExtendTarget(null)}
            onConfirm={handleExtend}
            title={extendTarget?.title}
          />
        </div>
      )}
    </PageContainer>
  );
}
