"use client"

import * as React from "react"
import {
    ColumnDef, flexRender, getCoreRowModel, useReactTable
} from "@tanstack/react-table"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table"
import { Input } from "@/app/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { type LeadParaTabla, type DatosFiltrosLead } from "@/app/admin/_lib/actions/lead/lead.schemas"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from 'use-debounce';
import { Button } from "@/app/components/ui/button"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    totalCount: number
    startIndex: number;
    filtros: DatosFiltrosLead;
    basePath: string;
}

export function LeadsDataTable<TData extends LeadParaTabla, TValue>({
    columns, data, totalCount, startIndex, filtros, basePath
}: DataTableProps<TData, TValue>) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const page = Number(searchParams?.get('page') ?? 1) || 1;
    const pageSize = 10;

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualFiltering: true,
        pageCount: Math.ceil(totalCount / pageSize),
        meta: {
            startIndex,
        }
    });

    // --- LÓGICA DE FILTRADO REFACTORIZADA ---
    const createQueryString = React.useCallback(
        (paramsToUpdate: Record<string, string>) => {
            const params = new URLSearchParams((searchParams?.toString() ?? ""));
            Object.entries(paramsToUpdate).forEach(([key, value]) => {
                if (value) {
                    params.set(key, value);
                } else {
                    params.delete(key);
                }
            });
            // Siempre resetear a la primera página al cambiar un filtro
            params.set('page', '1');
            return params.toString();
        },
        [searchParams]
    );

    const handleSearch = useDebouncedCallback((term: string) => {
        router.push(`${pathname}?${createQueryString({ q: term })}`);
    }, 300);

    const handleFilterChange = (key: string, value: string) => {
        const finalValue = value === 'all' ? '' : value;
        router.push(`${pathname}?${createQueryString({ [key]: finalValue })}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.set('page', String(newPage));
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-4 p-1">
                <Input
                    placeholder="Filtrar por nombre o email..."
                    defaultValue={searchParams?.get('q') || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="max-w-xs bg-zinc-800 border-zinc-700"
                />
                <Select
                    value={searchParams?.get('etapa') || 'all'}
                    onValueChange={(value) => handleFilterChange('etapa', value)}
                >
                    <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Filtrar por etapa..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectItem value="all">Todas las etapas</SelectItem>
                        {filtros.pipelines.map(etapa => (
                            <SelectItem key={etapa.id} value={etapa.nombre}>{etapa.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* --- FILTRO DE COLEGIO AÑADIDO --- */}
                <Select
                    value={searchParams?.get('colegio') || 'all'}
                    onValueChange={(value) => handleFilterChange('colegio', value)}
                >
                    <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Filtrar por colegio..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectItem value="all">Todos los colegios</SelectItem>
                        {filtros.colegios.map(colegio => (
                            <SelectItem key={colegio} value={colegio}>{colegio}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-grow rounded-md border border-zinc-700 overflow-auto mt-4">
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
                                    key={(row.original as LeadParaTabla).id}
                                    className="border-zinc-800 hover:bg-zinc-700/50 cursor-pointer"
                                    onClick={() => router.push(`${basePath}/${(row.original as LeadParaTabla).id}`)}
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
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-zinc-400">
                    Página {page} de {table.getPageCount()}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= table.getPageCount()}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    )
}