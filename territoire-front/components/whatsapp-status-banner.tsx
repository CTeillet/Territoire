"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleWarning } from "lucide-react";
import { Notice } from "@/components/shared/notice";
import { useAppSelector } from "@/store/store";
import { canSendAccess } from "@/lib/person-access-api";
import { fetchWhatsAppStatus } from "@/lib/whatsapp-api";
import { WhatsAppStatus } from "@/models/whatsapp-test";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

/**
 * Bandeau d'alerte quand les messages WhatsApp ne partent plus (session WAHA déconnectée...), pour ceux qui attribuent
 * et envoient les liens : sans lui, les messages d'attribution échouaient sans que personne ne le sache. Revérifié à
 * chaque changement de page.
 */
export function WhatsAppStatusBanner() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const pathname = usePathname();
  const allowed = canSendAccess(role);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchWhatsAppStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      // État inconnu (hors ligne, API indisponible) : pas d'alerte
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [allowed, pathname]);

  if (!allowed || !status?.failing || !status.lastFailureAt) return null;

  return (
    <Notice
      tone="danger"
      role="alert"
      className="mx-4 mt-4 flex items-start gap-3"
    >
      <MessageCircleWarning
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0"
      />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">
          Les messages WhatsApp ne partent plus depuis le{" "}
          {formatDateTime(status.lastFailureAt)}
        </p>
        <p className="break-words">
          Messages d&apos;attribution, liens personnels et rappels ne sont pas
          envoyés. Motif : {status.lastFailure || "inconnu"}.
        </p>
        <p>
          Reconnectez la session WAHA, puis vérifiez avec{" "}
          <Link
            href="/parametres"
            className="font-medium underline underline-offset-4"
          >
            Paramètres
          </Link>{" "}
          &gt; Données &gt; Outils avancés &gt; Test WhatsApp.
        </p>
      </div>
    </Notice>
  );
}
