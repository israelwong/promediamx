// .../citas/components/data-table.tsx
"use client"

import * as React from "react"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import { type CitaParaTabla } from "@/app/admin/_lib/actions/citas/citas.schemas"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/app/components/ui/button"

// --- MEJORA: Se actualiza la interfaz de props ---
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    totalCount: number
    startIndex: number;
    basePath: string; // Se añade basePath para la navegación dinámica
}

export function CitasDataTable<TData extends CitaParaTabla, TValue>({
    columns, data, totalCount, startIndex, basePath
}: DataTableProps<TData, TValue>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = Number(searchParams?.get('page')) || 1;
    const pageSize = 15;

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(totalCount / pageSize),
        meta: { startIndex }
    });

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams((searchParams?.toString() ?? ""));
        params.set('page', String(newPage));
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-grow rounded-md border border-zinc-700 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-zinc-800">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-zinc-700 hover:bg-zinc-800/80">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-zinc-200">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={(row.original as CitaParaTabla).id}
                                    className="border-zinc-800 hover:bg-zinc-700/50 cursor-pointer"
                                    onClick={() => {
                                        const leadId = (row.original as CitaParaTabla).leadId;
                                        // --- MEJORA: Se usa basePath para la navegación ---
                                        router.push(`${basePath}/${leadId}`);
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No se encontraron citas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-zinc-400">Página {page} de {table.getPageCount()}</span>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= table.getPageCount()}>Siguiente</Button>
            </div>
        </div>
    )
}