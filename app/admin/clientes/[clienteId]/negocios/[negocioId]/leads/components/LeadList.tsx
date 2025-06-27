import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import LeadDataTable from './LeadDataTable';
import { columns } from './columns';
import type { ListarLeadsResult } from '@/app/admin/_lib/actions/lead/lead.schemas';

// CORRECCIÓN: La interfaz de props ahora es la única fuente de datos.
interface LeadListProps {
    data: ListarLeadsResult;
    clienteId: string;
    negocioId: string;
}

// CORRECCIÓN: El componente ahora es síncrono y solo muestra los datos que recibe.
export default function LeadList({ data, negocioId }: LeadListProps) {
    return (
        <Card className="h-full border-zinc-700 bg-zinc-800/50 flex flex-col">
            <CardHeader>
                <CardTitle>Todos los Leads</CardTitle>
                <CardDescription>Busca, filtra y gestiona tus contactos.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <LeadDataTable
                    columns={columns}
                    initialData={data.leads}
                    totalCount={data.totalCount}
                    negocioId={negocioId}
                />
            </CardContent>
        </Card>
    );
}