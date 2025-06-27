"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { LeadListItem } from "@/app/admin/_lib/actions/lead/lead.schemas"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"
// import Link from "next/link"

// La definición de las columnas para nuestra tabla de leads
export const columns: ColumnDef<LeadListItem>[] = [
    {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => {
            const lead = row.original;
            // Podríamos hacer que el nombre sea un link a la conversación
            // Nota: Necesitaríamos el ID de la conversación aquí.
            return (
                <div className="font-medium text-zinc-100">{lead.nombre}</div>
            )
        }
    },
    {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || <span className="text-zinc-500">N/A</span>
    },
    {
        accessorKey: "telefono",
        header: "Teléfono",
        cell: ({ row }) => row.original.telefono || <span className="text-zinc-500">N/A</span>
    },
    {
        accessorKey: "etapaPipeline.nombre",
        header: "Etapa del Pipeline",
        cell: ({ row }) => {
            const etapa = row.original.etapaPipeline;
            return etapa ? (
                <span className="bg-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-full">{etapa.nombre}</span>
            ) : <span className="text-zinc-500">-</span>;
        }
    },
    {
        accessorKey: "createdAt",
        header: "Fecha de Creación",
        cell: ({ row }) => {
            const date = new Date(row.getValue("createdAt"))
            return <div>{date.toLocaleDateString()}</div>
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const lead = row.original
            return (
                <div className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(lead.id)}>
                                Copiar ID del Lead
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled>Ver conversación</DropdownMenuItem>
                            <DropdownMenuItem disabled>Editar Lead</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]