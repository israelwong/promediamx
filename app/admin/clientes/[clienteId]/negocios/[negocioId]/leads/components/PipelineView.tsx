// app/admin/.../leads/_components/PipelineView.tsx
import React from 'react';
import { obtenerDatosPipelineKanbanAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import PipelineKanbanBoard from './PipelineKanbanBoard';
// CORRECCIÓN: Importamos los componentes de Card y el icono de Alerta
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AlertTriangle } from 'lucide-react';

interface PipelineViewProps {
    negocioId: string;
}

export default async function PipelineView({ negocioId }: PipelineViewProps) {
    const result = await obtenerDatosPipelineKanbanAction({ negocioId });

    if (!result.success || !result.data) {
        return (
            <Card className="h-full border-red-700/50 bg-zinc-800">
                <CardHeader>
                    <CardTitle className="text-red-400">Error</CardTitle>
                    <CardDescription>No se pudo cargar el pipeline.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertTriangle />
                        <p>{result.error || "Ocurrió un error desconocido."}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // CORRECCIÓN: Envolvemos el Kanban en una Card para darle estructura y límites,
    // igual que hicimos con la pestaña de "Lista de Leads".
    return (
        <Card className="h-full border-zinc-700 bg-zinc-800/50 flex flex-col">
            <CardHeader>
                <CardTitle>Pipeline de Ventas</CardTitle>
                <CardDescription>Arrastra los leads para actualizar su etapa en el flujo.</CardDescription>
            </CardHeader>
            {/* Hacemos que CardContent sea flexible y permita el overflow interno */}
            <CardContent className="flex-grow overflow-hidden">
                <PipelineKanbanBoard initialBoardData={result.data} />
            </CardContent>
        </Card>
    );
}