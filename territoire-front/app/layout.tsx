import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";
import { ReduxProvider } from "@/store/provider";
import ServiceWorker from "@/components/service-worker";
import {Toaster} from "@/components/ui/sonner";

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
    icons: [
        "/images/logo.svg",
    ],
    manifest: "/manifest.json", // Ajout du fichier manifest
};

export default function RootLayout(
    {
        children,
    }: Readonly<{
        children: React.ReactNode;
    }>
) {
    return (
        <html lang="fr">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        <ReduxProvider>
            <SidebarProvider id={"sidebar"}>
                <AppSidebar/>
                <main className={"bg-gray-200 w-screen"}>
                    <SidebarTrigger className={"fixed top-0 left-0 z-50"}/>
                    {children}
                </main>
                <Toaster position="bottom-center" />
            </SidebarProvider>
            <ServiceWorker/>
        </ReduxProvider>
        </body>
        </html>
    );
}
