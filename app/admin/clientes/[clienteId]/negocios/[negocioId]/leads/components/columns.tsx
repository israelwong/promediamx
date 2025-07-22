// RUTA: app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/columns.tsx
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import type { LeadListItem } from "@/app/admin/_lib/actions/lead/lead.schemas";

// Helper para formatear fechas
const formatDate = (date: Date) => new Intl.DateTimeFormat('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit'
}).format(date);

export const columns: ColumnDef<LeadListItem>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Seleccionar todo"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Seleccionar fila"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => <div className="font-medium text-zinc-200">{row.getValue("nombre")}</div>,
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "telefono",
        header: "Teléfono",
    },
    // ✅ Nueva columna para el Colegio
    {
        id: "colegio",
        accessorFn: row => (row.jsonParams as { colegio?: string } | undefined)?.colegio || 'N/A',
        header: "Colegio",
        cell: ({ row }) => {
            const colegio = (row.original.jsonParams as { colegio?: string } | undefined)?.colegio;
            return colegio ? <Badge variant="outline">{colegio}</Badge> : <span className="text-zinc-500">N/A</span>;
        }
    },
    // ✅ Nueva columna para el Nivel Educativo
    {
        id: "nivel",
        accessorFn: row => (row.jsonParams as { nivel_educativo?: string } | undefined)?.nivel_educativo || 'N/A',
        header: "Nivel",
    },
    // ✅ Nueva columna para el Grado
    {
        id: "grado",
        accessorFn: row => (row.jsonParams as { grado?: string } | undefined)?.grado || 'N/A',
        header: "Grado",
    },
    {
        accessorKey: "etapaPipeline",
        header: "Etapa",
        cell: ({ row }) => {
            const etapa = row.original.etapaPipeline;
            return etapa ? <Badge>{etapa.nombre}</Badge> : <span className="text-zinc-500">Sin etapa</span>;
        }
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Fecha de Creación
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div>{formatDate(row.getValue("createdAt"))}</div>,
    },
    {
        id: "actions",
        cell: () => {
            // Aquí puedes añadir un DropdownMenu para acciones como "Editar", "Eliminar", etc.
            return (
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            )
        },
    },
];
