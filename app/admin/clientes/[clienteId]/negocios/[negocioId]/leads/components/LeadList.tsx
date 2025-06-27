// app/admin/.../leads/_components/LeadList.tsx
import React from 'react';
import { listarLeadsAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import LeadDataTable from './LeadDataTable';
import { columns } from './columns';

interface LeadListProps {
    negocioId: string;
}

export default async function LeadList({ negocioId }: LeadListProps) {
    // Obtenemos la primera página de datos en el servidor
    const initialResult = await listarLeadsAction({ negocioId, page: 1, pageSize: 20 });

    if (!initialResult.success || !initialResult.data) {
        return (
            <Card className="h-full border-red-700/50 bg-zinc-800">
                <CardHeader>
                    <CardTitle className="text-red-400">Error</CardTitle>
                    <CardDescription>No se pudo cargar la lista de leads.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertTriangle />
                        <p>{initialResult.error || "Ocurrió un error desconocido."}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-zinc-700 bg-zinc-800/50 flex flex-col">
            <CardHeader>
                <CardTitle>Todos los Leads</CardTitle>
                <CardDescription>Busca, filtra y gestiona tus contactos.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <LeadDataTable
                    columns={columns}
                    initialData={initialResult.data.leads}
                    totalCount={initialResult.data.totalCount}
                    negocioId={negocioId}
                />
            </CardContent>
        </Card>
    );
}