"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Territory } from "@/models/territory";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { fetchTerritories } from "@/store/slices/territory-slice";
import { createReminder, fetchReminders } from "@/store/slices/reminder-slice";
import { PageHeader } from "@/components/late-territory/page-header";
import { LoadingState } from "@/components/late-territory/loading-state";
import { EmptyState } from "@/components/late-territory/empty-state";
import {
  createLateTerritoriesColumns,
  LateTerritoriesTable,
} from "@/components/late-territory/late-territories-table";
import { fetchPersons } from "@/store/slices/person-slice";
import { authFetch } from "@/utils/auth-fetch";
import { ReminderDialog } from "@/components/late-territory/reminder-dialog";
import { Person } from "@/models/person";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import ActionButton from "@/components/shared/action-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ChevronDown, Eye } from "lucide-react";

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

// Normalisation pour comparer les chaînes sans casse ni accents
function normalizeString(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Recherche une personne soit par son ID (UUID), soit par son nom complet
function findPerson(
  personList: Person[],
  key?: string | null
): Person | undefined {
  if (!key || !personList?.length) return undefined;

  const byId = personList.find((p) => p.id === key);
  if (byId) return byId;

  const normKey = normalizeString(key);

  return personList.find((p) => {
    const firstLast = normalizeString(`${p.firstName} ${p.lastName}`);
    const lastFirst = normalizeString(`${p.lastName} ${p.firstName}`);
    return firstLast === normKey || lastFirst === normKey;
  });
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
    const normKey = normalizeString(personKey);

    return reminders.some((reminder) => {
      const matchesPerson =
        reminder.personId === personId ||
        reminder.personId === personKey ||
        (reminder.personName &&
          normalizeString(reminder.personName) === normKey);

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

  const columns = createLateTerritoriesColumns(formatDate, hasReminder);

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

  const handleGroupManualReminders = async (personId: string) => {
    if (!personId) return;
    const g = group(personId);
    if (!g) return;

    // Si tout est déjà rappelé, on bloque
    const allReminded = g.territories.every((t) => hasReminder(t, g.personId));
    if (allReminded) {
      toast.info(
        "Tous les territoires de cette personne ont déjà été rappelés"
      );
      return;
    }

    // iterate only territories without reminder
    for (const t of g.territories) {
      if (!hasReminder(t, g.personId)) {
        const resultAction = await dispatch(
          createReminder({ territoryId: t.id, personId: g.personId })
        );
        if (createReminder.rejected.match(resultAction)) {
          const msg =
            (resultAction.payload as string) || `Échec pour ${t.name}`;
          toast.error(msg);
        }
      }
    }
    toast.success("Rappels enregistrés pour ce groupe");
    dispatch(fetchReminders());
  };

  const handleGroupWhatsApp = async (personId: string, msg: string) => {
    if (!personId) return;
    const g = group(personId);
    if (!g) return;
    // Si tout est déjà rappelé, on bloque
    const allReminded = g.territories.every((t) => hasReminder(t, g.personId));
    if (allReminded) {
      toast.info(
        "Tous les territoires de cette personne ont déjà été rappelés"
      );
      return;
    }
    let failures = 0;
    try {
      const url = `/api/territory-reminders/whatsapp?territoryIds=${g.territories.map((value) => value.id)}&personId=${g.personId}`;
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
    <div className="container mx-auto py-8 px-6">
      <PageHeader
        title="Territoires en retard"
        description="Gérez les territoires en retard et envoyez des rappels"
      />

      {territoriesLoading || remindersLoading || !territoriesData ? (
        <LoadingState />
      ) : territories.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
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
                className="w-[240px] bg-background"
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
                className="border rounded-lg bg-white shadow-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-3 cursor-pointer">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      toggleGroup(g.personId);
                    }}
                    aria-expanded={openGroups[g.personId]}
                    aria-controls={`group-${g.personId}`}
                    aria-label={
                      openGroups[g.personId]
                        ? "Replier le groupe"
                        : "Déplier le groupe"
                    }
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openGroups[g.personId] ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{g.personName}</div>
                    <div className="text-sm text-muted-foreground">
                      {g.territories.length} territoire(s)
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Plus ancien retard:{" "}
                      {g.oldest
                        ? format(new Date(g.oldest), "dd MMM yyyy", {
                            locale: fr,
                          })
                        : "N/A"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.hasProfile && (
                      <TooltipProvider>
                        <ActionButton
                          icon={Eye}
                          tooltip="Voir la fiche de la personne"
                          href={`/personnes/${g.personId}`}
                          className="bg-gray-500 hover:bg-gray-600 text-white"
                        />
                      </TooltipProvider>
                    )}
                    <ReminderDialog
                      title="Rappeler tout"
                      description="Vous pouvez envoyer un message WhatsApp à toutes les attributions de cette personne ou simplement enregistrer les rappels."
                      canSendWhatsApp={!!g.phone}
                      triggerDisabled={isFullyReminded(g)}
                      onManualReminders={() =>
                        handleGroupManualReminders(g.personId)
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
                        })),
                      }}
                    />
                  </div>
                </div>
                {/* Panel */}
                {openGroups[g.personId] && (
                  <div className="p-3 border-t">
                    {/* Reuse table for this person's territories */}
                    <LateTerritoriesTable
                      territories={g.territories}
                      columns={columns}
                      tableId={`late-${g.personId}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
