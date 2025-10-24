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
	const {user, isAuthenticated} = useAuth();
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

	// Check if a territory has a reminder for the assigned person
	const hasReminder = (territoryId: string, personId: string) => {
		return reminders.some(
			(reminder) =>
				reminder.territoryId === territoryId && reminder.personId === personId
		);
	};

	// Send a reminder
	const sendReminder = async (territoryId: string, personId: string) => {
		if (!user?.id) {
			toast.error("Vous devez être connecté pour envoyer un rappel");
			return;
		}

		try {
			// Use Redux action to create reminder
			const resultAction = await dispatch(
				createReminder({
					territoryId,
					personId,
				})
			);

			if (createReminder.rejected.match(resultAction)) {
				throw new Error(resultAction.payload as string || "Failed to send reminder");
			}

			toast.success("Rappel envoyé avec succès");
		} catch (error: unknown) {
			console.error("Error sending reminder:", error);
			const errorMessage = error instanceof Error ? error.message : "Impossible d'envoyer le rappel";
			toast.error(errorMessage);
		}
	};

	// Create columns using the helper function
	const onWhatsAppSuccess = () => {
		try {
			dispatch(fetchReminders());
		} catch (e) {
			// ignore
		}
	};
	const hasPhoneNumber = (personId: string): boolean => {
		const p = persons?.find(p => (p.firstName + " " + p.lastName) === personId.toUpperCase());
		if (!p) {
			return false;
		} // si non chargé/inconnu, ne pas bloquer l'action, la validation sera faite côté backend
		const b = !!p.phoneNumber && p.phoneNumber.trim().length > 0;
		return b;
	};
	const columns = createLateTerritoriesColumns(formatDate, hasReminder, sendReminder, onWhatsAppSuccess, hasPhoneNumber);

	// Toggle view: by territory (default) or by person (accordion)
	const [viewMode, setViewMode] = useState<"territory" | "person">("territory");

	// Group late territories by person
	type Group = {
		personId: string;
		personName: string;
		phone?: string;
		territories: Territory[];
		oldest?: string;
	};

	function getPersonIdFromFullName(fullName: string): string | null {
		return persons.find(p => p.firstName + " " + p.lastName === fullName.toUpperCase())?.id || null;
	}

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
			const key = getPersonIdFromFullName(t.assignedTo) ?? t.assignedTo;
			const existing = map.get(key);

			const next: Group = existing ?? {
				personId: key,
				personName: t.assignedTo,
				phone: getPhone(persons, key),
				territories: [],
				oldest: undefined,
			};

			next.territories.push(t);
			next.oldest = earlierIso(next.oldest, t.waitedFor);

			if (!next.phone) next.phone = getPhone(persons, key);
			if (!next.personName) next.personName = t.assignedTo;

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

	const handleGroupWhatsApp = async (personId:string, msg: string) => {
		if (!personId) return;
		const g = group(personId);
		if (!g) return;
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

			{/* View toggle */}
			<div className="mb-4 flex gap-2">
				<button onClick={() => setViewMode("territory")}
				        className={`px-3 py-1 rounded border ${viewMode === "territory" ? "bg-primary text-white" : "bg-white"}`}>Par
					territoire
				</button>
				<button onClick={() => setViewMode("person")}
				        className={`px-3 py-1 rounded border ${viewMode === "person" ? "bg-primary text-white" : "bg-white"}`}>Par
					personne
				</button>
			</div>

			{territoriesLoading || remindersLoading || !territoriesData ? (
				<LoadingState/>
			) : territories.length === 0 ? (
				<EmptyState/>
			) : viewMode === "territory" ? (
				<LateTerritoriesTable
					territories={territories}
					columns={columns}
					tableId="late-territories"
				/>
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
									onClick={() => { toggleGroup(g.personId); }}
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
										onManualReminders={handleGroupManualReminders}
										onSendWhatsApp={handleGroupWhatsApp}
										data={{
											person: {id: g.personId, name: g.personName, phone: g.phone},
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
