"use client";

import React, {useEffect, useState} from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {authFetch} from "@/utils/auth-fetch";
import {toast} from "sonner";
import {renderTemplate} from "@/lib/nunjucks";

export interface ReminderDialogProps {
	onOpenChange?: (v: boolean) => void; // optional
	title?: string;
	description?: string;
	canSendWhatsApp: boolean;
	onManualReminders: () => Promise<void> | void;
	onSendWhatsApp: (personId:string, message: string) => Promise<void> | void;
	data?: unknown; // contexte pour le rendu du message (ex: group/person/territories)
}

export function ReminderDialog(
	{
		title,
		description = "Vous pouvez envoyer un message WhatsApp ou simplement enregistrer les rappels.",
		canSendWhatsApp,
		onManualReminders,
		onSendWhatsApp,
		data
	}: ReminderDialogProps) {

	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);

	// Load saved message when opened and WhatsApp possible
	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (!canSendWhatsApp) {
				setMessage("");
				return;
			}
			setLoading(true);
			try {
				const res = await authFetch("/api/settings/late-reminder-message");
				if (res.ok) {
					const text = await res.text();
					if (!cancelled) {
						let result: string;
						if (text === null || text === undefined) {
							result = "";
						} else {
							result = renderTemplate(text, data);
						}
						setMessage(result);
					}
				}
			} catch (_) {
				// ignore but show a gentle toast so user knows
				toast.error("Impossible de charger le message type");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [canSendWhatsApp, data]);

	const handleWhatsApp = async () => {
		if (!message.trim()) {
			toast.error("Le message ne peut pas être vide");
			return;
		}
		setSending(true);
		try {
			// @ts-ignore
			await onSendWhatsApp(data.person.id, message);
		} finally {
			setSending(false);
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className="px-3 py-2 font-medium inline-flex items-center gap-2" >
					{title}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{description && (
					<p className="text-sm text-muted-foreground mb-2">{description}</p>
				)}
				{!canSendWhatsApp && (
					<div className="text-sm text-muted-foreground mb-2">
						Aucun numéro de téléphone n&#39;est associé à cette personne. L&#39;envoi WhatsApp est indisponible.
					</div>
				)}
				<Textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					rows={8}
					placeholder={canSendWhatsApp ? "Message WhatsApp (option WhatsApp)" : "Aucun numéro de téléphone — envoi WhatsApp indisponible"}
					disabled={loading || sending || !canSendWhatsApp}
					className="min-h-32"
				/>
				<DialogFooter className="gap-2">
					<DialogClose asChild>
						<Button variant="secondary" disabled={sending}>Annuler</Button>
					</DialogClose>
					<Button variant="outline" onClick={onManualReminders} disabled={sending}>Marquer rappels envoyés</Button>
					<Button onClick={handleWhatsApp}
					        disabled={sending || loading || !canSendWhatsApp || message.trim().length === 0}>Envoyer par
						WhatsApp</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
