/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/citas/components/columns.tsx
*/
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type CitaParaTabla } from "@/app/admin/_lib/actions/citas/citas.schemas";
import { Badge } from "@/app/components/ui/badge";

type TableMeta = {
    startIndex?: number;
};

export const columns: ColumnDef<CitaParaTabla, unknown>[] = [
    {
        id: 'enumeracion',
        header: '#',
        cell: ({ row, table }) => {
            const startIndex = (table.options.meta as TableMeta)?.startIndex || 0;
            return <span className="text-zinc-400">{startIndex + row.index + 1}</span>;
        }
    },
    {
        accessorKey: "leadNombre",
        header: "Cliente",
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium">{row.original.leadNombre}</span>
                <span className="text-xs text-zinc-400">{row.original.leadTelefono}</span>
            </div>
        )
    },
    {
        accessorKey: "fecha",
        header: "Fecha y Hora",
        cell: ({ row }) => format(new Date(row.original.fecha), "EEEE, d MMM, yyyy '·' h:mm a", { locale: es })
    },
    {
        accessorKey: "pipelineNombre",
        header: "Etapa del Pipeline",
        cell: ({ row }) => {
            const pipeline = row.original.pipelineNombre;
            return pipeline ? <Badge variant="secondary">{pipeline}</Badge> : null;
        }
    },
]
