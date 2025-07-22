// app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/PipelineView.tsx
"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { KanbanBoardData } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import { Loader2 } from 'lucide-react';

const PipelineKanbanBoard = dynamic(
    () => import('./PipelineKanbanBoard'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        )
    }
);

interface PipelineViewProps {
    data: KanbanBoardData;
    onBoardChange: (newData: KanbanBoardData) => void;
    negocioId: string;
    clienteId: string;
}

export default function PipelineView({ data, onBoardChange, negocioId, clienteId }: PipelineViewProps) {
    return (
        <Card className="h-full border-zinc-700 bg-zinc-800/50 flex flex-col">
            <CardHeader>
                <CardTitle>Pipeline de Ventas</CardTitle>
                <CardDescription>Arrastra los leads para actualizar su etapa en el flujo.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <PipelineKanbanBoard
                    boardData={data}
                    onBoardChange={onBoardChange}
                    clienteId={clienteId}
                    negocioId={negocioId}
                />
            </CardContent>
        </Card>
    );
}