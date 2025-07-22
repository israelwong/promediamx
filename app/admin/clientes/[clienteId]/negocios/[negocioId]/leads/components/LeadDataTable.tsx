'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce';
import { listarLeadsAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import type { LeadListItem } from '@/app/admin/_lib/actions/lead/lead.schemas';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LeadDataTableProps {
    columns: ColumnDef<LeadListItem>[];
    initialData: LeadListItem[];
    totalCount: number;
    negocioId: string;
    clienteId: string;
}

// ✅ SOLUCIÓN: Se define un tipo específico para la estructura de jsonParams.
type LeadJsonParams = {
    colegio?: string | null;
    grado?: string | null;
    nivel_educativo?: string | null;
    source?: string | null;
};

export default function LeadDataTable({
    columns,
    initialData,
    totalCount,
    negocioId,
    clienteId
}: LeadDataTableProps) {

    const router = useRouter();

    const [data, setData] = useState(initialData);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [colegioFilter, setColegioFilter] = useState<string>("");

    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);

    const pageSize = 10;
    const pageCount = Math.ceil(currentTotalCount / pageSize);

    const colegioOptions = useMemo(() => {
        // ✅ SOLUCIÓN: Se utiliza el tipo específico en lugar de 'any'.
        const colegios = new Set(initialData.map(lead => (lead.jsonParams as LeadJsonParams)?.colegio).filter(Boolean));
        return Array.from(colegios) as string[];
    }, [initialData]);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const result = await listarLeadsAction({
                negocioId,
                page,
                pageSize,
                searchTerm: debouncedSearchTerm,
                colegio: colegioFilter === 'todos' ? undefined : colegioFilter,
            });

            if (result.success && result.data) {
                setData(result.data.leads);
                setCurrentTotalCount(result.data.totalCount);
            } else {
                console.error(result.error);
            }
            setIsLoading(false);
        }

        fetchData();
    }, [debouncedSearchTerm, page, colegioFilter, negocioId]);

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
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="max-w-sm bg-zinc-900 border-zinc-700"
                />
                <Select value={colegioFilter} onValueChange={setColegioFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-zinc-900 border-zinc-700">
                        <SelectValue placeholder="Filtrar por colegio..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los colegios</SelectItem>
                        {colegioOptions.map(colegio => (
                            <SelectItem key={colegio} value={colegio}>{colegio}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="sm:ml-auto">
                    <Button
                        onClick={() => router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/nuevo`)}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Lead
                    </Button>
                </div>
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
                                    className="border-zinc-800 hover:bg-zinc-800 cursor-pointer"
                                    onClick={() => router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/${row.original.id}`)} // Lógica para ir al detalle
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
