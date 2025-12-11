/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/columns.tsx
*/
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type LeadParaTabla } from "@/app/admin/_lib/actions/lead/lead.schemas";
import { Badge } from "@/app/components/ui/badge";

type TableMeta = {
    startIndex?: number;
};

export const columns: ColumnDef<LeadParaTabla, TableMeta>[] = [
    // ✅ CORREGIDO: La lógica de enumeración ahora se apoya en el 'meta' de la tabla.
    {
        id: 'enumeracion',
        header: '#',
        cell: ({ row, table }) => {
            const startIndex = (table.options.meta as TableMeta)?.startIndex || 0;
            return <span className="text-zinc-400">{startIndex + row.index + 1}</span>;
        }
    },
    {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium text-zinc-100">{row.original.nombre}</span>
                <span className="text-xs text-zinc-400">{row.original.email}</span>
            </div>
        )
    },
    {
        accessorKey: "telefono",
        header: "Teléfono",
    },
    {
        accessorKey: "pipelineNombre",
        header: "Etapa",
        cell: ({ row }) => {
            const pipeline = row.original.pipelineNombre;
            return pipeline ? <Badge variant="outline">{pipeline}</Badge> : null;
        }
    },
    {
        accessorKey: "colegio",
        header: "Colegio",
    },
    {
        accessorKey: "createdAt",
        header: "Fecha de Registro",
        cell: ({ row }) => format(new Date(row.original.createdAt), "d MMM, yyyy", { locale: es })
    },
]

