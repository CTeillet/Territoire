import React from "react";
import { cn } from "@/lib/utils";
import { toneText } from "@/components/shared/tones";
import { PersonAccessStatus } from "@/models/person-access";

const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "jamais";

/** Le dernier message d'attribution n'est pas parti (échec plus récent que le dernier envoi réussi). */
export const lastSendFailed = (
  access: Pick<PersonAccessStatus, "lastSentAt" | "lastSendFailedAt">
) =>
  !!access.lastSendFailedAt &&
  (!access.lastSentAt ||
    new Date(access.lastSendFailedAt) > new Date(access.lastSentAt));

/**
 * Dernier envoi du lien personnel, et l'échec du dernier message d'attribution s'il est plus récent (motif au survol) :
 * la personne n'a pas reçu son message, il faut le lui renvoyer.
 */
export function LastSend({
  access,
}: {
  access: Pick<
    PersonAccessStatus,
    "lastSentAt" | "lastSendFailedAt" | "lastSendError"
  >;
}) {
  return (
    <span className="flex flex-col">
      <span className={cn(!access.lastSentAt && "text-muted-foreground")}>
        {formatDateTime(access.lastSentAt)}
      </span>
      {lastSendFailed(access) && (
        <span
          className={cn("text-xs", toneText.danger)}
          title={access.lastSendError ?? undefined}
        >
          Échec le {formatDateTime(access.lastSendFailedAt)}
          {access.lastSendError ? ` : ${access.lastSendError}` : ""}
        </span>
      )}
    </span>
  );
}
