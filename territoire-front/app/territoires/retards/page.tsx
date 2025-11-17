"use client";

import {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {Territory} from "@/models/territory";
import {format} from "date-fns";
import {fr} from "date-fns/locale";
import {useAuth} from "@/hooks/use-auth";
import {useAppDispatch, useAppSelector} from "@/store/store";
import {fetchTerritories} from "@/store/slices/territory-slice";
import {createReminder, fetchReminders} from "@/store/slices/reminder-slice";
import {PageHeader} from "@/components/late-territory/page-header";
import {LoadingState} from "@/components/late-territory/loading-state";
import {EmptyState} from "@/components/late-territory/empty-state";
import {createLateTerritoriesColumns, LateTerritoriesTable} from "@/components/late-territory/late-territories-table";
import {fetchPersons} from "@/store/slices/person-slice";
import {authFetch} from "@/utils/auth-fetch";
import {ReminderDialog} from "@/components/late-territory/reminder-dialog";
import {Person} from "@/models/person";
import {Button} from "@/components/ui/button";
import {ChevronDown} from "lucide-react";

export default function LateTerritoriesPage() {
	const router = useRouter();
	const {isAuthenticated} = useAuth();
	const dispatch = useAppDispatch();
	const territoriesData = useAppSelector(state => state.territories.territoriesGeojson);
	const territoriesLoading = useAppSelector(state => state.territories.loading);
	const reminders = useAppSelector(state => state.reminders.reminders);
	const remindersLoading = useAppSelector(state => state.reminders.loading);
	const persons = useAppSelector(state => state.persons.persons);

	// Filter late territories from the store using useMemo
	const territories = useMemo(() => {

		if (!territoriesData?.features) {
			return [];
		}

		// More flexible filtering to handle potential issues
		return territoriesData.features
			.filter(feature => {
				// Get the status, handling potential undefined/null values
				const status = feature.properties?.status || "";
				return status == "LATE";
			})
			.map(feature => ({
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
		return format(new Date(dateString), "dd MMMM yyyy", {locale: fr});
	};

	// Vérifie si un territoire a déjà un rappel pour la personne (nouveau format uniquement)
	// Hypothèses: 
	// - personKey est un UUID de personne (plus de résolution par nom complet)
	// - les rappels utilisent uniquement `territoryIds: string[]`
	const hasReminder = (territoryId: string, personKey: string) => {
		return reminders.some((reminder) =>
			reminder.personId === personKey && Array.isArray(reminder.territoryIds) && reminder.territoryIds.includes(territoryId)
		);
	};

 const columns = createLateTerritoriesColumns(formatDate, hasReminder);

	// Group late territories by person
	type Group = {
		personId: string;
		personName: string;
		phone?: string;
		territories: Territory[];
		oldest?: string;
	};

	function getPhone(persons: Person[], personId: string): string | undefined {
		return persons.find(pp => pp.id === personId)?.phoneNumber;
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
			// Dans le nouveau format, `assignedTo` est l'UUID de la personne
			const key = t.assignedTo;
			const existing = map.get(key);

			// Récupérer un nom lisible depuis la liste des personnes
			const person = persons.find(p => p.id === key);
			const displayName = person ? `${person.firstName} ${person.lastName}` : t.assignedTo;

			const next: Group = existing ?? {
				personId: key,
				personName: displayName,
				phone: getPhone(persons, key),
				territories: [],
				oldest: undefined,
			};

			next.territories.push(t);
			next.oldest = earlierIso(next.oldest, t.waitedFor);

			if (!next.phone) next.phone = getPhone(persons, key);
			if (!next.personName) next.personName = displayName;

			map.set(key, next);
		}

		return Array.from(map.values()).sort((a, b) =>
			a.personName.localeCompare(b.personName, 'fr', {sensitivity: 'base'})
		);
	}, [territories, persons]);

	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
	const toggleGroup = (pid: string) => setOpenGroups(prev => ({...prev, [pid]: !prev[pid]}));

	// Active group for dialog context
	const [activeGroupPersonId] = useState<string | null>(null);

	const group = (pid: string | null) => groups.find(g => g.personId === pid);

	const handleGroupManualReminders = async () => {
		if (!activeGroupPersonId) return;
		const g = group(activeGroupPersonId);
		if (!g) return;

		// Si tout est déjà rappelé, on bloque
		const allReminded = g.territories.every(t => hasReminder(t.id, g.personId));
		if (allReminded) {
			toast.info("Tous les territoires de cette personne ont déjà été rappelés");
			return;
		}

		// iterate only territories without reminder
		for (const t of g.territories) {
			if (!hasReminder(t.id, g.personId)) {
				const resultAction = await dispatch(createReminder({territoryId: t.id, personId: g.personId}));
				if (createReminder.rejected.match(resultAction)) {
					const msg = (resultAction.payload as string) || `Échec pour ${t.name}`;
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
		const allReminded = g.territories.every(t => hasReminder(t.id, g.personId));
		if (allReminded) {
			toast.info("Tous les territoires de cette personne ont déjà été rappelés");
			return;
		}
		let failures = 0;
		try {
			const url = `/api/territory-reminders/whatsapp?territoryIds=${g.territories.map(value => value.id)}&personId=${g.personId}`;
			const res = await authFetch(url, {
				method: "POST",
				headers: {"Content-Type": "text/plain;charset=UTF-8"},
				body: msg
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
       <LoadingState/>
   ) : territories.length === 0 ? (
       <EmptyState/>
   ) : (
       // Accordion per person
       <div className="space-y-3">
           {groups.map(g => (
               <div key={g.personId} className="border rounded-lg bg-white shadow-sm">
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
									aria-label={openGroups[g.personId] ? "Replier le groupe" : "Déplier le groupe"}
								>
									<ChevronDown
										className={`h-4 w-4 transition-transform ${
											openGroups[g.personId] ? "rotate-180" : ""
										}`}
									/>
								</Button>
								<div className="flex items-center gap-4">
									<div className="font-medium">{g.personName}</div>
									<div className="text-sm text-muted-foreground">{g.territories.length} territoire(s)</div>
									<div className="text-sm text-muted-foreground">Plus ancien
										retard: {g.oldest ? format(new Date(g.oldest), "dd MMM yyyy", {locale: fr}) : "N/A"}</div>
								</div>
        <div className="flex items-center gap-2">
                    <ReminderDialog
                        title="Rappeler tout"
                        description="Vous pouvez envoyer un message WhatsApp à toutes les attributions de cette personne ou simplement enregistrer les rappels."
                        canSendWhatsApp={!!g.phone}
                        triggerDisabled={g.territories.every(t => hasReminder(t.id, g.personId))}
                        onManualReminders={handleGroupManualReminders}
                        onSendWhatsApp={handleGroupWhatsApp}
                        data={{
                            person: {id: g.personId, name: g.personName, phone: g.phone ?? null},
                            territories: g.territories.map(t => ({
                                            id: t.id,
                                            name: t.name,
                                            assignedOn: t.assignedOn,
                                            waitedFor: t.waitedFor
                                        }))
                                    }}
                                />
                            </div>
							</div>
							{/* Panel */}
							{openGroups[g.personId] && (
								<div className="p-3 border-t">
									{/* Reuse table for this person's territories */}
									<LateTerritoriesTable territories={g.territories} columns={columns} tableId={`late-${g.personId}`}/>
								</div>
							)}
						</div>
					))}
				</div>
			)}

		</div>
	);
}
