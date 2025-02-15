"use client";

import {Column} from "@tanstack/react-table"
import {ArrowDown, ArrowUp, ChevronsUpDown,} from "lucide-react"
import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from "react";

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
}

export function DataTableColumnHeader<TData, TValue>({
                                                         column,
                                                         title,
                                                         className,
                                                     }: DataTableColumnHeaderProps<TData, TValue>) {
    const filterValue = column.getFilterValue() ?? ""; // Récupérer la valeur du filtre directement depuis la colonne

    const handleFilterChange = (value: string) => {
        column.setFilterValue(value || undefined); // Si vide, supprimer le filtre
    };

    return (
        <div className={cn("flex items-center space-x-2 justify-center", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                    >
                        <span>{title}</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDown/>
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUp/>
                        ) : (
                            <ChevronsUpDown/>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-2">
                    <div className="flex flex-col space-y-2">
                        {/* Options de tri */}
                        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/70"/>
                            Ascendant
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70"/>
                            Descendant
                        </DropdownMenuItem>

                        {/* Séparateur */}
                        <DropdownMenuSeparator/>

                        {/* Champ de filtre */}
                        {column.id === "status" ? (
                            // Select pour filtrer les statuts
                            <select
                                value={filterValue as string}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="p-1 text-sm border rounded-md w-full"
                                onPointerDown={(e) => e.stopPropagation()} // Empêche la fermeture du menu
                            >
                                <option value="">Tous</option>
                                <option value="AVAILABLE">Disponible</option>
                                <option value="ASSIGNED">Attribué</option>
                                <option value="LATE">En retard</option>
                                <option value="PENDING">En attente</option>
                            </select>
                        ) : (
                            // Input texte pour les autres colonnes
                            <input
                                type="text"
                                value={filterValue as string}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                placeholder={`Filtrer ${title}`}
                                className="p-1 text-sm border rounded-md w-full"
                                onPointerDown={(e) => e.stopPropagation()} // Empêche la fermeture du menu
                            />
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
