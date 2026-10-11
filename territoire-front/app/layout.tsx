import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import { ReduxProvider } from "@/store/provider";
import ServiceWorker from "@/components/service-worker";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Ajout du manifest.json dans les metadata pour la PWA
export const metadata: Metadata = {
  title: "TMS",
  description: "Outils de gestion des territoires",
  icons: ["/images/logo.svg"],
  manifest: "/manifest.json", // Ajout du fichier manifest
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReduxProvider>
          {children}
          <Toaster position="bottom-center" />
          <ServiceWorker />
        </ReduxProvider>
      </body>
    </html>
  );
}
