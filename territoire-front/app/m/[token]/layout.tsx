import type { Metadata, Viewport } from "next";
import React from "react";

// Page personnelle accessible par lien : jamais indexée, et le lien (qui sert de clé) n'est jamais transmis en Referer.
// « strict-origin » n'envoie que l'origine (sans le chemin, donc sans le jeton) : les serveurs de tuiles
// OpenStreetMap exigent un Referer et bloquent les requêtes qui n'en ont pas (« no-referrer » → tuiles 403).
export const metadata: Metadata = {
  title: "Mes territoires",
  robots: { index: false, follow: false },
  referrer: "strict-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function PublicAccessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main className="min-h-screen bg-gray-100">{children}</main>;
}
