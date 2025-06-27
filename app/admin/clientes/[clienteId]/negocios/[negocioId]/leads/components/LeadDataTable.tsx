'use client';

import React, { useState, useEffect } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    //   SortingState,
    //   getSortedRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce';
import { listarLeadsAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import type { LeadListItem } from '@/app/admin/_lib/actions/lead/lead.schemas';

interface LeadDataTableProps {
    columns: ColumnDef<LeadListItem>[];
    initialData: LeadListItem[];
    totalCount: number;
    negocioId: string;
}

export default function LeadDataTable({
    columns,
    initialData,
    totalCount,
    negocioId,
}: LeadDataTableProps) {

    const [data, setData] = useState(initialData);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [isLoading, setIsLoading] = useState(false);

    // Mantenemos el total de leads en el estado para actualizarlo
    const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);

    const pageSize = 10;
    const pageCount = Math.ceil(currentTotalCount / pageSize);

    // Efecto para buscar y paginar
    useEffect(() => {
        // No ejecutar en la carga inicial si no hay búsqueda
        if (debouncedSearchTerm === "" && page === 1) {
            setData(initialData);
            setCurrentTotalCount(totalCount);
            return;
        }

        async function fetchData() {
            setIsLoading(true);
            const result = await listarLeadsAction({
                negocioId,
                page,
                pageSize,
                searchTerm: debouncedSearchTerm,
            });

            if (result.success && result.data) {
                setData(result.data.leads);
                setCurrentTotalCount(result.data.totalCount);
            } else {
                // Manejar error, quizás con un toast
                console.error(result.error);
            }
            setIsLoading(false);
        }

        fetchData();
    }, [debouncedSearchTerm, page, negocioId, initialData, totalCount]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        pageCount,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center">
                <Input
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="max-w-sm bg-zinc-900 border-zinc-700"
                />
            </div>
            <div className="rounded-md border border-zinc-700">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-zinc-700 hover:bg-zinc-800/50">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-zinc-300">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-400">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-zinc-800 hover:bg-zinc-800"
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
                                <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-400">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1 || isLoading}
                >
                    Anterior
                </Button>
                <span className="text-sm text-zinc-400">Página {page} de {pageCount > 0 ? pageCount : 1}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pageCount || isLoading}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    );
}