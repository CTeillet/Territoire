import type { Metadata, Viewport } from "next";
import React from "react";

// Page personnelle accessible par lien : jamais indexée, et le lien (qui sert de clé) n'est jamais transmis en Referer
export const metadata: Metadata = {
  title: "Mes territoires",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
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
