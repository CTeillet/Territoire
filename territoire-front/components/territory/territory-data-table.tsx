"use client"

import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table"

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table"
import React, {useEffect, useState} from "react";
import {DataTablePagination} from "@/components/ui/data-table-pagination";
import * as XLSX from 'xlsx';
import {Territory} from "@/models/territory";
import {Button} from "@/components/ui/button";
import {FileDown} from "lucide-react";
import {COLUMNS_ID_TRANSLATIONS} from "@/components/territory/territory-data-columns";
import {STATUS_TRANSLATIONS} from "@/models/territory-status";

interface DataTableProps {
    columns: ColumnDef<Territory, unknown>[]
    data: Territory[]
}

export function DataTable<TValue>(
    {
        columns,
        data,
    }: DataTableProps) {
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        id: false,
        name: true,
        city: true,
        status: true,
        actions: true,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
        if (typeof window !== "undefined") {
            const storedFilters = localStorage.getItem("tableFilters");
            return storedFilters ? JSON.parse(storedFilters) : [];
        }
        return [];
    });

    const [pagination, setPagination] = useState({
        pageIndex: 0, //initial page index
        pageSize: 10, //default page size
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("tableFilters", JSON.stringify(columnFilters));
        }
    }, [columnFilters]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        state: {
            columnVisibility,
            sorting,
            columnFilters,
            pagination,
        },
    });

    const exportToExcel = () => {
        const filteredData: Record<string, TValue>[] = table.getFilteredRowModel().rows.map(row => {
            const rowData: Record<string, TValue> = {};
            row.getVisibleCells().forEach(cell => {
                const columnHeader = cell.column.id as keyof typeof COLUMNS_ID_TRANSLATIONS;
                if (columnHeader !== "actions") {
                    // Remplacer la clé par sa traduction
                    const translatedHeader = COLUMNS_ID_TRANSLATIONS[columnHeader];
                    let cellValue: TValue = cell.getValue() as TValue;

                    // Traduire la valeur de la colonne "statut"
                    if (columnHeader === "status") {
                        cellValue = STATUS_TRANSLATIONS[cellValue as keyof typeof STATUS_TRANSLATIONS] as unknown as TValue;
                    }

                    rowData[translatedHeader] = cellValue;
                }
            });
            return rowData;
        });

        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Feuille 1');
        XLSX.writeFile(wb, 'table_data.xlsx');
    };

    return (
        <div className="w-full overflow-hidden rounded-lg shadow-lg border border-gray-200">
            <div className="flex justify-end mb-2">
                <Button onClick={exportToExcel}>
                    <FileDown/>
                </Button>
            </div>
            <div className="overflow-x-auto">
                <Table className="w-full border-collapse">
                    {/* En-tête de la table */}
                    <TableHeader className="bg-gray-100 border-b-2 border-gray-300">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="px-4 py-3 text-center text-gray-700 font-semibold uppercase tracking-wider"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    {/* Corps de la table */}
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="odd:bg-gray-50 hover:bg-gray-100 transition"
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className="px-4 py-3 text-center text-gray-700 border-b"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                                    Aucun résultat.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination en bas */}
            <DataTablePagination table={table}/>
        </div>
    );
}
