"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { useAppSelector } from "@/store/store";
import { canManageSettings } from "@/models/role";
import {
  AUDIT_ACTION_LABELS,
  AuditEvent,
  fetchAuditLog,
} from "@/lib/audit-api";
import { filterBySearch } from "@/lib/search";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

/** Liste des actions : quand, qui, quoi (et sur quel territoire ou quelle personne). */
function AuditList({
  events,
  showSubject,
}: {
  events: AuditEvent[];
  showSubject: boolean;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune action enregistrée.
      </p>
    );
  }
  return (
    <ol className="divide-y text-sm">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col gap-0.5 py-2">
          <p>
            <span className="font-medium">
              {AUDIT_ACTION_LABELS[event.action] ?? event.action}
            </span>
            {showSubject && (event.territoryName || event.personName) && (
              <span>
                {" "}
                ·{" "}
                {[event.territoryName, event.personName]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {!showSubject && event.personName && (
              <span> · {event.personName}</span>
            )}
          </p>
          {event.details && (
            <p className="text-muted-foreground">{event.details}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDateTime(event.occurredAt)} · {event.actor}
          </p>
        </li>
      ))}
    </ol>
  );
}

function useAuditLog(filter: { territoryId?: string; personId?: string }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const { territoryId, personId } = filter;

  useEffect(() => {
    let cancelled = false;
    fetchAuditLog({ territoryId, personId })
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setEvents([]);
        toast.error(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [territoryId, personId]);

  return events;
}

/**
 * Journal des actions d'un territoire ou d'une personne (fiche), pour ADMIN et SUPERVISEUR : qui a attribué, rendu,
 * prolongé, modifié...
 */
export function AuditLogCard({
  territoryId,
  personId,
}: {
  territoryId?: string;
  personId?: string;
}) {
  const role = useAppSelector((state) => state.auth.user?.role);
  if (!canManageSettings(role)) return null;
  return <AuditLogCardContent territoryId={territoryId} personId={personId} />;
}

function AuditLogCardContent({
  territoryId,
  personId,
}: {
  territoryId?: string;
  personId?: string;
}) {
  const events = useAuditLog({ territoryId, personId });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal des actions</CardTitle>
      </CardHeader>
      <CardContent>
        {events === null ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <AuditList events={events} showSubject={!territoryId} />
        )}
      </CardContent>
    </Card>
  );
}

/** Journal de toute l'application (Paramètres), avec une recherche. */
export function AuditLogSection() {
  const events = useAuditLog({});
  const [search, setSearch] = useState("");
  const shown = useMemo(
    () =>
      events
        ? filterBySearch(events, search, (event) => [
            AUDIT_ACTION_LABELS[event.action] ?? event.action,
            event.actor,
            event.territoryName ?? "",
            event.personName ?? "",
            event.details ?? "",
          ])
        : [],
    [events, search]
  );

  if (events === null) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }
  return (
    <div className="space-y-3">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Rechercher une action, un territoire, une personne, un auteur..."
        label="Rechercher dans le journal"
      />
      <div className="max-h-[32rem] overflow-y-auto">
        <AuditList events={shown} showSubject />
      </div>
      <p className="text-xs text-muted-foreground">
        Les 300 actions les plus récentes.
      </p>
    </div>
  );
}
